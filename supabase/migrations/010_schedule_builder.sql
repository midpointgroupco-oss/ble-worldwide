-- Enhance schedule_events for full class schedule builder
alter table public.schedule_events add column if not exists teacher_id uuid references public.profiles(id);
alter table public.schedule_events add column if not exists recurrence text default 'once';
-- recurrence: once | daily | weekly | biweekly
alter table public.schedule_events add column if not exists recurrence_end date;
alter table public.schedule_events add column if not exists day_of_week int;
-- 0=Sun,1=Mon...6=Sat (used for weekly recurring events)
alter table public.schedule_events add column if not exists event_type text default 'class';
-- event_type: class | exam | holiday | meeting | other
alter table public.schedule_events add column if not exists location text;
