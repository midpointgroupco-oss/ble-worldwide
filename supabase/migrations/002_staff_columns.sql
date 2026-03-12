-- Add extra columns to profiles table for staff management
alter table public.profiles add column if not exists email          text;
alter table public.profiles add column if not exists phone          text;
alter table public.profiles add column if not exists subject        text;
alter table public.profiles add column if not exists grade_assigned text;
alter table public.profiles add column if not exists notes          text;

-- Sync email from auth.users into profiles for existing users
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Update the trigger to also capture email on new signups
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'parent'),
    new.email
  )
  on conflict (id) do update
    set email = new.email;
  return new;
end;
$$;
