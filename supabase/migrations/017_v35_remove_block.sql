-- Staff deactivation
alter table public.profiles add column if not exists is_active boolean default true;
alter table public.profiles add column if not exists deactivated_at timestamptz;
alter table public.profiles add column if not exists deactivated_reason text;

-- Parent messaging block
alter table public.profiles add column if not exists messaging_blocked boolean default false;
alter table public.profiles add column if not exists messaging_blocked_reason text;

-- Student withdrawal tracking
alter table public.students add column if not exists withdrawal_date date;
alter table public.students add column if not exists withdrawal_reason text;
alter table public.students add column if not exists previous_status text;
