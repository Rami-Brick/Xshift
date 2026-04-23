# Database Schema

Target: Supabase Postgres. RLS is enabled on every public table. Employee-facing reads are RLS-scoped to the authenticated user. Admin reads and privileged writes go through Next.js server code using the service-role client after `requireAdmin()`.

## Enums

```sql
create type public.user_role as enum ('employee', 'admin');

create type public.attendance_status as enum (
  'present', 'late', 'absent', 'leave', 'holiday'
);

create type public.leave_type as enum ('annual', 'sick', 'unpaid', 'other');

create type public.leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');

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
```

## Tables

### `profiles`

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role public.user_role not null default 'employee',
  work_start_time time not null default '08:30',
  work_end_time time not null default '17:30',
  leave_balance numeric(6,2) not null default 0,
  is_active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `attendance`

One row per `(user_id, date)`.

```sql
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
  unique (user_id, date)
);
```

Notes:
- `forgot_checkout` is precomputed. A daily admin-run query (or an on-demand flip in the admin attendance view) sets it to `true` for rows where `check_in_at is not null and check_out_at is null and now() > date + forgot_checkout_cutoff_time`.

### `leave_requests`

```sql
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
```

For MVP admin-assigned leave, rows are created with `status = 'approved'` and `requested_by = admin_id`.

### `office_settings`

Singleton row for MVP. Includes admin-configurable policy fields.

```sql
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
```

Multi-office upgrade path (not MVP): rename to `offices`, add `office_id` FK on `profiles` and `attendance`.

### `activity_logs`

```sql
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action public.activity_action not null,
  target_user_id uuid references public.profiles(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

## Triggers

```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
```

Attached to `profiles`, `attendance`, `leave_requests`, `office_settings`.

`0001_init.sql` also creates a private auth trigger:

```sql
create schema if not exists app_private;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
-- Inserts a minimal public.profiles row for each new auth.users row.
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();
```

The trigger reads `raw_app_meta_data->>'role'` only to choose `admin` vs
`employee`, and reads `raw_user_meta_data->>'full_name'` only as profile
display data. Authorization in app code still uses `public.profiles.role`.

## Indexes

```sql
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
```

## RLS strategy

Current migrations keep browser/client access narrow. There is no public
`is_admin()` helper in the applied schema. Employee-facing reads use the normal
Supabase server/browser client and are scoped by RLS to the current user.
Admin list/detail reads and admin mutations are performed in Next.js server
code after `requireAdmin()`, using the server-only service-role client.

### `profiles`

```sql
alter table public.profiles enable row level security;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));
```

There is currently no browser/client update policy for `profiles`. Admin
profile reads/writes go through the service-role client after server-side admin
verification.

### `attendance`

```sql
alter table public.attendance enable row level security;

create policy attendance_select_own
  on public.attendance for select to authenticated
  using (user_id = (select auth.uid()));
```

No direct insert/update from the browser. Check-in/check-out and admin manual
attendance writes go through route handlers that verify the user and then write
with the service-role client.

### `leave_requests`

```sql
alter table public.leave_requests enable row level security;

create policy leave_select_own
  on public.leave_requests for select to authenticated
  using (user_id = (select auth.uid()));
```

### `office_settings`

```sql
alter table public.office_settings enable row level security;

create policy office_settings_select_authenticated
  on public.office_settings for select to authenticated
  using (true);
```

### `activity_logs`

RLS is enabled with no browser policies. Only the service-role client
reads/writes logs, gated by admin-verified route handlers.

## RPC functions

`0003_functions.sql` defines:

```sql
create or replace function public.decrement_leave_balance(p_user_id uuid, p_days int)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set leave_balance = greatest(0, leave_balance - p_days)
  where id = p_user_id;
$$;
```

It is called from admin leave assignment/review code through the service-role
client.

## TypeScript types

There is no generated `src/types/database.ts` committed yet. Hand-written domain
types live at `src/types/index.ts`:

```ts
export type Role = 'employee' | 'admin';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave' | 'holiday';
export type LeaveType = 'annual' | 'sick' | 'unpaid' | 'other';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  work_start_time: string;
  work_end_time: string;
  leave_balance: number;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  status: AttendanceStatus;
  late_minutes: number;
  forgot_checkout: boolean;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_in_accuracy_meters: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  check_out_accuracy_meters: number | null;
  check_in_distance_meters: number | null;
  check_out_distance_meters: number | null;
  note: string | null;
  profiles?: Profile;
}

export interface OfficeSettings {
  id: string;
  office_name: string;
  company_name: string;
  logo_url: string | null;
  office_latitude: number;
  office_longitude: number;
  allowed_radius_meters: number;
  gps_accuracy_limit_meters: number;
  grace_period_minutes: number;
  forgot_checkout_cutoff_time: string;
  default_work_start_time: string;
  default_work_end_time: string;
  timezone: string;
}
```
