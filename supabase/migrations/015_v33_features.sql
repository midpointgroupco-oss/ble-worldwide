-- ── CONDUCT / BEHAVIOR TRACKING ──────────────────────────────────────────
create table if not exists public.conduct_records (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid references public.students(id) on delete cascade,
  recorded_by uuid references public.profiles(id),
  type        text not null,   -- 'positive' | 'negative' | 'neutral'
  category    text not null,   -- 'academic' | 'behavior' | 'attendance' | 'other'
  title       text not null,
  description text,
  points      integer default 0,
  date        date not null default current_date,
  created_at  timestamptz default now()
);
alter table public.conduct_records enable row level security;
create policy "conduct_all" on public.conduct_records for all to authenticated using (true);

-- ── ACADEMIC CALENDAR EVENTS ─────────────────────────────────────────────
create table if not exists public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  event_type  text default 'event',  -- 'holiday' | 'exam' | 'event' | 'deadline' | 'meeting'
  start_date  date not null,
  end_date    date,
  start_time  time,
  end_time    time,
  all_day     boolean default true,
  color       text default '#3b9eff',
  audience    text default 'all',    -- 'all' | 'students' | 'staff' | 'parents'
  created_by  uuid references public.profiles(id),
  created_at  timestamptz default now()
);
alter table public.calendar_events enable row level security;
create policy "cal_select" on public.calendar_events for select to authenticated using (true);
create policy "cal_all"    on public.calendar_events for all    to authenticated using (true);

-- ── ZOOM / MEETING LINKS ──────────────────────────────────────────────────
create table if not exists public.class_meetings (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid references public.courses(id) on delete cascade,
  teacher_id  uuid references public.profiles(id),
  title       text not null,
  meeting_url text,
  platform    text default 'zoom',  -- 'zoom' | 'google_meet' | 'teams' | 'other'
  scheduled_at timestamptz,
  duration_min integer default 60,
  recurring   boolean default false,
  recurrence  text,               -- 'weekly' | 'daily'
  day_of_week integer,            -- 0=Sun..6=Sat
  notes       text,
  created_at  timestamptz default now()
);
alter table public.class_meetings enable row level security;
create policy "meetings_select" on public.class_meetings for select to authenticated using (true);
create policy "meetings_all"    on public.class_meetings for all    to authenticated using (true);

-- ── EMAIL LOG (track sent emails) ────────────────────────────────────────
create table if not exists public.email_log (
  id         uuid primary key default gen_random_uuid(),
  to_email   text not null,
  subject    text,
  template   text,
  status     text default 'sent',
  sent_at    timestamptz default now()
);
alter table public.email_log enable row level security;
create policy "email_log_all" on public.email_log for all to authenticated using (true);

-- ── COLUMNS ON EXISTING TABLES ────────────────────────────────────────────
alter table public.students add column if not exists conduct_points integer default 0;
