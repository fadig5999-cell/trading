-- Marble Showroom Pro - Supabase setup
-- Run this file in the Supabase SQL editor after creating a new project.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('admin', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marble_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  hebrew_name text not null,
  category text,
  color text not null,
  thickness text not null,
  slab_size text,
  quantity integer not null default 0 check (quantity >= 0),
  location text,
  image_url text,
  cost_price numeric(12, 2),
  selling_price numeric(12, 2),
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  marble_id uuid references public.marble_items(id) on delete set null,
  marble_name text not null,
  quantity_sold integer not null check (quantity_sold > 0),
  sold_at timestamptz not null default now(),
  price numeric(12, 2) not null default 0,
  customer_name text,
  customer_phone text,
  notes text,
  created_by uuid references auth.users(id)
);

create index if not exists marble_items_name_idx on public.marble_items using gin (
  to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(hebrew_name, ''))
);
create index if not exists marble_items_quantity_idx on public.marble_items(quantity);
create index if not exists sales_sold_at_idx on public.sales(sold_at desc);
create index if not exists sales_marble_id_idx on public.sales(marble_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists marble_items_touch_updated_at on public.marble_items;
create trigger marble_items_touch_updated_at
before update on public.marble_items
for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'viewer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.sell_slab(
  p_marble_id uuid,
  p_quantity integer default 1,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_notes text default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.marble_items%rowtype;
  v_sale public.sales%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only admins can sell slabs';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be greater than zero';
  end if;

  update public.marble_items
  set quantity = quantity - p_quantity
  where id = p_marble_id
    and quantity >= p_quantity
  returning * into v_item;

  if not found then
    raise exception 'Not enough stock or marble item not found';
  end if;

  insert into public.sales (
    marble_id,
    marble_name,
    quantity_sold,
    price,
    customer_name,
    customer_phone,
    notes,
    created_by
  )
  values (
    v_item.id,
    coalesce(v_item.hebrew_name, v_item.name),
    p_quantity,
    coalesce(v_item.selling_price, 0) * p_quantity,
    nullif(p_customer_name, ''),
    nullif(p_customer_phone, ''),
    nullif(p_notes, ''),
    auth.uid()
  )
  returning * into v_sale;

  return v_sale;
end;
$$;

alter table public.profiles enable row level security;
alter table public.marble_items enable row level security;
alter table public.sales enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read inventory" on public.marble_items;
create policy "Authenticated users can read inventory"
on public.marble_items for select
to authenticated
using (true);

drop policy if exists "Admins can insert inventory" on public.marble_items;
create policy "Admins can insert inventory"
on public.marble_items for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update inventory" on public.marble_items;
create policy "Admins can update inventory"
on public.marble_items for update
to authenticated
using (public.is_admin())
with check (public.is_admin() and quantity >= 0);

drop policy if exists "Admins can delete inventory" on public.marble_items;
create policy "Admins can delete inventory"
on public.marble_items for delete
to authenticated
using (public.is_admin());

drop policy if exists "Authenticated users can read sales" on public.sales;
create policy "Authenticated users can read sales"
on public.sales for select
to authenticated
using (true);

drop policy if exists "Admins can insert sales" on public.sales;
create policy "Admins can insert sales"
on public.sales for insert
to authenticated
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('marble-images', 'marble-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Authenticated users can view marble images" on storage.objects;
create policy "Authenticated users can view marble images"
on storage.objects for select
to authenticated
using (bucket_id = 'marble-images');

drop policy if exists "Admins can upload marble images" on storage.objects;
create policy "Admins can upload marble images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'marble-images' and public.is_admin());

drop policy if exists "Admins can update marble images" on storage.objects;
create policy "Admins can update marble images"
on storage.objects for update
to authenticated
using (bucket_id = 'marble-images' and public.is_admin())
with check (bucket_id = 'marble-images' and public.is_admin());

drop policy if exists "Admins can delete marble images" on storage.objects;
create policy "Admins can delete marble images"
on storage.objects for delete
to authenticated
using (bucket_id = 'marble-images' and public.is_admin());

-- After creating the owner user in Supabase Auth, promote them:
-- update public.profiles set role = 'admin' where id = '<OWNER_USER_UUID>';
