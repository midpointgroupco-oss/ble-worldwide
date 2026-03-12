-- Drop old unique constraint and replace with one that handles null course_id (elementary)
alter table public.attendance drop constraint if exists attendance_student_id_course_id_date_key;

create unique index if not exists attendance_unique_idx
  on public.attendance (student_id, date, coalesce(course_id, '00000000-0000-0000-0000-000000000000'::uuid));
