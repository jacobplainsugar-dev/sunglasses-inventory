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
