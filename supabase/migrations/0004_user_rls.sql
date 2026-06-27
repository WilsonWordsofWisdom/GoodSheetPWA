-- 0004_user_rls.sql

alter table public.profiles enable row level security;
alter table public.logs     enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

create policy "logs_select_own" on public.logs for select using (auth.uid() = user_id);
create policy "logs_insert_own" on public.logs for insert with check (auth.uid() = user_id);
create policy "logs_update_own" on public.logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "logs_delete_own" on public.logs for delete using (auth.uid() = user_id);
