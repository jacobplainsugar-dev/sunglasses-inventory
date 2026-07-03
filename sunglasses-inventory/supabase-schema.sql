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
