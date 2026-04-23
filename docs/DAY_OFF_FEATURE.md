# Day-Off Feature — Technical Specification

> **Status:** Proposal / pre-implementation
> **Author's idea:** Each employee has a *weekly* day off. The day is **flexible** (no shop-wide Sunday) and is assigned per-employee at creation. Employees can **request** a swap for this week or next; admin sees all requests on a dashboard and **approves or rejects** them.
>
> **Audience:** This document is written so that an engineer (or Claude) can pick it up and implement it end-to-end without further context. It follows the existing conventions of Xshift (Next.js 15 App Router + Supabase + Tailwind v4 + `next-intl` French-only + service-role for admin mutations).

---

## Table of Contents

1. [Vocabulary](#1-vocabulary)
2. [Feature Overview](#2-feature-overview)
3. [User Stories](#3-user-stories)
4. [Business Rules](#4-business-rules)
5. [Data Model](#5-data-model)
6. [Migration Plan](#6-migration-plan)
7. [Backend — API Routes](#7-backend--api-routes)
8. [Validation Schemas](#8-validation-schemas)
9. [Frontend — Employee UI](#9-frontend--employee-ui)
10. [Frontend — Admin UI](#10-frontend--admin-ui)
11. [Interactions With Existing Features](#11-interactions-with-existing-features)
12. [Activity Logging](#12-activity-logging)
13. [i18n (French Strings)](#13-i18n-french-strings)
14. [Edge Cases & Failure Modes](#14-edge-cases--failure-modes)
15. [Security & RLS](#15-security--rls)
16. [Rollout & Testing](#16-rollout--testing)
17. [Out of Scope / Future Work](#17-out-of-scope--future-work)
18. [Implementation Checklist](#18-implementation-checklist)

---

## 1. Vocabulary

| Term | Meaning |
|---|---|
| **Default day off** | The recurring weekly day off stored on the employee's profile (e.g. `sunday`). Acts as a fallback whenever no override is in effect for a given ISO week. |
| **Override** | A one-off change to an employee's day off for a specific ISO week. Can **move** the day (old day becomes a working day, a new day becomes the day off) or **split** (future: two half-days — out of scope v1). |
| **Day-off change request** | An employee-initiated request to create an override, awaiting admin review. Workflow mirrors `leave_requests` (`pending` → `approved` / `rejected`). |
| **Effective day off for week W** | If an *approved* override exists for ISO week W → the override's `new_day`. Otherwise → `profiles.default_day_off`. |
| **ISO week** | Weeks anchored to Monday per ISO 8601 (matches `date-fns` default). All week math in Xshift already uses `Africa/Tunis`. |

---

## 2. Feature Overview

Today every employee works 7 days (no concept of "day off") and late/absent status is computed against `profiles.work_start_time` every day. We introduce:

1. A **`default_day_off`** column on `profiles`, chosen at employee creation or edit.
2. A **`day_off_changes`** table: one row per override request, reviewed by admin.
3. An **employee screen** under `/day-off` to view the effective day off for this/next week and submit a change request.
4. An **admin screen** under `/admin/day-off` with a review queue (pending/approved/rejected) plus the ability to edit any employee's default day off.
5. **Attendance logic integration**: on an employee's *effective day off*, check-in/out is disabled; the daily roll-up treats that date as `day_off` instead of `absent`.

The feature reuses patterns that already exist for `leave_requests`: pending-state workflow, admin review via service role, activity-log entries, and derived attendance rows. **Do not invent a new pattern** — mirror `leave_requests` so the app stays coherent.

### Flow diagram (happy path)

```
[Employee] ── submits day-off change for week W ──▶ day_off_changes (pending)
                                                    │
                                         [Admin dashboard badge: N pending]
                                                    │
                        ┌───────────────────────────┼───────────────────────┐
                        ▼                                                   ▼
        Admin approves (writes reviewed_by/at)              Admin rejects (+ admin_note)
                        │                                                   │
                        ▼                                                   ▼
        ─ Upsert attendance row(s) so that:                     ─ Request status = 'rejected'
          ▪ old_day        → cleared (working day)              ─ Effective day off falls back
          ▪ new_day        → status='day_off'                     to profile.default_day_off
        ─ Request status = 'approved'
```

---

## 3. User Stories

### Employee (`role = 'employee'`)

- **E1** — As an employee, I can see *what* my default day off is, from my profile or a dedicated `/day-off` screen.
- **E2** — As an employee, I can see *which* day is my effective day off this week and next week (default or approved override).
- **E3** — As an employee, I can submit a change request for **this week** or **next week**, choosing:
  - the **target week** (this / next — i.e. ISO week containing `today` or `today + 7`),
  - the **new day** (Mon–Sun, must differ from the effective day),
  - an optional **reason** (free text, 500 chars max).
- **E4** — As an employee, if I have a pending request, I cannot submit a second one covering the same ISO week; I must cancel the existing one first.
- **E5** — As an employee, I can cancel my own request **only while it is still pending**. Once approved/rejected, only an admin can modify it.
- **E6** — As an employee, on my effective day off the `/dashboard` check-in button is **replaced** by a chip "Jour de repos" and the `/api/checkin` endpoint refuses the request (422).

### Admin (`role = 'admin'`)

- **A1** — As an admin, when I create an employee, I can pick their default day off (defaults to *Sunday* to match Tunisian norms, overridable).
- **A2** — As an admin, when I edit an employee, I can change the default day off; that change applies *prospectively* (future weeks only; doesn't rewrite past attendance).
- **A3** — As an admin, I see a pending-request count badge on `/admin/dashboard`, wired into `/api/admin/stats` alongside `pending_leave`.
- **A4** — As an admin, on `/admin/day-off` I see a filterable table of all requests (all / pending / approved / rejected) with actions: **Approve**, **Reject** (with optional note), **Delete**, **Edit**.
- **A5** — As an admin, I can **assign** a day-off override for any employee without a preceding request (auto-approved, mirrors `AdminLeaveDialog` → `POST /api/leave/all`).
- **A6** — As an admin, approving a request **must** back-fill attendance rows for the target week so reports stay consistent (see §11).

---

## 4. Business Rules

### BR-1 — Exactly one day off per ISO week per employee
No employee may have *two* effective days off in the same ISO week. Enforced in code (API) and by a partial unique index on `day_off_changes` (see §5).

### BR-2 — Override window
Requests may only target:
- The current ISO week (`getISOWeek(today)`), **if** the *new day* is in the future *or* today and the current effective day off hasn't been consumed yet. Cutoff: you cannot change today once you've checked in.
- The next ISO week.

No further in the future and no past weeks. Admins bypass this (they can edit any week).

### BR-3 — New day ≠ current effective day
A change request whose `new_day` equals the current effective day off is rejected at validation with `"Le jour choisi est déjà votre jour de repos"`.

### BR-4 — No pending request overlap
Only one `pending` request per `(user_id, iso_year, iso_week)`. A second submission 409s with `"Une demande est déjà en attente pour cette semaine"`. Employee must cancel first.

### BR-5 — No collision with approved leave
If the target week overlaps an approved `leave_requests` row for the same employee, the request is refused: `"Vous avez déjà un congé approuvé cette semaine"`. Rationale: a day-off override on a leave day is meaningless and would double-mark attendance.

### BR-6 — Approval side-effects
When admin approves:
1. Recompute the attendance rows for the target week.
2. For the **old day** (the day that *would* have been the day off under the default): delete the existing `attendance` row only if it's still `status='day_off'` with no `check_in_at` — otherwise leave it alone (employee actually came in).
3. For the **new day**: `upsert` an attendance row `(user_id, date, status='day_off', late_minutes=0, forgot_checkout=false, created_by=admin, updated_by=admin)`. If a row already exists with `check_in_at IS NOT NULL`, **abort the approval with 409** — the employee already checked in on the proposed new day off. Admin must edit that attendance first.
4. No effect on `leave_balance` (day-off is not leave).

### BR-7 — Rejection / cancellation are pure status transitions
They only flip `status` and populate `admin_note`, `reviewed_by`, `reviewed_at` (or clear them on cancel-by-employee). Nothing in attendance changes, since a `pending` request has no attendance side-effects.

### BR-8 — Editing a default day off is prospective
When the admin updates `profiles.default_day_off`, **do not** rewrite historical attendance. The change applies to any ISO week whose Monday is `≥ today`. This keeps reports immutable.

### BR-9 — Deactivated employees
`is_active = false` → cannot submit requests (403). Existing approved overrides remain historical record.

---

## 5. Data Model

### 5.1 Enum: `public.day_of_week`

```sql
create type public.day_of_week as enum (
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
);
```

### 5.2 New column on `public.profiles`

| Column | Type | Notes |
|---|---|---|
| `default_day_off` | `day_of_week NOT NULL DEFAULT 'saturday'` | Recurring weekly day off. New employees default to Saturday. |

Existing rows get back-filled to `'saturday'` automatically by the default.

### 5.3 Enum: `public.day_off_change_status`

```sql
create type public.day_off_change_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);
```

Kept separate from `leave_status` to avoid semantic mixing, even though the values are identical.

### 5.4 Table: `public.day_off_changes`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid primary key default gen_random_uuid()` | |
| `user_id` | `uuid not null references profiles(id) on delete cascade` | Who the override applies to |
| `iso_year` | `int not null` | ISO-8601 year of the week (different from calendar year near Jan 1 / Dec 31) |
| `iso_week` | `int not null check (iso_week between 1 and 53)` | ISO week number |
| `old_day` | `day_of_week not null` | The day that *was* the day off under the default (captured at request time for audit) |
| `new_day` | `day_of_week not null` | The requested day off. `check (new_day <> old_day)` |
| `status` | `day_off_change_status not null default 'pending'` | |
| `reason` | `text` | Employee-provided, ≤ 500 chars |
| `admin_note` | `text` | Admin-provided on review |
| `requested_by` | `uuid references profiles(id)` | NULL = self-submitted; non-NULL = admin-assigned |
| `reviewed_by` | `uuid references profiles(id)` | Admin who approved/rejected |
| `reviewed_at` | `timestamptz` | |
| `created_at` | `timestamptz not null default now()` | |
| `updated_at` | `timestamptz not null default now()` | Auto via `set_updated_at()` trigger |

#### Constraints & indexes

```sql
-- Only one pending or approved request per (user, iso_year, iso_week).
create unique index day_off_changes_unique_active_idx
  on public.day_off_changes (user_id, iso_year, iso_week)
  where status in ('pending', 'approved');

-- Fast admin list
create index day_off_changes_status_idx on public.day_off_changes(status);
create index day_off_changes_user_week_idx on public.day_off_changes(user_id, iso_year desc, iso_week desc);
```

### 5.5 New enum values for `activity_action`

Extend the existing enum (append-only):

```sql
alter type public.activity_action add value 'request_day_off_change';
alter type public.activity_action add value 'approve_day_off_change';
alter type public.activity_action add value 'reject_day_off_change';
alter type public.activity_action add value 'cancel_day_off_change';
alter type public.activity_action add value 'assign_day_off_change';
alter type public.activity_action add value 'update_day_off_change';
alter type public.activity_action add value 'delete_day_off_change';
alter type public.activity_action add value 'update_default_day_off';
```

Also extend the TypeScript union in [src/types/index.ts](../src/types/index.ts):

```ts
export type ActivityAction =
  | ...existing...
  | 'request_day_off_change'
  | 'approve_day_off_change'
  | 'reject_day_off_change'
  | 'cancel_day_off_change'
  | 'assign_day_off_change'
  | 'update_day_off_change'
  | 'delete_day_off_change'
  | 'update_default_day_off';
```

### 5.6 New enum value for `attendance_status`

```sql
alter type public.attendance_status add value 'day_off';
```

This is what approved day-off dates get flagged as on the `attendance` table — distinct from `leave` and `holiday`.

Update `AttendanceStatus` in `src/types/index.ts` accordingly.

---

## 6. Migration Plan

Create `supabase/migrations/0004_day_off.sql` (do **not** modify `0001_init.sql` — migrations are append-only once deployed):

```sql
-- 0004_day_off.sql — Day-off feature (default day + per-week overrides)

-- 1. Enums
create type public.day_of_week as enum (
  'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
);

create type public.day_off_change_status as enum (
  'pending','approved','rejected','cancelled'
);

-- 2. Extend existing enums (these MUST be in their own transactions in some Postgres versions;
--    keep as-is — Supabase CLI handles migration boundaries)
alter type public.attendance_status add value if not exists 'day_off';
alter type public.activity_action add value if not exists 'request_day_off_change';
alter type public.activity_action add value if not exists 'approve_day_off_change';
alter type public.activity_action add value if not exists 'reject_day_off_change';
alter type public.activity_action add value if not exists 'cancel_day_off_change';
alter type public.activity_action add value if not exists 'assign_day_off_change';
alter type public.activity_action add value if not exists 'update_day_off_change';
alter type public.activity_action add value if not exists 'delete_day_off_change';
alter type public.activity_action add value if not exists 'update_default_day_off';

-- 3. profiles.default_day_off (defaulted, NOT NULL, back-fills existing rows automatically)
alter table public.profiles
  add column if not exists default_day_off public.day_of_week not null default 'saturday';

-- 4. day_off_changes table
create table public.day_off_changes (
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

create trigger day_off_changes_set_updated_at
  before update on public.day_off_changes
  for each row execute function public.set_updated_at();

create unique index day_off_changes_unique_active_idx
  on public.day_off_changes (user_id, iso_year, iso_week)
  where status in ('pending','approved');

create index day_off_changes_status_idx on public.day_off_changes(status);
create index day_off_changes_user_week_idx on public.day_off_changes(user_id, iso_year desc, iso_week desc);

-- 5. RLS
alter table public.day_off_changes enable row level security;

create policy "day_off_changes_select_own"
  on public.day_off_changes
  for select
  to authenticated
  using (user_id = (select auth.uid()));
```

### Rollback

```sql
drop table if exists public.day_off_changes;
alter table public.profiles drop column if exists default_day_off;
drop type if exists public.day_off_change_status;
drop type if exists public.day_of_week;
-- enum values cannot be dropped in Postgres < 17; they remain benign
```

Before deployment, run `npm run typecheck` and `npm run build` locally against a dev Supabase DB that ran 0004.

---

## 7. Backend — API Routes

All routes live under `src/app/api/day-off/`. JSON request/response. French error messages. Follow the same code shape as `src/app/api/leave/route.ts` and `.../leave/[id]/route.ts`.

### 7.1 Employee-accessible

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/day-off/me` | GET | User | Profile's `default_day_off` + the list of own `day_off_changes` (latest 20) |
| `/api/day-off` | POST | User | Submit a change request |
| `/api/day-off/[id]` | PATCH | User or Admin | Employee: cancel own pending; Admin: approve/reject/edit |
| `/api/day-off/[id]` | DELETE | Admin only | Hard delete (audit remains in `activity_logs`) |

### 7.2 Admin-only

| Route | Method | Purpose |
|---|---|---|
| `/api/day-off/all` | GET | All requests with `profiles` join; filter `?status`, `?user_id` |
| `/api/day-off/all` | POST | Admin assigns a change (auto-approved) |
| `/api/employees/[id]` | PATCH | *(existing route)* — accept new field `default_day_off` |
| `/api/admin/stats` | GET | *(existing route)* — add `pending_day_off_changes: number` |

### 7.3 Request/response shapes

#### `POST /api/day-off` (employee submit)

```json
// Request
{
  "target": "this_week" | "next_week",
  "new_day": "monday" | ... | "sunday",
  "reason": "Rendez-vous médical"   // optional
}

// 201 Response
{
  "id": "uuid",
  "user_id": "uuid",
  "iso_year": 2026,
  "iso_week": 17,
  "old_day": "sunday",
  "new_day": "wednesday",
  "status": "pending",
  "reason": "Rendez-vous médical",
  "admin_note": null,
  "created_at": "2026-04-22T...",
  "updated_at": "2026-04-22T..."
}
```

Server-side, `target: this_week|next_week` is resolved to `(iso_year, iso_week)` via `date-fns`'s `getISOWeek` / `getISOWeekYear` anchored to `Africa/Tunis`. **Do not** trust a client-supplied `iso_week` — derive it server-side to avoid bypassing BR-2.

`old_day` is computed server-side from the *current effective day off for that week* (which is `default_day_off` unless an earlier approved override exists; in that case the request replaces the earlier one — mark the earlier one `cancelled` in the same transaction).

#### `PATCH /api/day-off/[id]`

Branches by role (mirrors `src/app/api/leave/[id]/route.ts`):

- **Employee** on their own row with `status='pending'`: may set `status='cancelled'` only, or edit `new_day` / `reason` (stays pending).
- **Admin**: full freedom — `status` to any enum value, `admin_note`, `new_day`, `iso_year`, `iso_week`. Side-effects on attendance kick in if `status` transitions to/from `approved` (mirror `applyLeaveApproval` / `rollbackApprovedLeave` in [src/app/api/leave/[id]/route.ts](../src/app/api/leave/[id]/route.ts)).

#### `POST /api/day-off/all` (admin assign)

```json
{
  "user_id": "uuid",
  "target": "this_week" | "next_week" | { "iso_year": 2026, "iso_week": 17 },
  "new_day": "wednesday",
  "admin_note": "Accordé suite demande orale",
  "status": "approved"   // defaults to 'approved' for admin-assigned
}
```

Creates a row with `requested_by = actorId`, `reviewed_by = actorId`, `reviewed_at = now()`, then runs the approval side-effects if `status='approved'`.

### 7.4 Service vs. server client

Reads of *own* rows can use the server client (RLS lets the employee see their rows via `day_off_changes_select_own`). Any **admin** read or **any** mutation must use `createServiceClient()` after `requireAdmin()` (or the employee-self branch). This matches the pattern in `src/app/api/leave/[id]/route.ts`.

### 7.5 Helper module

Add `src/lib/day-off/` with:

- `weeks.ts`
  ```ts
  export function isoWeekForDate(d: Date): { iso_year: number; iso_week: number };
  export function datesOfISOWeek(y: number, w: number): { mon: Date; ...; sun: Date };
  export function dayOfWeekEnum(d: Date): DayOfWeek;  // 'monday'..'sunday'
  export function effectiveDayOff(profileDefault: DayOfWeek, overrides: DayOffChange[], y: number, w: number): DayOfWeek;
  ```
  All functions operate in `Africa/Tunis` via `date-fns-tz` just like the rest of the codebase.
- `attendance-sync.ts`
  ```ts
  // Idempotent helpers called from approve/reject/rollback
  export async function applyDayOffApproval(service, change, actorId): Promise<NextResponse | null>;
  export async function rollbackDayOffApproval(service, change): Promise<NextResponse | null>;
  ```

---

## 8. Validation Schemas

Add `src/lib/validation/day-off.ts`:

```ts
import { z } from 'zod';

export const dayOfWeek = z.enum([
  'monday','tuesday','wednesday','thursday','friday','saturday','sunday',
]);

export const dayOffChangeRequestSchema = z.object({
  target: z.enum(['this_week', 'next_week']),
  new_day: dayOfWeek,
  reason: z.string().max(500).nullable().optional(),
});

export const employeeDayOffUpdateSchema = z.object({
  status: z.literal('cancelled').optional(), // employee can only cancel
  new_day: dayOfWeek.optional(),
  reason: z.string().max(500).nullable().optional(),
});

export const adminDayOffSchema = z.object({
  user_id: z.string().uuid(),
  target: z.union([
    z.enum(['this_week', 'next_week']),
    z.object({ iso_year: z.number().int(), iso_week: z.number().int().min(1).max(53) }),
  ]),
  new_day: dayOfWeek,
  status: z.enum(['pending','approved','rejected','cancelled']).optional(),
  reason: z.string().nullable().optional(),
  admin_note: z.string().nullable().optional(),
});

export const adminDayOffUpdateSchema = adminDayOffSchema.partial();

export type DayOffChangeRequestInput = z.infer<typeof dayOffChangeRequestSchema>;
```

And extend `src/lib/validation/employee.ts`:

```ts
export const createEmployeeSchema = z.object({
  // ...existing...
  default_day_off: dayOfWeek.optional(), // defaults to 'sunday' server-side
});

export const updateEmployeeSchema = z.object({
  // ...existing...
  default_day_off: dayOfWeek.optional(),
});
```

---

## 9. Frontend — Employee UI

### 9.1 New nav item

Extend [src/components/shell/EmployeeNav.tsx](../src/components/shell/EmployeeNav.tsx) from 3 items to 4:

| Path | Label | Icon (lucide-react) |
|---|---|---|
| `/dashboard` | Tableau de bord | `Home` |
| `/history` | Historique | `Calendar` |
| `/leave` | Congés | `PalmTree` |
| `/day-off` | **Jour de repos** | `CalendarOff` |

Check the `BottomNavBar` primitive supports 4 items; if the icons get cramped, move `Historique` into the `Tableau de bord` page and keep 3 bottom items.

### 9.2 `/day-off` page

File: `src/app/(employee)/day-off/page.tsx` (Server Component). Shape mirrors `src/app/(employee)/leave/page.tsx`:

- Header: "Jour de repos"
- Card 1 — **Par défaut** : shows the weekday label (e.g. "Dimanche") read-only, with a note "Contactez votre administrateur pour modifier ce jour."
- Card 2 — **Cette semaine** : shows the effective day + label (`Approuvé` / `Par défaut` chip)
- Card 3 — **Semaine prochaine** : same
- Button **"Demander un changement"** → opens `DayOffChangeDialog`
- List of recent requests (status chip + pencil icon to cancel if pending)

Load data via `supabase.from('day_off_changes').select(...).eq('user_id', profile.id).order('created_at desc').limit(20)` and build effective days client-side using the `effectiveDayOff` helper.

### 9.3 `DayOffChangeDialog`

File: `src/components/day-off/DayOffChangeDialog.tsx`. Pattern-match on `LeaveRequestDialog.tsx`. Fields:

- `target` — segmented control: "Cette semaine" | "Semaine prochaine"
- `new_day` — `<select>` with the 7 weekdays (disable the current effective day)
- `reason` — `<textarea>`, optional, 500 chars

Submit `POST /api/day-off`. On 409 → toast the server message (already French). On success → push the new row into the parent's `requests` state and close.

### 9.4 Dashboard integration

On `/dashboard` (`src/app/(employee)/dashboard/page.tsx`), compute whether today is the effective day off. If yes:

- Replace `<TodayCard>`'s check-in button with a big static chip: **"Jour de repos — profitez-en 🌴"** (no emoji unless user explicitly wants it; keep a plain French label).
- Still show yesterday's check-out status if `forgot_checkout`.
- KPIs work unchanged since `day_off` rows count separately (see §11).

---

## 10. Frontend — Admin UI

### 10.1 Admin navigation

Extend [src/components/shell/AdminSidebar.tsx](../src/components/shell/AdminSidebar.tsx) and `AdminDrawer.tsx` with a new entry:

| Path | Label | Icon |
|---|---|---|
| `/admin/day-off` | **Jours de repos** | `CalendarOff` |

### 10.2 `/admin/day-off` page

File: `src/app/(admin)/admin/day-off/page.tsx` (Server Component). Fetches:

- `day_off_changes` joined with `profiles(id, full_name, email)`, all rows, ordered by `created_at desc`.
- The active employee list for the "Assigner" dialog.

Renders `<AdminDayOffTable initialRequests={...} employees={...} />`, copy/paste-adapted from [AdminLeaveTable.tsx](../src/components/leave/AdminLeaveTable.tsx). Columns:

| Employé | Semaine (ISO) | Ancien jour → Nouveau jour | Raison | Statut | Actions |

Status filter pills: Tous / En attente / Approuvé / Refusé / Annulé.

Row actions:

- **Approve** (✓) — green button on pending rows. Calls `PATCH /api/day-off/[id]` with `{status:'approved'}`.
- **Reject** (×) — red button. Opens a small inline prompt for `admin_note` (optional), then `PATCH /api/day-off/[id]` with `{status:'rejected', admin_note}`.
- **Edit** (pencil) — opens `AdminDayOffDialog` for any row.
- **Delete** (trash) — `DELETE /api/day-off/[id]`.

### 10.3 `AdminDayOffDialog`

File: `src/components/day-off/AdminDayOffDialog.tsx`. Mirrors `AdminLeaveDialog.tsx`. Fields:

- `user_id` (employee select)
- `target` (this/next or manual iso_year + iso_week — number inputs)
- `new_day` (select)
- `status` (select: pending / approved / rejected / cancelled)
- `admin_note` (textarea)

### 10.4 Employee create/edit form

Extend [src/components/admin/EmployeeFormDialog.tsx](../src/components/admin/EmployeeFormDialog.tsx) with a **"Jour de repos par défaut"** `<select>` between "Heure de départ" and "Solde congés". Default = `sunday` for new, pre-fill from `employee.default_day_off` when editing. Wire it through `createEmployeeSchema` / `updateEmployeeSchema` (§8).

### 10.5 Dashboard stat card

Extend `/api/admin/stats` response with `pending_day_off_changes` and add a small KPI to `AdminDashboardClient.tsx` next to "Congés en attente":

```tsx
<StatCard label="Changements de repos" value={stats.pending_day_off_changes} />
```

Also append an entry to the activity-log recent list so new request/approval events surface on the dashboard.

---

## 11. Interactions With Existing Features

### 11.1 Check-in / check-out

In `src/app/api/checkin/route.ts`, before the geofence check, load the profile's `default_day_off` and any approved override for the current ISO week:

```ts
const effective = effectiveDayOff(profile.default_day_off, overrides, isoYear, isoWeek);
if (effective === dayOfWeekEnum(now)) {
  return NextResponse.json(
    { code: 'day_off', error: "Aujourd'hui est votre jour de repos — pas de pointage nécessaire" },
    { status: 422 },
  );
}
```

Same guard in `src/app/api/checkout/route.ts` (edge case: employee checked in Saturday, then a last-minute approved override moved their day off to Sunday — the pending check-out is still valid, so only *block a new check-in*, not an ongoing check-out).

### 11.2 Attendance table

Approved overrides create attendance rows with `status='day_off'`. In the admin attendance view (`AttendanceTable.tsx`) and CSV export (`/api/reports/attendance.csv`), render `day_off` as "Repos" with a neutral chip.

### 11.3 "Absent" computation

Today the app never auto-creates `absent` rows — it lets the absence be *implicit* (no row = no check-in). That policy stays. But any rollup that counts "working days expected" (none today — future CSV refinement) must subtract the one day-off per ISO week.

### 11.4 Late-minutes calculation

No change. Late minutes only apply on days the employee is expected to work, and `day_off` rows never call `calcLateMinutes`.

### 11.5 Leave requests

If an employee has an approved **leave** on what would be their day off, the leave row wins and we do **not** also create a `day_off` attendance row for that date (BR-5 prevents overlap at request time; also enforce during approval — abort with 409 if the target date is already `leave`).

### 11.6 Forgot-checkout sweeper (future)

When the sweeper is built, it must skip `status='day_off'` rows.

---

## 12. Activity Logging

Emit an activity log entry on every mutation, via the existing `logActivity()` helper.

| Trigger | `action` | `details` payload |
|---|---|---|
| Employee submits | `request_day_off_change` | `{ change_id, iso_year, iso_week, old_day, new_day }` |
| Employee cancels | `cancel_day_off_change` | `{ change_id, from_status }` |
| Admin approves | `approve_day_off_change` | `{ change_id, iso_year, iso_week, new_day }` |
| Admin rejects | `reject_day_off_change` | `{ change_id, iso_year, iso_week, admin_note }` |
| Admin edits | `update_day_off_change` | `{ change_id, diff: {...} }` |
| Admin assigns (create as approved) | `assign_day_off_change` | `{ change_id, iso_year, iso_week, new_day }` |
| Admin deletes | `delete_day_off_change` | `{ change_id }` |
| Admin changes `default_day_off` on a profile | `update_default_day_off` | `{ target_user_id, from, to }` |

`actor_id` = whoever did the action; `target_user_id` = the employee whose schedule is affected.

---

## 13. i18n (French Strings)

Add to `messages/fr.json` (or wherever day-off labels live — if strings are inlined elsewhere in the app, match that convention):

```json
{
  "dayOff": {
    "title": "Jour de repos",
    "default": "Jour de repos par défaut",
    "thisWeek": "Cette semaine",
    "nextWeek": "Semaine prochaine",
    "effectiveLabel": "Jour effectif",
    "requestChange": "Demander un changement",
    "noRequests": "Aucune demande",
    "days": {
      "monday": "Lundi",
      "tuesday": "Mardi",
      "wednesday": "Mercredi",
      "thursday": "Jeudi",
      "friday": "Vendredi",
      "saturday": "Samedi",
      "sunday": "Dimanche"
    },
    "status": {
      "pending": "En attente",
      "approved": "Approuvé",
      "rejected": "Refusé",
      "cancelled": "Annulé"
    },
    "errors": {
      "sameDay": "Le jour choisi est déjà votre jour de repos",
      "pendingExists": "Une demande est déjà en attente pour cette semaine",
      "alreadyCheckedIn": "Vous avez déjà pointé aujourd'hui — le changement ne peut pas s'appliquer",
      "overlapLeave": "Vous avez déjà un congé approuvé cette semaine",
      "inactive": "Votre compte est inactif",
      "targetTooFar": "Les changements ne sont autorisés que pour cette semaine ou la suivante"
    },
    "checkinBlocked": "Aujourd'hui est votre jour de repos — pas de pointage nécessaire"
  }
}
```

---

## 14. Edge Cases & Failure Modes

| # | Scenario | Expected behaviour |
|---|---|---|
| EC-1 | Employee submits for this-week after having already checked in today, requesting *today* as new day off | 409 with `alreadyCheckedIn`. Idea: admin can still edit attendance to `day_off` manually, but the auto-flow refuses. |
| EC-2 | Two approved overrides for the same week (shouldn't happen — unique index) | DB throws; API returns 500 with generic message. Log enough detail to diagnose. |
| EC-3 | Admin approves but an attendance row already exists with `check_in_at IS NOT NULL` on the new day | Abort, 409 `"Pointage existant — modifiez la présence avant d'approuver"`. |
| EC-4 | ISO-year edge: request submitted Dec 30 2026 (ISO week 53 of 2026) targeting "next week" (ISO week 1 of 2027) | `getISOWeekYear(today + 7)` returns 2027; stored correctly. UI week label shows "S01 2027". |
| EC-5 | Employee with `is_active=false` tries `POST /api/day-off` | 403 `inactive`. |
| EC-6 | Admin changes `default_day_off` while there's a pending request for this week | No cascade. Pending request is evaluated against the day-off *at approval time*; if BR-3 is now violated (new_day == default), the admin will see 422 on approve. This is acceptable and explicit. |
| EC-7 | Approved override exists; employee then deletes the pending leave that overlaps | No effect — override was valid when approved and stays approved. |
| EC-8 | Clock skew between client browser and server for "this week" resolution | Always compute `iso_year/iso_week` server-side from `now()` in `Africa/Tunis`. Never trust client timestamps. |
| EC-9 | Employee is created mid-week with default_day_off='monday' and today is Tuesday | No retroactive attendance row for yesterday's Monday. Policy: day-off is forward-looking only (mirrors BR-8). |
| EC-10 | Admin rejects then later approves the same request | Allowed. Approval side-effects run once. Log both transitions in activity_logs. |

---

## 15. Security & RLS

- `day_off_changes` has a single SELECT policy (`day_off_changes_select_own`). All writes go through API routes using `createServiceClient()` after authenticating the actor. This matches the existing pattern for `leave_requests`.
- `profiles.default_day_off` is readable via the existing `profiles_select_own` policy — each employee sees *only their own* default. Admins read all via service-role API routes.
- No new RPC functions are needed. Balance-style atomic operations aren't required here because we're not decrementing a counter.
- Input validation: always parse body with the zod schemas; never trust `iso_year`/`iso_week`/`old_day` from the client.

---

## 16. Rollout & Testing

### Manual test matrix

| # | Actor | Action | Expected |
|---|---|---|---|
| T1 | Admin | Run migration 0004 | Migration succeeds; existing employees have `default_day_off = 'sunday'`. |
| T2 | Admin | Create employee with `default_day_off='friday'` | Profile row has `'friday'`; activity log entry. |
| T3 | Employee | Open `/day-off` on a non-Friday | Sees "Vendredi" as this-week and next-week effective day. |
| T3b | Existing employee (pre-migration) | Open `/day-off` | Default shows "Samedi" (migration back-fill). |
| T4 | Employee | Submit change: next week, Wednesday | Row in `day_off_changes` with status `pending`, `old_day='friday'`, `new_day='wednesday'`. Dashboard badge +1 for admin. |
| T5 | Admin | Approve | Attendance row inserted for next Wednesday with `status='day_off'`. Employee dashboard for that day blocks check-in. |
| T6 | Employee | Try to check in on that Wednesday | 422 `day_off`. |
| T7 | Employee | Submit a second change for the same week | 409 `pendingExists`. |
| T8 | Employee | Cancel the existing pending | Status → `cancelled`. Can now submit again. |
| T9 | Admin | Reject a request with note | Status → `rejected`, `admin_note` saved, no attendance change. |
| T10 | Admin | Assign override directly (auto-approved) via `AdminDayOffDialog` | Row created with `status='approved'`, both `requested_by` and `reviewed_by` = admin id. |
| T11 | Admin | Delete an approved request | Attendance rollback runs; request row removed; activity log entry. |
| T12 | Employee | Check in on their default day-off (without any approved override) | 422 `day_off`. |
| T13 | Edge year boundary (Dec 28, 2026 → ISO week 53; Jan 2, 2027 → ISO week 1) | Both resolved correctly. |

### Automated

No test framework is currently configured in this repo. If one is added later, prioritise unit tests on:

- `effectiveDayOff()` (pure function, easiest win)
- `isoWeekForDate()` around year boundaries
- The approve/rollback transitions in `attendance-sync.ts`

Until then, run `npm run typecheck` and `npm run lint` — the TypeScript contract and zod schemas are the safety net.

### Deploy order

1. Merge the migration `0004_day_off.sql` and run it in Supabase (dev → prod).
2. Deploy the Next.js build **after** the migration is live in the target env — the new code references `default_day_off` and will 500 if the column is missing.
3. Keep the feature flag-free; low enough blast radius that staged rollout isn't needed. Monitor activity logs and the dashboard pending-count for sanity.

---

## 17. Out of Scope / Future Work

- **Half-day off** (e.g. morning off, afternoon work). Would need `attendance` partitioning or a new `half_day_off` status.
- **Team-level rules** (e.g. at most 1 employee off per day). Requires capacity planning — talk to product before designing.
- **Recurring pattern changes** (e.g. "Sunday off in summer, Friday off in winter"). Layer on top once we see real usage patterns.
- **Employee-initiated swaps** (Alice trades her Sunday for Bob's Thursday). Significantly more workflow; defer.
- **Calendar sync / notifications**. Admin currently polls the dashboard every 60s via SWR — that's the notification channel for v1.
- **Public holidays** on top of day-off. `attendance_status` already has a `'holiday'` enum value; a future feature can treat holidays as org-wide overrides of the day-off logic.

---

## 18. Implementation Checklist

Tackle in this order to keep each PR small and shippable:

### PR 1 — Schema & types

- [ ] `supabase/migrations/0004_day_off.sql` (§6)
- [ ] Update `src/types/index.ts`: `AttendanceStatus` adds `'day_off'`; `ActivityAction` gains 8 new values; add `DayOfWeek`, `DayOffChange`, `DayOffChangeStatus` types; extend `Profile` with `default_day_off`.
- [ ] `npm run typecheck` green.

### PR 2 — Backend (admin-less path)

- [ ] `src/lib/day-off/weeks.ts` (pure helpers)
- [ ] `src/lib/validation/day-off.ts`
- [ ] `/api/day-off/me` GET, `/api/day-off` POST, `/api/day-off/[id]` PATCH (employee branch only for now)
- [ ] Extend `/api/checkin` and `/api/checkout` with the day-off guard (§11.1)

### PR 3 — Backend (admin) + attendance sync

- [ ] `src/lib/day-off/attendance-sync.ts`
- [ ] Admin branch of `/api/day-off/[id]` PATCH + DELETE
- [ ] `/api/day-off/all` GET & POST
- [ ] Extend `/api/admin/stats` with `pending_day_off_changes`
- [ ] Extend `/api/employees` POST & `/api/employees/[id]` PATCH to accept `default_day_off`

### PR 4 — Employee UI

- [ ] Nav item in `EmployeeNav.tsx`
- [ ] `src/app/(employee)/day-off/page.tsx` + loading skeleton
- [ ] `src/components/day-off/DayOffChangeDialog.tsx`
- [ ] Dashboard check-in button swap on day-off (§9.4)

### PR 5 — Admin UI

- [ ] Nav item in sidebar + drawer
- [ ] `src/app/(admin)/admin/day-off/page.tsx`
- [ ] `src/components/day-off/AdminDayOffTable.tsx` + `AdminDayOffDialog.tsx`
- [ ] `default_day_off` select in `EmployeeFormDialog.tsx`
- [ ] KPI card + badge on `AdminDashboardClient.tsx`

### PR 6 — Polish

- [ ] Activity-log recent-activity formatting for the 8 new actions (`src/components/admin/LogsClient.tsx` and `AdminDashboardClient.tsx` recent list)
- [ ] i18n strings (§13)
- [ ] Manual test-matrix pass (§16)

---

**End of specification.** If any rule here conflicts with an existing decision in [HANDOFF.md](../HANDOFF.md) or [docs/WORKFLOWS.md](WORKFLOWS.md), the existing doc wins — update this spec before implementing.
