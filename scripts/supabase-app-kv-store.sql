-- LowMeet: storage simples em JSON para users/events no Supabase.
-- Rode este script em Supabase > SQL Editor.

create table if not exists public.app_kv_store (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.app_kv_store enable row level security;

drop policy if exists "app_kv_store_select_all" on public.app_kv_store;
create policy "app_kv_store_select_all"
  on public.app_kv_store
  for select
  to anon, authenticated
  using (true);

drop policy if exists "app_kv_store_insert_all" on public.app_kv_store;
create policy "app_kv_store_insert_all"
  on public.app_kv_store
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "app_kv_store_update_all" on public.app_kv_store;
create policy "app_kv_store_update_all"
  on public.app_kv_store
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "app_kv_store_delete_all" on public.app_kv_store;
create policy "app_kv_store_delete_all"
  on public.app_kv_store
  for delete
  to anon, authenticated
  using (true);
