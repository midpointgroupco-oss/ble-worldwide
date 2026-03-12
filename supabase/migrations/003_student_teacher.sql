-- Add teacher_id to students table for elementary direct assignment
alter table public.students add column if not exists teacher_id uuid references public.profiles(id);
