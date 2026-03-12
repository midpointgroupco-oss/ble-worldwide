-- Parent-teacher conferences
create table if not exists public.conferences (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid references public.profiles(id) on delete cascade,
  parent_id    uuid references public.profiles(id) on delete cascade,
  student_id   uuid references public.students(id) on delete cascade,
  slot_date    date not null,
  slot_time    time not null,
  duration_min integer default 30,
  status       text default 'requested', -- requested | confirmed | cancelled | completed
  notes        text,
  meeting_url  text,
  created_at   timestamptz default now()
);
alter table public.conferences enable row level security;
create policy "conf_all" on public.conferences for all to authenticated using (true);

-- Conference availability slots (teacher sets these)
create table if not exists public.conference_slots (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid references public.profiles(id) on delete cascade,
  slot_date   date not null,
  slot_time   time not null,
  duration_min integer default 30,
  is_booked   boolean default false,
  created_at  timestamptz default now()
);
alter table public.conference_slots enable row level security;
create policy "slots_all" on public.conference_slots for all to authenticated using (true);

-- Email blast log
alter table public.announcements add column if not exists email_sent boolean default false;
alter table public.announcements add column if not exists email_sent_at timestamptz;
alter table public.announcements add column if not exists email_count integer default 0;
