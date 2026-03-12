-- Add super_admin role support
-- The profiles.role column is text so no enum change needed

-- Add platform_settings table for real settings saves
create table if not exists public.platform_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  value       text,
  updated_by  uuid references public.profiles(id),
  updated_at  timestamptz default now()
);
alter table public.platform_settings enable row level security;
create policy "settings_select" on public.platform_settings for select to authenticated using (true);
create policy "settings_all"    on public.platform_settings for all    to authenticated using (true);

-- Seed default settings
insert into public.platform_settings (key, value) values
  ('school_name',      'BLE Worldwide'),
  ('school_email',     'admin@bleworldwide.edu'),
  ('school_phone',     ''),
  ('school_address',   ''),
  ('academic_year',    '2025-2026'),
  ('default_timezone', 'UTC'),
  ('logo_url',         ''),
  ('primary_color',    '#00c9b1'),
  ('allow_enrollment', 'true'),
  ('maintenance_mode', 'false')
on conflict (key) do nothing;

-- Add audit_log table
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id),
  actor_name  text,
  action      text not null,
  target_type text,
  target_id   text,
  details     text,
  created_at  timestamptz default now()
);
alter table public.audit_log enable row level security;
create policy "audit_select" on public.audit_log for select to authenticated using (true);
create policy "audit_insert" on public.audit_log for insert to authenticated with check (true);
