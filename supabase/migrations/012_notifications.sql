create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  title       text not null,
  body        text,
  type        text default 'info',
  link        text,
  read        boolean default false,
  created_at  timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "notif_select" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "notif_insert" on public.notifications for insert to authenticated with check (true);
create policy "notif_update" on public.notifications for update to authenticated using (auth.uid() = user_id);
create policy "notif_delete" on public.notifications for delete to authenticated using (auth.uid() = user_id);
