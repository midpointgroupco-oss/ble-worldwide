-- ============================================================
-- BLE WORLDWIDE — SUPABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ── PROFILES (extends auth.users) ──
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null check (role in ('admin','teacher','parent')),
  avatar_url  text,
  phone       text,
  timezone    text default 'UTC',
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can read own profile"    on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"  on public.profiles for update using (auth.uid() = id);
create policy "Admins read all profiles"      on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── STUDENTS ──
create table if not exists public.students (
  id              uuid primary key default gen_random_uuid(),
  student_id      text unique,
  full_name       text not null,
  email           text,
  grade_level     text not null,
  country         text,
  guardian_name   text,
  guardian_email  text,
  parent_id       uuid references public.profiles(id),
  status          text default 'active' check (status in ('active','inactive','graduated','review')),
  gpa             text,
  attendance_rate integer default 94,
  course_count    integer default 0,
  notes           text,
  created_at      timestamptz default now()
);
alter table public.students enable row level security;
create policy "Admins full access to students"    on public.students for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Teachers can read students"        on public.students for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
);
create policy "Parents can read own child"        on public.students for select using (
  parent_id = auth.uid()
);

-- ── GRADE LEVELS ──
create table if not exists public.grade_levels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,  -- '4th', '5th', etc.
  color       text default '#00c9b1',
  sort_order  integer,
  created_at  timestamptz default now()
);
insert into public.grade_levels (name, color, sort_order) values
  ('4th','#00c9b1',1),('5th','#3b9eff',2),('6th','#f72585',3),('7th','#ffc845',4),
  ('8th','#ff6058',5),('9th','#7b5ea7',6),('10th','#06d6a0',7),('11th','#ff8c42',8),('12th','#00b4d8',9)
on conflict do nothing;

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
create policy "Anyone authenticated can read courses" on public.courses for select using (auth.role() = 'authenticated');
create policy "Admins manage courses"                 on public.courses for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

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
create policy "Admins and teachers access enrollments" on public.enrollments for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','teacher'))
);
create policy "Parents read own child enrollments" on public.enrollments for select using (
  exists (select 1 from public.students where id = student_id and parent_id = auth.uid())
);

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
create policy "Auth users can read assignments" on public.assignments for select using (auth.role() = 'authenticated');
create policy "Teachers manage own assignments" on public.assignments for all using (teacher_id = auth.uid());
create policy "Admins manage all assignments"  on public.assignments for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

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
  status        text default 'pending' check (status in ('pending','submitted','graded','late')),
  unique(assignment_id, student_id)
);
alter table public.submissions enable row level security;
create policy "Teachers manage submissions for their courses" on public.submissions for all using (
  exists (
    select 1 from public.assignments a
    join public.courses c on a.course_id = c.id
    where a.id = assignment_id and c.teacher_id = auth.uid()
  )
);
create policy "Admins access all submissions" on public.submissions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Parents view child submissions" on public.submissions for select using (
  exists (select 1 from public.students where id = student_id and parent_id = auth.uid())
);

-- ── ATTENDANCE ──
create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid references public.students(id) on delete cascade,
  course_id   uuid references public.courses(id),
  date        date not null,
  status      text default 'present' check (status in ('present','absent','late','excused')),
  notes       text,
  unique(student_id, course_id, date)
);
alter table public.attendance enable row level security;
create policy "Teachers manage attendance" on public.attendance for all using (
  exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid())
);
create policy "Admins access all attendance" on public.attendance for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Parents read child attendance" on public.attendance for select using (
  exists (select 1 from public.students where id = student_id and parent_id = auth.uid())
);

-- ── MESSAGES ──
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  subject       text not null,
  body          text not null,
  sender_id     uuid references public.profiles(id),
  recipient_id  uuid references public.profiles(id),
  read          boolean default false,
  created_at    timestamptz default now()
);
alter table public.messages enable row level security;
create policy "Users access own messages" on public.messages for all using (
  sender_id = auth.uid() or recipient_id = auth.uid()
);
create policy "Admins access all messages" on public.messages for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

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
create policy "Auth users read schedule" on public.schedule_events for select using (auth.role() = 'authenticated');
create policy "Admins and teachers manage schedule" on public.schedule_events for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','teacher'))
);

-- ── ANNOUNCEMENTS ──
create table if not exists public.announcements (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null,
  audience      text default 'all' check (audience in ('all','admin','teacher','parent','grade')),
  grade_level   text,
  created_by    uuid references public.profiles(id),
  published_at  timestamptz default now(),
  created_at    timestamptz default now()
);
alter table public.announcements enable row level security;
create policy "Auth users read announcements" on public.announcements for select using (auth.role() = 'authenticated');
create policy "Admins manage announcements"   on public.announcements for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ── BILLING ──
create table if not exists public.billing (
  id            uuid primary key default gen_random_uuid(),
  parent_id     uuid references public.profiles(id),
  description   text not null,
  amount        numeric(10,2),
  status        text default 'pending' check (status in ('pending','paid','overdue','refunded')),
  due_date      date,
  paid_at       timestamptz,
  created_at    timestamptz default now()
);
alter table public.billing enable row level security;
create policy "Parents access own billing" on public.billing for select using (parent_id = auth.uid());
create policy "Admins access all billing"  on public.billing for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

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
