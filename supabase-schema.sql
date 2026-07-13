create table if not exists public.sunglasses (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  style_number text,
  color text,
  size text,
  audience text,

  total_quantity integer not null default 0,
  total_sold integer not null default 0,

  price_type text not null default 'Normal'
    check (price_type in ('Normal', 'Polarized', 'Vintage')),
  price_each numeric(10, 2) not null default 20,

  image_url text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.sales_history (
  id uuid primary key default gen_random_uuid(),

  sunglasses_id uuid references public.sunglasses(id) on delete set null,
  sunglasses_name text not null,
  quantity integer not null default 1,
  unit_price numeric(10, 2) not null default 20,

  sold_at timestamp with time zone not null default now()
);

create table if not exists public.bad_sales_days (
  day date primary key,
  created_at timestamp with time zone not null default now()
);

alter table public.sunglasses
add column if not exists price_type text not null default 'Normal';

alter table public.sunglasses
add column if not exists style_number text;

alter table public.sunglasses
add column if not exists price_each numeric(10, 2) not null default 20;

alter table public.sales_history
add column if not exists unit_price numeric(10, 2) not null default 20;

update public.sunglasses
set price_each = 35
where price_type = 'Vintage';

update public.sunglasses
set price_each = 25
where price_type = 'Polarized';

update public.sunglasses
set price_each = 20
where price_type = 'Normal' or price_type is null;

alter table public.sunglasses
drop constraint if exists sunglasses_price_type_check;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sunglasses_price_type_check'
  ) then
    alter table public.sunglasses
    add constraint sunglasses_price_type_check
    check (price_type in ('Normal', 'Polarized', 'Vintage'));
  end if;
end $$;

alter table public.sales_history
drop constraint if exists sales_history_sunglasses_id_fkey;

alter table public.sales_history
add constraint sales_history_sunglasses_id_fkey
foreign key (sunglasses_id)
references public.sunglasses(id)
on delete set null;

alter table public.sunglasses enable row level security;
alter table public.sales_history enable row level security;
alter table public.bad_sales_days enable row level security;

drop policy if exists "Logged in users can read sunglasses" on public.sunglasses;
drop policy if exists "Logged in users can add sunglasses" on public.sunglasses;
drop policy if exists "Logged in users can update sunglasses" on public.sunglasses;
drop policy if exists "Logged in users can delete sunglasses" on public.sunglasses;
drop policy if exists "Logged in users can read sales history" on public.sales_history;
drop policy if exists "Logged in users can add sales history" on public.sales_history;
drop policy if exists "Logged in users can read bad sales days" on public.bad_sales_days;
drop policy if exists "Logged in users can add bad sales days" on public.bad_sales_days;
drop policy if exists "Logged in users can delete bad sales days" on public.bad_sales_days;

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

create policy "Logged in users can read bad sales days"
on public.bad_sales_days
for select
to authenticated
using (true);

create policy "Logged in users can add bad sales days"
on public.bad_sales_days
for insert
to authenticated
with check (true);

create policy "Logged in users can delete bad sales days"
on public.bad_sales_days
for delete
to authenticated
using (true);
