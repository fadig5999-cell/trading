# Marble Showroom Pro - ניהול מלאי שיש

Professional Hebrew RTL inventory management web app for a marble / stone slabs showroom.

## Features

- Supabase Auth login for authorized users.
- Admin and Viewer roles.
- Dashboard with marble type count, total stock, low stock, sold today, sold this month, and stock value.
- Inventory table and card views.
- Add, edit, delete, and upload images for marble / stone types.
- Stock actions: הוסף מלאי, הפחת מלאי, ערוך כמות, מכור לוח.
- Safe selling flow that never allows quantity below zero.
- Automatic statuses: במלאי, מלאי נמוך, אזל מהמלאי.
- Sales history with customer details and notes.
- Search and filters by name, color, thickness, location, low stock, sold out, and category.
- Luxury gallery with images and quick sell action.
- Reports for most sold stones, stock value, low stock, monthly sales, and sold slabs count.
- Mobile-friendly layout for showroom use.

## Database setup

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the Supabase SQL editor.
3. In Supabase Auth, create users for the owner/admin and viewers.
4. Promote the owner user to admin:

```sql
update public.profiles
set role = 'admin'
where id = '<OWNER_USER_UUID>';
```

Viewer users should keep `role = 'viewer'`.

## App setup

The app does not store private secrets in source code. On first load:

1. Click `הגדר חיבור Supabase`.
2. Enter the Supabase project URL.
3. Enter the Supabase `anon public` key.
4. Log in with an Auth user.

The Supabase URL and anon key are stored only in the browser so the same static build can be deployed safely.

## Run locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Publish

This is a static app and can be deployed to Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any static hosting provider. The live site still requires the Supabase URL and anon key on first use.

## Security notes

- All persistent business data is stored in Supabase Postgres.
- Row Level Security is enabled for inventory, sales, and profiles.
- Admin-only operations are enforced by Supabase policies and the `sell_slab` database function.
- The client UI also hides edit/delete/sell controls from Viewer users for a clean experience.
