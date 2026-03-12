-- ============================================================
-- BLE WORLDWIDE — SCHEMA (SIMPLIFIED RLS)
-- ============================================================

-- ── PROFILES ──
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'parent',
  avatar_url  text,
  phone       text,
  timezone    text default 'UTC',
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_update" on public.profiles for update to authenticated using (id = auth.uid());

-- ── GRADE LEVELS ──
create table if not exists public.grade_levels (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  color      text default '#00c9b1',
  sort_order integer,
  created_at timestamptz default now()
);
alter table public.grade_levels enable row level security;
create policy "grade_levels_select" on public.grade_levels for select to authenticated using (true);
create policy "grade_levels_all"    on public.grade_levels for all    to authenticated using (true);

insert into public.grade_levels (name, color, sort_order) values
  ('4th','#00c9b1',1),('5th','#3b9eff',2),('6th','#f72585',3),
  ('7th','#ffc845',4),('8th','#ff6058',5),('9th','#7b5ea7',6),
  ('10th','#06d6a0',7),('11th','#ff8c42',8),('12th','#00b4d8',9)
on conflict do nothing;

-- ── STUDENTS ──
create table if not exists public.students (
  id             uuid primary key default gen_random_uuid(),
  student_id     text unique,
  full_name      text not null,
  email          text,
  grade_level    text not null,
  country        text,
  guardian_name  text,
  guardian_email text,
  parent_id      uuid references public.profiles(id),
  status         text default 'active',
  gpa            text,
  attendance_rate integer default 94,
  course_count    integer default 0,
  notes          text,
  created_at     timestamptz default now()
);
alter table public.students enable row level security;
create policy "students_select" on public.students for select to authenticated using (true);
create policy "students_insert" on public.students for insert to authenticated with check (true);
create policy "students_update" on public.students for update to authenticated using (true);
create policy "students_delete" on public.students for delete to authenticated using (true);

-- ── COURSES ──
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  subject     text,
  grade_level text,
  teacher_id  uuid references public.profiles(id),
  is_active   boolean default true,
  description text,
  created_at  timestamptz default now()
);
alter table public.courses enable row level security;
create policy "courses_select" on public.courses for select to authenticated using (true);
create policy "courses_all"    on public.courses for all    to authenticated using (true);

-- ── ENROLLMENTS ──
create table if not exists public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid references public.students(id) on delete cascade,
  course_id   uuid references public.courses(id)  on delete cascade,
  enrolled_at timestamptz default now(),
  status      text default 'active',
  unique(student_id, course_id)
);
alter table public.enrollments enable row level security;
create policy "enrollments_select" on public.enrollments for select to authenticated using (true);
create policy "enrollments_all"    on public.enrollments for all    to authenticated using (true);

-- ── ASSIGNMENTS ──
create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  course_id   uuid references public.courses(id) on delete cascade,
  teacher_id  uuid references public.profiles(id),
  due_date    date,
  max_points  integer default 100,
  created_at  timestamptz default now()
);
alter table public.assignments enable row level security;
create policy "assignments_select" on public.assignments for select to authenticated using (true);
create policy "assignments_all"    on public.assignments for all    to authenticated using (true);

-- ── SUBMISSIONS ──
create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.assignments(id) on delete cascade,
  student_id    uuid references public.students(id)    on delete cascade,
  grade         text,
  points        integer,
  feedback      text,
  submitted_at  timestamptz,
  graded_at     timestamptz,
  status        text default 'pending',
  unique(assignment_id, student_id)
);
alter table public.submissions enable row level security;
create policy "submissions_select" on public.submissions for select to authenticated using (true);
create policy "submissions_all"    on public.submissions for all    to authenticated using (true);

-- ── ATTENDANCE ──
create table if not exists public.attendance (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  course_id  uuid references public.courses(id),
  date       date not null,
  status     text default 'present',
  notes      text,
  unique(student_id, course_id, date)
);
alter table public.attendance enable row level security;
create policy "attendance_select" on public.attendance for select to authenticated using (true);
create policy "attendance_all"    on public.attendance for all    to authenticated using (true);

-- ── MESSAGES ──
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  subject      text not null,
  body         text not null,
  sender_id    uuid references public.profiles(id),
  recipient_id uuid references public.profiles(id),
  read         boolean default false,
  created_at   timestamptz default now()
);
alter table public.messages enable row level security;
create policy "messages_select" on public.messages for select to authenticated using (true);
create policy "messages_all"    on public.messages for all    to authenticated using (true);

-- ── SCHEDULE EVENTS ──
create table if not exists public.schedule_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  event_date  date not null,
  start_time  time,
  end_time    time,
  course_id   uuid references public.courses(id),
  created_by  uuid references public.profiles(id),
  color       text default 'teal',
  created_at  timestamptz default now()
);
alter table public.schedule_events enable row level security;
create policy "schedule_select" on public.schedule_events for select to authenticated using (true);
create policy "schedule_all"    on public.schedule_events for all    to authenticated using (true);

-- ── ANNOUNCEMENTS ──
create table if not exists public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  audience     text default 'all',
  grade_level  text,
  created_by   uuid references public.profiles(id),
  published_at timestamptz default now(),
  created_at   timestamptz default now()
);
alter table public.announcements enable row level security;
create policy "announcements_select" on public.announcements for select to authenticated using (true);
create policy "announcements_all"    on public.announcements for all    to authenticated using (true);

-- ── BILLING ──
create table if not exists public.billing (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.profiles(id),
  description text not null,
  amount      numeric(10,2),
  status      text default 'pending',
  due_date    date,
  paid_at     timestamptz,
  created_at  timestamptz default now()
);
alter table public.billing enable row level security;
create policy "billing_select" on public.billing for select to authenticated using (true);
create policy "billing_all"    on public.billing for all    to authenticated using (true);

-- ── AUTO-CREATE PROFILE ON SIGNUP ──
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'parent')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
