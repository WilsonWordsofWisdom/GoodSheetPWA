-- 0003_user_tables.sql

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  age smallint,
  weight_kg numeric(5,1),
  height_cm numeric(5,1),
  goals text[] not null default '{}',
  store_thumbnails boolean not null default false,
  hydration_target_ml int,
  fiber_target_g int,
  smart_hydration_enabled boolean not null default true,
  share_data boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.logs (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('meal','exercise','stool','water')),
  logged_at timestamptz not null,
  note text,
  share_data boolean not null default false,
  food_id uuid references public.foods(id),
  food_name text,
  cuisine text,
  tags text[] default '{}',
  calories_min int,
  calories_max int,
  fiber_g numeric(5,1),
  activity_id text references public.activities(id),
  activity_name text,
  intensity text check (intensity in ('low','medium','high')),
  duration_min int,
  calories_burned int,
  met numeric(4,1),
  bristol smallint check (bristol between 1 and 7),
  urgency text check (urgency in ('low','medium','high')),
  ease text check (ease in ('easy','normal','strained')),
  color text check (color in ('brown','light-brown','yellow-brown','pale-yellow','green','black','red','unknown')),
  drink_id text references public.drinks(id),
  ml int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists logs_user_logged on public.logs (user_id, logged_at desc);
create index if not exists logs_tags_gin on public.logs using gin (tags);
create index if not exists logs_food_id on public.logs (food_id);
create index if not exists logs_drink_id on public.logs (drink_id);
create index if not exists logs_activity_id on public.logs (activity_id);
