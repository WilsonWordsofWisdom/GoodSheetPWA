-- 0001_reference_tables.sql

create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cuisine text not null,
  kcal_min int not null,
  kcal_max int not null,
  fiber_g numeric(4,1) not null,
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, cuisine)
);
create index if not exists foods_tags_gin on public.foods using gin (tags);

create table if not exists public.drinks (
  id text primary key,
  name text not null,
  category text not null check (category in ('water','juice','smoothie','hot-drink','dairy','alcohol','sports')),
  fiber_g_per_100ml numeric(4,2) not null,
  hydration_factor numeric(3,2) not null,
  gut_tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activities (
  id text primary key,
  name text not null,
  met_low numeric(3,1) not null,
  met_medium numeric(3,1) not null,
  met_high numeric(3,1) not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id smallint generated always as identity primary key,
  label text not null unique,
  sort_order smallint not null,
  is_active boolean not null default true
);
