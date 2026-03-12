-- Add recurring billing fields to billing table
alter table public.billing add column if not exists is_recurring boolean default false;
alter table public.billing add column if not exists recurrence_interval text; -- 'weekly','monthly','quarterly','annually'
alter table public.billing add column if not exists recurrence_start date;
alter table public.billing add column if not exists recurrence_end date;
alter table public.billing add column if not exists parent_recurring_id uuid; -- links generated invoices back to the recurring template
