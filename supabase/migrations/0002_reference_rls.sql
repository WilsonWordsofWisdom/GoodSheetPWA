-- 0002_reference_rls.sql

alter table public.foods       enable row level security;
alter table public.drinks      enable row level security;
alter table public.activities  enable row level security;
alter table public.goals       enable row level security;

-- Public read (anon + authenticated). Writes are implicitly denied for these
-- roles because no insert/update/delete policy exists; service_role bypasses RLS.
create policy "foods_read"      on public.foods      for select using (true);
create policy "drinks_read"     on public.drinks     for select using (true);
create policy "activities_read" on public.activities for select using (true);
create policy "goals_read"      on public.goals      for select using (true);
