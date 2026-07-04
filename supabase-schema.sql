create table if not exists public.sunglasses (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  color text,
  size text,
  audience text,

  total_quantity integer not null default 0,
  total_sold integer not null default 0,

  image_url text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.sales_history (
  id uuid primary key default gen_random_uuid(),

  sunglasses_id uuid references public.sunglasses(id) on delete cascade,
  sunglasses_name text not null,
  quantity integer not null default 1,

  sold_at timestamp with time zone not null default now()
);

alter table public.sunglasses enable row level security;
alter table public.sales_history enable row level security;

drop policy if exists "Logged in users can read sunglasses" on public.sunglasses;
drop policy if exists "Logged in users can add sunglasses" on public.sunglasses;
drop policy if exists "Logged in users can update sunglasses" on public.sunglasses;
drop policy if exists "Logged in users can delete sunglasses" on public.sunglasses;
drop policy if exists "Logged in users can read sales history" on public.sales_history;
drop policy if exists "Logged in users can add sales history" on public.sales_history;

create policy "Logged in users can read sunglasses"
on public.sunglasses
for select
to authenticated
using (true);

create policy "Logged in users can add sunglasses"
on public.sunglasses
for insert
to authenticated
with check (true);

create policy "Logged in users can update sunglasses"
on public.sunglasses
for update
to authenticated
using (true)
with check (true);

create policy "Logged in users can delete sunglasses"
on public.sunglasses
for delete
to authenticated
using (true);

create policy "Logged in users can read sales history"
on public.sales_history
for select
to authenticated
using (true);

create policy "Logged in users can add sales history"
on public.sales_history
for insert
to authenticated
with check (true);
