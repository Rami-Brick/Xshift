-- ============================================================
-- 0004_day_off.sql — Day-off feature
-- Adds: profiles.default_day_off, day_off_changes table,
--       day_off_change_status + day_of_week enums,
--       new values for attendance_status and activity_action.
-- See docs/DAY_OFF_FEATURE.md for the full spec.
-- ============================================================

-- 1. New enums
create type public.day_of_week as enum (
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
);

create type public.day_off_change_status as enum (
  'pending', 'approved', 'rejected', 'cancelled'
);

-- 2. Extend existing enums (append-only, safe on re-run)
alter type public.attendance_status add value if not exists 'day_off';

alter type public.activity_action add value if not exists 'request_day_off_change';
alter type public.activity_action add value if not exists 'approve_day_off_change';
alter type public.activity_action add value if not exists 'reject_day_off_change';
alter type public.activity_action add value if not exists 'cancel_day_off_change';
alter type public.activity_action add value if not exists 'assign_day_off_change';
alter type public.activity_action add value if not exists 'update_day_off_change';
alter type public.activity_action add value if not exists 'delete_day_off_change';
alter type public.activity_action add value if not exists 'update_default_day_off';

-- 3. profiles.default_day_off (back-fills existing rows to 'saturday')
alter table public.profiles
  add column if not exists default_day_off public.day_of_week not null default 'saturday';

-- 4. day_off_changes table
create table if not exists public.day_off_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  iso_year int not null,
  iso_week int not null,
  old_day public.day_of_week not null,
  new_day public.day_of_week not null,
  status public.day_off_change_status not null default 'pending',
  reason text,
  admin_note text,
  requested_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (iso_week between 1 and 53),
  check (new_day <> old_day)
);

-- updated_at trigger (reuses helper from 0001_init.sql)
drop trigger if exists day_off_changes_set_updated_at on public.day_off_changes;
create trigger day_off_changes_set_updated_at
  before update on public.day_off_changes
  for each row execute function public.set_updated_at();

-- 5. Indexes
-- Only one pending or approved override per (user, iso_year, iso_week).
create unique index if not exists day_off_changes_unique_active_idx
  on public.day_off_changes (user_id, iso_year, iso_week)
  where status in ('pending', 'approved');

create index if not exists day_off_changes_status_idx
  on public.day_off_changes(status);

create index if not exists day_off_changes_user_week_idx
  on public.day_off_changes(user_id, iso_year desc, iso_week desc);

-- 6. RLS
alter table public.day_off_changes enable row level security;

drop policy if exists "day_off_changes_select_own" on public.day_off_changes;
create policy "day_off_changes_select_own"
  on public.day_off_changes
  for select
  to authenticated
  using (user_id = (select auth.uid()));
