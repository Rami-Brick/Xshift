-- Xshift canonical initial schema.
-- This is the shared migration shape agreed for both Codex and Claude builds.
-- Run once in a fresh Supabase project.

create extension if not exists pgcrypto with schema extensions;

create type public.user_role as enum ('employee', 'admin');

create type public.attendance_status as enum (
  'present',
  'late',
  'absent',
  'leave',
  'holiday'
);

create type public.leave_type as enum ('annual', 'sick', 'unpaid', 'other');

create type public.leave_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

create type public.activity_action as enum (
  'checkin',
  'checkout',
  'create_employee',
  'update_employee',
  'deactivate_employee',
  'update_attendance',
  'manual_attendance',
  'delete_attendance',
  'request_leave',
  'approve_leave',
  'reject_leave',
  'cancel_leave',
  'assign_leave',
  'update_leave',
  'delete_leave',
  'update_settings',
  'login'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role public.user_role not null default 'employee',
  work_start_time time not null default '08:30',
  work_end_time time not null default '17:30',
  leave_balance numeric(6, 2) not null default 0,
  is_active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (leave_balance >= 0)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  status public.attendance_status not null default 'present',
  late_minutes integer not null default 0,
  forgot_checkout boolean not null default false,
  check_in_latitude double precision,
  check_in_longitude double precision,
  check_in_accuracy_meters double precision,
  check_out_latitude double precision,
  check_out_longitude double precision,
  check_out_accuracy_meters double precision,
  check_in_distance_meters integer,
  check_out_distance_meters integer,
  note text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date),
  check (late_minutes >= 0),
  check (check_out_at is null or check_in_at is null or check_out_at >= check_in_at),
  check (check_in_accuracy_meters is null or check_in_accuracy_meters >= 0),
  check (check_out_accuracy_meters is null or check_out_accuracy_meters >= 0),
  check (check_in_distance_meters is null or check_in_distance_meters >= 0),
  check (check_out_distance_meters is null or check_out_distance_meters >= 0)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  type public.leave_type not null default 'annual',
  status public.leave_status not null default 'pending',
  reason text,
  admin_note text,
  requested_by uuid references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  deduct_balance boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table public.office_settings (
  id uuid primary key default gen_random_uuid(),
  office_name text not null default 'Bureau principal',
  company_name text not null default 'Xshift',
  logo_url text,
  office_latitude double precision not null,
  office_longitude double precision not null,
  allowed_radius_meters integer not null default 200,
  gps_accuracy_limit_meters integer not null default 100,
  grace_period_minutes integer not null default 10,
  forgot_checkout_cutoff_time time not null default '23:00',
  default_work_start_time time not null default '08:30',
  default_work_end_time time not null default '17:30',
  timezone text not null default 'Africa/Tunis',
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (allowed_radius_meters > 0),
  check (gps_accuracy_limit_meters > 0),
  check (grace_period_minutes >= 0 and grace_period_minutes <= 60)
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action public.activity_action not null,
  target_user_id uuid references public.profiles(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger attendance_set_updated_at
before update on public.attendance
for each row execute function public.set_updated_at();

create trigger leave_requests_set_updated_at
before update on public.leave_requests
for each row execute function public.set_updated_at();

create trigger office_settings_set_updated_at
before update on public.office_settings
for each row execute function public.set_updated_at();

create schema if not exists app_private;

revoke all on schema app_private from public;
revoke all on schema app_private from anon;
revoke all on schema app_private from authenticated;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_role public.user_role := 'employee';
begin
  if new.raw_app_meta_data->>'role' = 'admin' then
    profile_role := 'admin';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@xshift.local'),
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Utilisateur'
    ),
    profile_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.attendance enable row level security;
alter table public.leave_requests enable row level security;
alter table public.office_settings enable row level security;
alter table public.activity_logs enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "attendance_select_own"
on public.attendance
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "leave_requests_select_own"
on public.leave_requests
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "office_settings_select_authenticated"
on public.office_settings
for select
to authenticated
using (true);

create index profiles_role_idx on public.profiles(role);
create index profiles_is_active_idx on public.profiles(is_active);
create index attendance_user_date_idx on public.attendance(user_id, date desc);
create index attendance_date_idx on public.attendance(date desc);
create index attendance_status_idx on public.attendance(status);
create index attendance_forgot_checkout_idx
on public.attendance(forgot_checkout)
where forgot_checkout = true;
create index leave_requests_user_dates_idx on public.leave_requests(user_id, start_date, end_date);
create index leave_requests_status_idx on public.leave_requests(status);
create index activity_logs_created_at_idx on public.activity_logs(created_at desc);
create index activity_logs_actor_idx on public.activity_logs(actor_id);
create index activity_logs_target_idx on public.activity_logs(target_user_id);
