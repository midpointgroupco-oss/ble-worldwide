-- ── V20 SCHEMA ADDITIONS ──

-- Add student role support to profiles
alter table public.profiles add column if not exists student_id_ref uuid references public.students(id);

-- ── SCHOOL YEARS & TERMS ──
create table if not exists public.school_years (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,           -- e.g. "2025-2026"
  start_date date not null,
  end_date   date not null,
  is_current boolean default false,
  created_at timestamptz default now()
);
alter table public.school_years enable row level security;
create policy "sy_all" on public.school_years for all to authenticated using (true);

create table if not exists public.terms (
  id             uuid primary key default gen_random_uuid(),
  school_year_id uuid references public.school_years(id) on delete cascade,
  name           text not null,       -- e.g. "Q1", "Semester 1"
  start_date     date not null,
  end_date       date not null,
  is_current     boolean default false,
  created_at     timestamptz default now()
);
alter table public.terms enable row level security;
create policy "terms_all" on public.terms for all to authenticated using (true);

-- Add term_id to relevant tables
alter table public.assignments add column if not exists term_id uuid references public.terms(id);
alter table public.billing     add column if not exists term_id uuid references public.terms(id);

-- ── CREDIT TRACKING ──
create table if not exists public.credit_requirements (
  id          uuid primary key default gen_random_uuid(),
  subject     text not null,
  credits_req numeric(4,2) not null default 1.0,
  grade_level text,   -- null = applies to all
  created_at  timestamptz default now()
);
alter table public.credit_requirements enable row level security;
create policy "cr_all" on public.credit_requirements for all to authenticated using (true);

create table if not exists public.student_credits (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  course_id  uuid references public.courses(id),
  subject    text not null,
  credits    numeric(4,2) not null default 1.0,
  grade      text,
  term_id    uuid references public.terms(id),
  school_year text,
  earned_at  timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.student_credits enable row level security;
create policy "sc_all" on public.student_credits for all to authenticated using (true);

-- Add credits column to courses
alter table public.courses add column if not exists credits numeric(4,2) default 1.0;

-- ── ENROLLMENT APPLICATIONS ──
create table if not exists public.enrollment_applications (
  id               uuid primary key default gen_random_uuid(),
  -- Student info
  student_name     text not null,
  date_of_birth    date,
  grade_applying   text not null,
  previous_school  text,
  -- Guardian info
  guardian_name    text not null,
  guardian_email   text not null,
  guardian_phone   text,
  guardian_address text,
  -- Additional
  notes            text,
  documents        jsonb default '[]',
  -- Status
  status           text default 'pending',  -- pending, reviewing, approved, denied
  reviewed_by      uuid references public.profiles(id),
  reviewed_at      timestamptz,
  review_notes     text,
  submitted_at     timestamptz default now(),
  created_at       timestamptz default now()
);
alter table public.enrollment_applications enable row level security;
create policy "ea_select" on public.enrollment_applications for select to authenticated using (true);
create policy "ea_insert" on public.enrollment_applications for insert to anon    with check (true);
create policy "ea_all"    on public.enrollment_applications for all    to authenticated using (true);

-- ── REPORT CARDS ──
create table if not exists public.report_cards (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  term_id    uuid references public.terms(id),
  school_year text not null,
  term_name   text not null,
  grades      jsonb default '[]',   -- [{course, subject, grade, points, credits, teacher}]
  gpa         numeric(3,2),
  attendance_days_present integer default 0,
  attendance_days_absent  integer default 0,
  teacher_comments text,
  published   boolean default false,
  published_at timestamptz,
  created_at  timestamptz default now()
);
alter table public.report_cards enable row level security;
create policy "rc_all" on public.report_cards for all to authenticated using (true);

-- ── HOMEWORK SUBMISSION CONTENT (extends existing submissions) ──
alter table public.submissions add column if not exists content      text;
alter table public.submissions add column if not exists file_urls    jsonb default '[]';
alter table public.submissions add column if not exists submitted_by uuid references public.profiles(id);

-- ── SEED DEFAULT CREDIT REQUIREMENTS ──
insert into public.credit_requirements (subject, credits_req) values
  ('English',            4.0),
  ('Mathematics',        4.0),
  ('Science',            3.0),
  ('Social Studies',     3.0),
  ('World Language',     2.0),
  ('Physical Education', 1.5),
  ('Fine Arts',          1.0),
  ('Technology',         1.0),
  ('Health',             0.5),
  ('Elective',           2.0)
on conflict do nothing;

-- ── SEED CURRENT SCHOOL YEAR ──
insert into public.school_years (name, start_date, end_date, is_current)
values ('2025-2026', '2025-08-01', '2026-05-31', true)
on conflict do nothing;

-- Seed terms for current school year
with sy as (select id from public.school_years where name = '2025-2026' limit 1)
insert into public.terms (school_year_id, name, start_date, end_date, is_current)
select sy.id, t.name, t.start_date::date, t.end_date::date, t.is_current
from sy, (values
  ('Q1',  '2025-08-01', '2025-10-17', false),
  ('Q2',  '2025-10-20', '2026-01-16', false),
  ('Q3',  '2026-01-20', '2026-03-27', true),
  ('Q4',  '2026-03-30', '2026-05-31', false)
) as t(name, start_date, end_date, is_current)
on conflict do nothing;
