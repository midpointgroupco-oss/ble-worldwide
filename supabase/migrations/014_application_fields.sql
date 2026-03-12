-- New fields on enrollment_applications for expanded form
alter table public.enrollment_applications add column if not exists country              text;
alter table public.enrollment_applications add column if not exists student_nationality  text;
alter table public.enrollment_applications add column if not exists has_iep              text default 'no';
alter table public.enrollment_applications add column if not exists special_needs        text;
alter table public.enrollment_applications add column if not exists guardian_relationship text default 'Parent';
alter table public.enrollment_applications add column if not exists start_date           date;
alter table public.enrollment_applications add column if not exists how_heard            text;
