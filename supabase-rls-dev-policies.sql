-- DEV ONLY: Firebase auth + Supabase anon key client access.
-- These policies allow anon role access because this app is not using Supabase Auth tokens.

alter table if exists public.products enable row level security;
alter table if exists public.app_users enable row level security;
alter table if exists public.cart_items enable row level security;
alter table if exists public.orders enable row level security;

-- Products: allow reading in frontend.
drop policy if exists "products_select_anon" on public.products;
create policy "products_select_anon"
on public.products
for select
to anon
using (true);

-- App users: allow Firebase user upsert from frontend.
drop policy if exists "app_users_insert_anon" on public.app_users;
create policy "app_users_insert_anon"
on public.app_users
for insert
to anon
with check (true);

drop policy if exists "app_users_update_anon" on public.app_users;
create policy "app_users_update_anon"
on public.app_users
for update
to anon
using (true)
with check (true);

-- Cart items: allow frontend cart operations.
drop policy if exists "cart_items_select_anon" on public.cart_items;
create policy "cart_items_select_anon"
on public.cart_items
for select
to anon
using (true);

drop policy if exists "cart_items_insert_anon" on public.cart_items;
create policy "cart_items_insert_anon"
on public.cart_items
for insert
to anon
with check (true);

drop policy if exists "cart_items_update_anon" on public.cart_items;
create policy "cart_items_update_anon"
on public.cart_items
for update
to anon
using (true)
with check (true);

drop policy if exists "cart_items_delete_anon" on public.cart_items;
create policy "cart_items_delete_anon"
on public.cart_items
for delete
to anon
using (true);

-- Orders: allow checkout and order history reads.
drop policy if exists "orders_select_anon" on public.orders;
create policy "orders_select_anon"
on public.orders
for select
to anon
using (true);

drop policy if exists "orders_insert_anon" on public.orders;
create policy "orders_insert_anon"
on public.orders
for insert
to anon
with check (true);
