-- Add file attachment support to submissions
alter table public.submissions add column if not exists file_url text;
alter table public.submissions add column if not exists file_name text;
alter table public.submissions add column if not exists file_size integer;

-- Add photo_url to students and profiles
alter table public.students add column if not exists photo_url text;
alter table public.profiles add column if not exists photo_url text;
