-- ============================================================================
-- Marble Inventory Management — Initial Schema
-- ============================================================================
-- Run this file in the Supabase SQL editor (or via `supabase db push`) on a
-- fresh project. It creates all tables, indexes, triggers, row level
-- security policies, and the storage bucket used by the application.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles: one row per auth user, holds the app role (admin / viewer)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Application user profile & role (admin/viewer).';

-- Automatically create a profile row whenever a new auth user signs up.
-- The very first user created in the project is promoted to admin so the
-- showroom owner always has a working admin account out of the box.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case when (select count(*) from public.profiles) = 0 then 'admin' else 'viewer' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- marble_types: catalog of marble / stone slab types
-- ----------------------------------------------------------------------------
create table if not exists public.marble_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_he text not null,
  category text not null default 'שיש',
  color text not null default '',
  thickness text not null default '',
  size text not null default '',
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  location text not null default '',
  image_url text,
  cost_price numeric(10, 2),
  selling_price numeric(10, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marble_types_name_idx on public.marble_types using gin (to_tsvector('simple', name || ' ' || name_he));
create index if not exists marble_types_category_idx on public.marble_types (category);
create index if not exists marble_types_color_idx on public.marble_types (color);
create index if not exists marble_types_location_idx on public.marble_types (location);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists marble_types_set_updated_at on public.marble_types;
create trigger marble_types_set_updated_at
  before update on public.marble_types
  for each row execute procedure public.set_updated_at();

-- ----------------------------------------------------------------------------
-- sales: every slab sale transaction
-- ----------------------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  marble_type_id uuid not null references public.marble_types (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  sale_price numeric(10, 2),
  customer_name text,
  customer_phone text,
  notes text,
  sold_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

create index if not exists sales_marble_type_idx on public.sales (marble_type_id);
create index if not exists sales_sold_at_idx on public.sales (sold_at desc);

-- ----------------------------------------------------------------------------
-- stock_movements: full audit trail of every quantity change
-- ----------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  marble_type_id uuid not null references public.marble_types (id) on delete cascade,
  change integer not null,
  movement_type text not null check (movement_type in ('add', 'remove', 'sell', 'manual', 'create')),
  reason text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

create index if not exists stock_movements_marble_type_idx on public.stock_movements (marble_type_id);

-- ----------------------------------------------------------------------------
-- RPC: sell_slabs — atomically decrements stock, guards against negative
-- quantity, and records both the sale and the stock movement in one
-- transaction. This is the function the "מכור לוח" button calls.
-- ----------------------------------------------------------------------------
create or replace function public.sell_slabs(
  p_marble_type_id uuid,
  p_quantity integer default 1,
  p_sale_price numeric default null,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_notes text default null
)
returns public.marble_types
language plpgsql
security definer set search_path = public
as $$
declare
  v_current integer;
  v_role text;
  v_result public.marble_types;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'admin' then
    raise exception 'ONLY_ADMIN_CAN_SELL';
  end if;

  if p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  select quantity into v_current from public.marble_types where id = p_marble_type_id for update;

  if v_current is null then
    raise exception 'MARBLE_TYPE_NOT_FOUND';
  end if;

  if v_current < p_quantity then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  update public.marble_types
    set quantity = quantity - p_quantity
    where id = p_marble_type_id
    returning * into v_result;

  insert into public.sales (marble_type_id, quantity, sale_price, customer_name, customer_phone, notes, created_by)
    values (p_marble_type_id, p_quantity, p_sale_price, p_customer_name, p_customer_phone, p_notes, auth.uid());

  insert into public.stock_movements (marble_type_id, change, movement_type, reason, created_by)
    values (p_marble_type_id, -p_quantity, 'sell', 'מכירת לקוח', auth.uid());

  return v_result;
end;
$$;

-- ----------------------------------------------------------------------------
-- RPC: adjust_stock — add / remove / manually set stock, never below zero.
-- ----------------------------------------------------------------------------
create or replace function public.adjust_stock(
  p_marble_type_id uuid,
  p_delta integer,
  p_movement_type text,
  p_reason text default null
)
returns public.marble_types
language plpgsql
security definer set search_path = public
as $$
declare
  v_current integer;
  v_role text;
  v_new integer;
  v_result public.marble_types;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role is distinct from 'admin' then
    raise exception 'ONLY_ADMIN_CAN_EDIT';
  end if;

  if p_movement_type not in ('add', 'remove', 'manual') then
    raise exception 'INVALID_MOVEMENT_TYPE';
  end if;

  select quantity into v_current from public.marble_types where id = p_marble_type_id for update;
  if v_current is null then
    raise exception 'MARBLE_TYPE_NOT_FOUND';
  end if;

  v_new := v_current + p_delta;
  if v_new < 0 then
    v_new := 0;
  end if;

  update public.marble_types
    set quantity = v_new
    where id = p_marble_type_id
    returning * into v_result;

  insert into public.stock_movements (marble_type_id, change, movement_type, reason, created_by)
    values (p_marble_type_id, v_new - v_current, p_movement_type, p_reason, auth.uid());

  return v_result;
end;
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.marble_types enable row level security;
alter table public.sales enable row level security;
alter table public.stock_movements enable row level security;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- marble_types: any authenticated user can read; only admins can write
drop policy if exists "marble_types_select_authenticated" on public.marble_types;
create policy "marble_types_select_authenticated" on public.marble_types
  for select using (auth.role() = 'authenticated');

drop policy if exists "marble_types_write_admin" on public.marble_types;
create policy "marble_types_write_admin" on public.marble_types
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- sales: readable by any authenticated user, writable only by admins
-- (writes normally go through the sell_slabs() RPC above)
drop policy if exists "sales_select_authenticated" on public.sales;
create policy "sales_select_authenticated" on public.sales
  for select using (auth.role() = 'authenticated');

drop policy if exists "sales_write_admin" on public.sales;
create policy "sales_write_admin" on public.sales
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- stock_movements: readable by any authenticated user, writable only by admins
drop policy if exists "stock_movements_select_authenticated" on public.stock_movements;
create policy "stock_movements_select_authenticated" on public.stock_movements
  for select using (auth.role() = 'authenticated');

drop policy if exists "stock_movements_write_admin" on public.stock_movements;
create policy "stock_movements_write_admin" on public.stock_movements
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- Storage bucket for marble images
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('marble-images', 'marble-images', true)
on conflict (id) do nothing;

drop policy if exists "marble_images_public_read" on storage.objects;
create policy "marble_images_public_read" on storage.objects
  for select using (bucket_id = 'marble-images');

drop policy if exists "marble_images_admin_write" on storage.objects;
create policy "marble_images_admin_write" on storage.objects
  for insert with check (
    bucket_id = 'marble-images'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "marble_images_admin_update" on storage.objects;
create policy "marble_images_admin_update" on storage.objects
  for update using (
    bucket_id = 'marble-images'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "marble_images_admin_delete" on storage.objects;
create policy "marble_images_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'marble-images'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
