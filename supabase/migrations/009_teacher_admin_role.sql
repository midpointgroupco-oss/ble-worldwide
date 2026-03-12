-- Add is_admin flag to profiles
-- Teachers with is_admin = true can access the admin portal
alter table public.profiles add column if not exists is_admin boolean default false;

-- Add assignment_type to assignments for better categorization
alter table public.assignments add column if not exists assignment_type text default 'homework';
-- Types: homework, quiz, test, project, classwork, extra_credit
