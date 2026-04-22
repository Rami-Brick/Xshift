# Xshift — Complete AI Handoff Document

> **Purpose:** This document enables an AI agent (or developer) to fully understand the Xshift codebase, pick up work where it left off, and continue development without regressions.

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [Tech Stack & Locked Decisions](#2-tech-stack--locked-decisions)
3. [Repository Structure](#3-repository-structure)
4. [Database Schema](#4-database-schema)
5. [Authentication & Security Model](#5-authentication--security-model)
6. [Business Logic](#6-business-logic)
7. [API Routes](#7-api-routes)
8. [Pages & Layouts](#8-pages--layouts)
9. [Components](#9-components)
10. [Design System](#10-design-system)
11. [Library Utilities](#11-library-utilities)
12. [Type Definitions](#12-type-definitions)
13. [Environment & Deployment](#13-environment--deployment)
14. [Current Build Status](#14-current-build-status)
15. [Known Gaps & Next Steps](#15-known-gaps--next-steps)
16. [Critical Gotchas](#16-critical-gotchas)

---

## 1. Project Summary

**Xshift** is a French-language employee attendance and leave management PWA. It is production-ready for deployment on Vercel + Supabase.

### What it does

| Actor | Capabilities |
|---|---|
| **Employee** | Check in/out (GPS-validated), view today's status, browse monthly history, request leave, see leave balance |
| **Admin** | All employee features + manage employees (create/edit/deactivate), manually edit attendance records, review/approve/reject leave, configure office geofence & work times, view activity logs, export CSV reports |

### Scale

- Designed for ~4 employees (no pagination pressure, no TanStack Query overhead)
- Single office location, `Africa/Tunis` timezone, 7-day workweek
- French-only UI (`next-intl`, `messages/fr.json`)
- First admin created manually in Supabase dashboard; employees created by admin with temporary passwords

---

## 2. Tech Stack & Locked Decisions

| Area | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript | No Pages Router |
| Styling | Tailwind v4 CSS-first via `@theme` in `globals.css` | No `tailwind.config.ts` |
| Database | Supabase (PostgreSQL + Auth + RLS) | EU region recommended |
| Data fetching | Native `fetch` in Server Components + Route Handlers | `useSWR` only on admin dashboard (60s polling) |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers` | |
| Auth | Email + password (`signInWithPassword`) | No magic link, no OAuth |
| GPS | `navigator.geolocation` (browser API) | `enableHighAccuracy: true, timeout: 10000` |
| Maps | Leaflet (client-only, `next/dynamic` with `ssr:false`) | OSM tiles |
| i18n | `next-intl`, French-only | `messages/fr.json` |
| Timezone | `Africa/Tunis` via `date-fns-tz` | All date math goes through this |
| PWA | Installable, online-only | SVG placeholder logo |
| Deployment | Vercel | `outputFileTracingRoot` set in `next.config.ts` |
| Design kit | Local `./design-kit/` directory | 13 primitives + 11 compounds |

### What NOT to change without good reason

- Do not add `tailwind.config.ts` — Tailwind v4 reads from `globals.css` `@theme` block
- Do not add TanStack Query — scale doesn't justify it
- Do not switch to magic-link auth — deliberately email+password
- Do not add multi-office support — single office, single `office_settings` row
- Do not use the Supabase browser client for admin mutations — always use `createServiceClient()` (service role) to bypass RLS

---

## 3. Repository Structure

```
XshiftClaude/
├── design-kit/                    # Local design system (do not publish)
│   ├── primitives/                # 13 base components
│   ├── compounds/                 # 11 composed components
│   ├── tokens/                    # colors.ts, typography.ts, etc.
│   ├── utils/                     # cn.ts, formatters.ts, squircle.ts
│   ├── examples/                  # Reference screens (do not import in app)
│   ├── catalog/                   # Component documentation
│   ├── index.ts                   # Barrel export
│   └── CLAUDE.md                  # Design-kit rules for AI agents
├── docs/                          # Product documentation
├── messages/
│   └── fr.json                    # All French UI strings
├── public/
│   ├── icons/                     # PWA icons (svg + maskable)
│   └── manifest.webmanifest       # PWA manifest
├── supabase/
│   └── migrations/
│       ├── 0001_init.sql          # Full schema + RLS + triggers
│       ├── 0002_seed.sql          # office_settings seed row
│       └── 0003_functions.sql     # decrement_leave_balance RPC
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Login page + server action
│   │   ├── (admin)/admin/         # All admin pages
│   │   ├── (employee)/            # Employee pages (dashboard, history, leave)
│   │   ├── api/                   # API route handlers
│   │   ├── error.tsx              # Global error boundary
│   │   ├── not-found.tsx          # 404 page
│   │   ├── globals.css            # Tailwind v4 + all design tokens
│   │   ├── layout.tsx             # Root layout (fonts, metadata, providers)
│   │   └── providers.tsx          # Client providers (sonner, next-intl)
│   ├── components/
│   │   ├── attendance/            # CheckInButton, TodayCard, MonthFilter
│   │   ├── leave/                 # LeavePageClient, LeaveRequestDialog,
│   │   │                          #   AdminLeaveTable, AdminLeaveDialog
│   │   ├── admin/                 # All admin UI components
│   │   └── shell/                 # Nav, Sidebar, Drawer, Headers
│   ├── lib/
│   │   ├── supabase/              # browser.ts, server.ts, service.ts, middleware.ts
│   │   ├── auth/                  # guards.ts, actions.ts
│   │   ├── attendance/            # geo.ts, status.ts
│   │   ├── activity/              # log.ts
│   │   ├── validation/            # auth.ts, attendance.ts, employee.ts, leave.ts, settings.ts
│   │   ├── i18n/                  # request.ts (next-intl config)
│   │   └── utils/                 # date.ts, cn.ts
│   ├── middleware.ts              # Session refresh + route protection
│   └── types/
│       └── index.ts               # All TypeScript domain types
├── next.config.ts
├── package.json
├── tsconfig.json
└── HANDOFF.md                     # This file
```

---

## 4. Database Schema

### Overview (5 tables + enums + triggers)

Run order: `0001_init.sql` → `0002_seed.sql` → `0003_functions.sql`

### Enums

```sql
user_role:        'employee' | 'admin'
attendance_status:'present' | 'late' | 'absent' | 'leave' | 'holiday'
leave_type:       'annual' | 'sick' | 'unpaid' | 'other'
leave_status:     'pending' | 'approved' | 'rejected' | 'cancelled'
activity_action:  'checkin' | 'checkout' | 'create_employee' | 'update_employee' |
                  'deactivate_employee' | 'update_attendance' | 'manual_attendance' |
                  'delete_attendance' | 'request_leave' | 'approve_leave' |
                  'reject_leave' | 'cancel_leave' | 'assign_leave' | 'update_leave' |
                  'delete_leave' | 'update_settings' | 'login'
```

### Table: `public.profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | References `auth.users(id)` ON DELETE CASCADE |
| `full_name` | text NOT NULL | |
| `email` | text UNIQUE NOT NULL | |
| `phone` | text | |
| `position` | text | Job title |
| `department` | text | |
| `role` | user_role DEFAULT 'employee' | |
| `work_start_time` | time NOT NULL DEFAULT '08:30' | Per-employee schedule |
| `work_end_time` | time NOT NULL DEFAULT '17:30' | |
| `leave_balance` | numeric(6,2) NOT NULL DEFAULT 0 CHECK >= 0 | Days remaining |
| `is_active` | boolean NOT NULL DEFAULT true | Soft-delete flag |
| `avatar_url` | text | |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | Auto-updated by trigger |

**RLS:** `profiles_select_own` — `auth.uid() = id`

**Trigger:** `handle_new_user()` in `app_private` schema — auto-creates profile on `auth.users` INSERT, reading role from `raw_app_meta_data->>'role'`

### Table: `public.attendance`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL FK → profiles | |
| `date` | date NOT NULL | Local date in Africa/Tunis |
| `check_in_at` | timestamptz | UTC timestamp |
| `check_out_at` | timestamptz | CHECK >= check_in_at |
| `status` | attendance_status NOT NULL DEFAULT 'present' | |
| `late_minutes` | int NOT NULL DEFAULT 0 CHECK >= 0 | |
| `forgot_checkout` | boolean NOT NULL DEFAULT false | Precomputed flag |
| `check_in_latitude` | float8 | |
| `check_in_longitude` | float8 | |
| `check_in_accuracy_meters` | float8 CHECK >= 0 | |
| `check_out_latitude` | float8 | |
| `check_out_longitude` | float8 | |
| `check_out_accuracy_meters` | float8 CHECK >= 0 | |
| `check_in_distance_meters` | integer CHECK >= 0 | Meters from office |
| `check_out_distance_meters` | integer CHECK >= 0 | |
| `note` | text | Admin note |
| `created_by` | uuid FK → profiles | NULL = system/employee self |
| `updated_by` | uuid FK → profiles | |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | Auto-updated |

**UNIQUE:** `(user_id, date)` — one record per person per day, upserted on check-in

**RLS:** `attendance_select_own` — `auth.uid() = user_id`

**Indexes:** `(user_id, date DESC)`, `(date DESC)`, `(status)`, partial `(forgot_checkout) WHERE forgot_checkout = true`

### Table: `public.leave_requests`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL FK → profiles | Requester |
| `start_date` | date NOT NULL | |
| `end_date` | date NOT NULL CHECK >= start_date | |
| `type` | leave_type NOT NULL | |
| `status` | leave_status NOT NULL DEFAULT 'pending' | |
| `reason` | text | Employee-provided |
| `admin_note` | text | Admin-provided on review |
| `requested_by` | uuid FK → profiles | NULL = self-submitted |
| `reviewed_by` | uuid FK → profiles | Admin who acted |
| `reviewed_at` | timestamptz | |
| `deduct_balance` | boolean NOT NULL DEFAULT true | Whether to subtract leave_balance |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

**RLS:** `leave_requests_select_own` — `auth.uid() = user_id`

### Table: `public.office_settings` (singleton)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Only one row |
| `office_name` | text NOT NULL DEFAULT 'Bureau principal' | |
| `company_name` | text NOT NULL DEFAULT 'Xshift' | |
| `logo_url` | text | |
| `office_latitude` | float8 NOT NULL | Tunis placeholder: 36.8190 |
| `office_longitude` | float8 NOT NULL | Tunis placeholder: 10.1658 |
| `allowed_radius_meters` | int NOT NULL DEFAULT 200 CHECK > 0 | Geofence radius |
| `gps_accuracy_limit_meters` | int NOT NULL DEFAULT 100 CHECK > 0 | Reject if accuracy worse |
| `grace_period_minutes` | int NOT NULL DEFAULT 10 CHECK 0-60 | Late grace window |
| `forgot_checkout_cutoff_time` | time NOT NULL DEFAULT '23:00' | Flag at this time if no checkout |
| `default_work_start_time` | time NOT NULL DEFAULT '08:30' | Applied to new employees |
| `default_work_end_time` | time NOT NULL DEFAULT '17:30' | |
| `timezone` | text NOT NULL DEFAULT 'Africa/Tunis' | |
| `updated_by` | uuid FK → profiles | |
| `created_at` | timestamptz DEFAULT now() | |
| `updated_at` | timestamptz DEFAULT now() | |

**RLS:** `office_settings_select_authenticated` — all authenticated users can read (admins write via service role)

### Table: `public.activity_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `actor_id` | uuid FK → profiles | Who performed the action |
| `action` | activity_action NOT NULL | Enum of all logged actions |
| `target_user_id` | uuid FK → profiles | Affected user (nullable) |
| `details` | jsonb NOT NULL DEFAULT '{}' | Before/after, context |
| `created_at` | timestamptz DEFAULT now() | |

**RLS:** Admin-only read via service role (no employee RLS policy = employees cannot read)

**Indexes:** `(created_at DESC)`, `(actor_id)`, `(target_user_id)`

### Functions

```sql
-- Auto-updates updated_at on any table with trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql ...

-- Called on auth.users INSERT — creates profile row
-- Uses ON CONFLICT (id) DO NOTHING so the app-level upsert in /api/employees can
-- overwrite the sparse trigger row with the full admin-provided data.
CREATE OR REPLACE FUNCTION app_private.handle_new_user()
RETURNS TRIGGER SECURITY DEFINER SET search_path = '' ...

-- Atomically decrements leave_balance, floors at 0.
-- EXECUTE is revoked from public/anon/authenticated — only service_role can call it.
-- Callers in the app always use createServiceClient(), which runs as service_role.
CREATE OR REPLACE FUNCTION public.decrement_leave_balance(p_user_id uuid, p_days int)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' ...

REVOKE EXECUTE ON FUNCTION public.decrement_leave_balance(uuid, int) FROM public, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.decrement_leave_balance(uuid, int) TO service_role;
```

---

## 5. Authentication & Security Model

### Login Flow

```
User → POST /login (email + password)
  └── loginAction (server action)
        ├── Validate with loginSchema (zod)
        ├── supabase.auth.signInWithPassword()
        ├── Fetch profile → check is_active
        ├── Admin? → redirect('/admin/dashboard')
        └── Employee? → redirect('/dashboard')
```

### Middleware

`src/middleware.ts` runs on every request (except static assets):
- Calls `updateSession(request)` from `src/lib/supabase/middleware.ts`
- This refreshes Supabase session cookies (critical for SSR)
- Redirects unauthenticated users to `/login`
- Does NOT do role checks (done in layouts)

**Excluded paths:** `/_next`, `/icons`, `/favicon.svg`, `/manifest.webmanifest`, `/api`

### Guard Functions

```typescript
// src/lib/auth/guards.ts (server-only)
requireUser()  → { userId: string, profile: Profile }
requireAdmin() → { userId: string, profile: Profile }
```

Both redirect to `/login` if unauthenticated. `requireAdmin()` additionally redirects to `/dashboard` if role is not `'admin'`.

### Supabase Client Tiers

| Client | File | Use Case | Permissions |
|---|---|---|---|
| Browser client | `lib/supabase/browser.ts` | Client components | User-scoped (RLS applies) |
| Server client | `lib/supabase/server.ts` | Server components, server actions | User-scoped (RLS applies) |
| Service client | `lib/supabase/service.ts` | API routes for admin mutations | Full access (bypasses RLS) |
| Middleware client | `lib/supabase/middleware.ts` | Middleware only | Session refresh only |

**Rule:** Never use `createServiceClient()` in client components or without admin verification. Always call `requireAdmin()` first in any API route that uses the service client.

### RLS Summary

| Table | Employee access | Admin access |
|---|---|---|
| `profiles` | Read own row only | Full via service client |
| `attendance` | Read own rows only | Full via service client |
| `leave_requests` | Read own rows only | Full via service client |
| `office_settings` | Read (all authenticated) | Write via service client |
| `activity_logs` | No access | Full via service client |

---

## 6. Business Logic

### Check-in Logic (`/api/checkin`)

```
1. Validate auth (getUser)
2. Parse & validate body: { latitude, longitude, accuracy } — must be finite numbers
3. Fetch office_settings + profile (work_start_time only) in parallel
   ⚠ grace_period_minutes comes from office_settings, NOT profiles — profiles has no such column
4. Reject if accuracy > office_settings.gps_accuracy_limit_meters → 422
5. Calculate haversineDistance(userLat, userLon, officeLat, officeLon)
6. Reject if distance > office_settings.allowed_radius_meters → 422
7. Check for existing check-in today → 409 if duplicate
8. Calculate late_minutes:
     calcLateMinutes(profile.work_start_time, settings.grace_period_minutes, now)
     → Returns 0 if within grace period, else minutes past start_time
9. resolveStatus(late_minutes) → 'present' or 'late'
10. UPSERT attendance (user_id, date) with check_in_at, status, late_minutes, GPS data
11. logActivity('checkin', actorId, targetUserId=actorId, details)
12. Return { success: true, status, late_minutes }
```

### Check-out Logic (`/api/checkout`)

```
1. Validate auth
2. Validate GPS body
3. Fetch office_settings + today's attendance record in parallel
4. Reject if no check_in_at → 422 "point d'arrivée d'abord"
5. Reject if check_out_at already set → 409
6. GPS accuracy + geofence checks (same as check-in)
7. UPDATE attendance with check_out_at + checkout GPS data + forgot_checkout=false
8. logActivity('checkout', ...)
9. Return { success: true }
```

### Late Calculation

```typescript
// src/lib/attendance/status.ts
calcLateMinutes(workStartTime: string, gracePeriodMinutes: number, now: Date): number
// workStartTime: "08:30" (HH:mm, in Africa/Tunis)
// Converts now to Africa/Tunis, compares to workStartTime
// Returns 0 if diff <= gracePeriodMinutes
// Otherwise returns total minutes late (including grace period span)
```

### Leave Approval Logic (`/api/leave/[id]` PATCH)

```
1. Validate admin auth
2. Parse reviewLeaveSchema: { status, admin_note?, deduct_balance? }
3. UPDATE leave_requests.status + reviewed_by + reviewed_at
4. If status === 'approved':
   a. Generate all dates between start_date and end_date (eachDayOfInterval)
   b. UPSERT attendance rows for each date with status='leave'
   c. If deduct_balance=true: call RPC decrement_leave_balance(user_id, days)
5. logActivity('approve_leave' | 'reject_leave' | 'cancel_leave')
```

### Forgot Checkout Detection

The `forgot_checkout` column is a precomputed flag on attendance rows. **The flag is not automatically set by the app currently** — it's stored so admins can identify forgotten checkouts without recomputing. A cron job or admin action would be needed to set this flag at `forgot_checkout_cutoff_time` for rows where `check_in_at IS NOT NULL AND check_out_at IS NULL`. This is a **known gap** (see Section 15).

### Admin Stats (`/api/admin/stats`)

Polled every 60 seconds by the admin dashboard via `useSWR`. Returns:
```json
{
  "total_active": 4,
  "today": { "present": 3, "late": 1, "absent": 0, "leave": 0 },
  "month": { "present": 45, "late": 5, "absent": 2 },
  "pending_leave": 1,
  "recent_activity": [{ "id", "action", "created_at", "actor": { "full_name" } }]
}
```

---

## 7. API Routes

All routes live under `src/app/api/`. All return JSON.

### Employee-accessible

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/checkin` | POST | User | GPS check-in |
| `/api/checkout` | POST | User | GPS check-out |
| `/api/attendance/me` | GET | User | Own attendance records, `?start=&end=` |
| `/api/leave` | GET | User | Own leave requests |
| `/api/leave` | POST | User | Submit leave request |

### Admin-only

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/employees` | GET | Admin | List all employees, `?q=search&active=true` |
| `/api/employees` | POST | Admin | Create employee (auth + profile) |
| `/api/employees/[id]` | GET | Admin | Get single employee |
| `/api/employees/[id]` | PATCH | Admin | Update employee fields |
| `/api/employees/[id]` | DELETE | Admin | Soft-delete (sets is_active=false) |
| `/api/attendance/all` | GET | Admin | All attendance, `?user_id&status&start&end` (limit 200) |
| `/api/attendance/all` | POST | Admin | Manual attendance upsert |
| `/api/attendance/[id]` | PATCH | Admin | Edit attendance record |
| `/api/attendance/[id]` | DELETE | Admin | Delete attendance record |
| `/api/leave/all` | GET | Admin | All leave requests, `?user_id&status` |
| `/api/leave/all` | POST | Admin | Admin-assign leave (auto-approved) |
| `/api/leave/[id]` | PATCH | Admin | Review leave (approve/reject/cancel) |
| `/api/leave/[id]` | DELETE | Admin | Delete leave request |
| `/api/settings` | GET | Admin | Fetch office_settings |
| `/api/settings` | PUT | Admin | Update office_settings |
| `/api/admin/stats` | GET | Admin | Dashboard stats (SWR-polled) |
| `/api/logs` | GET | Admin | Activity logs, paginated `?page=1` (50/page) |
| `/api/reports/attendance.csv` | GET | Admin | CSV export, same filters as attendance/all |

### Error Response Format

```json
{ "error": "French error message" }
```

Status codes: `401` (unauthenticated), `404` (not found), `409` (conflict/duplicate), `422` (validation/business rule), `500` (server error)

---

## 8. Pages & Layouts

### Route Groups

```
(auth)/              → No shell (login page only)
(employee)/          → EmployeeNav (BottomNavBar) + mobile-first layout
(admin)/admin/       → AdminSidebar (desktop) or AdminDrawer (mobile)
```

### Employee Pages

| Route | File | Type | Description |
|---|---|---|---|
| `/dashboard` | `(employee)/dashboard/page.tsx` | Server | Today's card + KPIs + recent records |
| `/history` | `(employee)/history/page.tsx` | Server | Monthly attendance with MonthFilter |
| `/leave` | `(employee)/leave/page.tsx` | Server | Leave balance + request list + dialog |

All employee pages have `loading.tsx` skeletons.

### Admin Pages

| Route | File | Type | Description |
|---|---|---|---|
| `/admin/dashboard` | `admin/dashboard/page.tsx` | Server→Client | SWR-polled KPIs + recent activity |
| `/admin/employees` | `admin/employees/page.tsx` | Server | Employee list (EmployeeList client) |
| `/admin/employees/[id]` | `admin/employees/[id]/page.tsx` | Server | Employee detail + attendance + actions |
| `/admin/attendance` | `admin/attendance/page.tsx` | Server | Filtered attendance table (AttendanceTable client) |
| `/admin/leave` | `admin/leave/page.tsx` | Server | All leave requests (AdminLeaveTable client) |
| `/admin/reports` | `admin/reports/page.tsx` | Server | CSV export UI (ReportsClient) |
| `/admin/settings` | `admin/settings/page.tsx` | Server | Settings form (SettingsForm client + MapPreview) |
| `/admin/logs` | `admin/logs/page.tsx` | Server | Activity log viewer (LogsClient) |

Admin attendance + employees + leave pages have `loading.tsx` skeletons.

### Shell Architecture

```
Employee layout:
  └── Fixed bottom: <EmployeeNav> (BottomNavBar from design-kit, 3 items)
      ├── /dashboard  → "Tableau de bord"
      ├── /history    → "Historique"
      └── /leave      → "Congés"

Admin layout (desktop, ≥ md):
  └── flex-row: <AdminSidebar> + <main>
      AdminSidebar uses SideNavRail from design-kit (7 items + logout)

Admin layout (mobile, < md):
  └── <AdminMobileHeader> (hamburger) + <main>
      Hamburger opens <AdminDrawer> (slide-in, backdrop click to close)
```

---

## 9. Components

### Attendance Components (`src/components/attendance/`)

#### `CheckInButton.tsx` — Client
```typescript
interface CheckInButtonProps {
  today: Attendance | null;
  onSuccess: () => void;
}
```
- Phase state: `'idle' | 'locating' | 'submitting'`
- On idle: shows "Pointer l'arrivée" (LogIn icon) or "Pointer le départ" (LogOut icon)
- On done (both timestamps): shows "Journée terminée" static state
- GPS flow: `navigator.geolocation.getCurrentPosition` → POST `/api/checkin` or `/api/checkout`
- French error toasts for all GPS failure modes

#### `TodayCard.tsx` — Client
```typescript
interface TodayCardProps {
  initialToday: Attendance | null;
}
```
- Holds `today` state (initialized from server prop, refreshed after check-in/out)
- Shows: status Chip, Arrivée time, Départ time, late minutes, forgot_checkout warning
- Refresh: `GET /api/attendance/me?start=TODAY&end=TODAY` + `router.refresh()`
- Contains `<CheckInButton>`

#### `MonthFilter.tsx` — Client
```typescript
interface MonthFilterProps {
  options: Array<{ label: string; value: string }>; // value = 'yyyy-MM'
  selected: string; // 'yyyy-MM'
}
```
- Native `<select>` styled as a pill
- On change: `router.push('/history?month=VALUE')`
- History page reads `searchParams.month` server-side

### Leave Components (`src/components/leave/`)

#### `LeavePageClient.tsx` — Client
- Manages `requests` state + `showForm` toggle
- Displays leave balance card + list of LeaveRequest rows
- Opens `LeaveRequestDialog` on "Demander" click

#### `LeaveRequestDialog.tsx` — Client
- React Hook Form + zod (`leaveRequestSchema`)
- Fields: type (select), start_date, end_date, reason (textarea)
- Posts to `POST /api/leave`

#### `AdminLeaveTable.tsx` — Client
- Filter tabs: all / pending / approved / rejected / cancelled
- Table: employee name, type, date range, duration, status chip, action buttons
- "Assigner un congé" opens `AdminLeaveDialog`
- Approve: `PATCH /api/leave/[id]` with `{status:'approved', deduct_balance:true}`
- Reject: `PATCH /api/leave/[id]` with `{status:'rejected'}`
- Delete: `DELETE /api/leave/[id]`

#### `AdminLeaveDialog.tsx` — Client
- Admin creates leave for any employee
- Uses `adminLeaveSchema`
- Posts to `POST /api/leave/all`
- Fields: user_id (dropdown), type, dates, status, admin_note, deduct_balance checkbox

### Admin Components (`src/components/admin/`)

#### `EmployeeList.tsx` — Client
- Client-side search filter on name/email/department/position
- Calls `POST /api/employees` for new employees
- Links to `/admin/employees/[id]` for each row
- `handleCreated(profile)` inserts new profile into local state and re-sorts

#### `EmployeeFormDialog.tsx` — Client
```typescript
// Create mode
interface CreateProps { employee?: undefined; onClose(); onSuccess(profile: Profile) }
// Edit mode
interface EditProps { employee: Profile; onClose(); onSuccess(profile: Profile) }
```
- Uses `createEmployeeSchema` (POST) or `updateEmployeeSchema` (PATCH)
- Password field only shown in create mode
- Email field only shown in create mode
- `is_active` checkbox only shown in edit mode
- Escape key closes dialog

#### `EmployeeDetailActions.tsx` — Client
- "Modifier" button → opens `EmployeeFormDialog` in edit mode
- "Désactiver" button → first click sets `confirming=true` (shows "Confirmer?"), second click calls `DELETE /api/employees/[id]` then redirects to `/admin/employees`
- After edit: `router.refresh()` to re-fetch server data

#### `AttendanceTable.tsx` — Client
- Filters: start/end date, employee dropdown, status dropdown
- Filter changes call `GET /api/attendance/all` client-side and update state
- Edit: opens `AttendanceEditDialog`
- Delete: two-click confirm → `DELETE /api/attendance/[id]`
- "Ajouter" opens dialog in create mode

#### `AttendanceEditDialog.tsx` — Client
- Create mode (record=null): shows user_id dropdown + date field
- Edit mode: shows only editable fields (status, times, late_minutes, note)
- Uses `PATCH /api/attendance/[id]` (edit) or `POST /api/attendance/all` (create)
- `datetime-local` inputs; converts to UTC ISO before sending

#### `AdminDashboardClient.tsx` — Client
- `useSWR('/api/admin/stats', fetcher, { refreshInterval: 60_000 })`
- Shows 4 KpiCards (present, late, absent, pending leave)
- Shows 3 month summary cards
- Shows recent activity list (5 items)
- Skeleton loading while `isLoading`

#### `LogsClient.tsx` — Client
- Fetches `GET /api/logs?page=N` on mount and page change
- Paginated (50/page), newest first
- Displays: action label (French), actor name, target name, timestamp
- Prev/Next buttons

#### `SettingsForm.tsx` — Client
- React Hook Form + `settingsSchema`
- "Capturer ma position" button → `navigator.geolocation` → fills lat/lon fields
- `watch()` on lat/lon/radius → passes to `MapPreview` for live update
- `PUT /api/settings` on submit
- Save button disabled when form not dirty

#### `MapPreview.tsx` — Client (ssr:false)
```typescript
interface Props {
  center: [number, number]; // [latitude, longitude]
  radius: number; // meters
}
```
- Dynamically loaded via `next/dynamic({ ssr: false })`
- Initializes Leaflet map on mount (first `useEffect`, no deps)
- Second `useEffect` on `[center, radius]` updates marker + circle
- Injects Leaflet CSS dynamically if not already present
- Destroys map on unmount

#### `ReportsClient.tsx` — Client
- State: start, end (default: current month), userId, status filters
- Export button: `<a href={buildUrl()} download>` — browser triggers CSV download
- URL: `/api/reports/attendance.csv?start=&end=&user_id=&status=`

### Shell Components (`src/components/shell/`)

#### `EmployeeNav.tsx` — Client
- Uses `usePathname()` to highlight active nav item
- `BottomNavBar variant="static"` from design-kit
- 3 items: dashboard (`/dashboard`), history (`/history`), leave (`/leave`)

#### `AdminSidebar.tsx` — Client
- Uses `SideNavRail` from design-kit
- 7 nav items + logout form action
- Highlights current route

#### `AdminDrawer.tsx` — Client (also exports `AdminMobileHeader`)
- `AdminMobileHeader`: hamburger button that sets `isOpen` state in a context/callback
- `AdminDrawer`: slide-in panel from left, backdrop, 7 nav items + logout
- Built from scratch (no design-kit drawer component)

---

## 10. Design System

The design-kit at `./design-kit/` is a standalone React + Tailwind component library. Import paths use the `@/design-kit/*` tsconfig alias.

### Primitives (`design-kit/primitives/`)

| Component | Key Props | Notes |
|---|---|---|
| `Button` | `variant?: 'primary'|'ghost'|'dark'`, `size?: 'sm'|'md'|'lg'`, `leftIcon?`, `rightIcon?` | rounded-pill, ring-brand/40 on focus |
| `IconButton` | `icon: LucideIcon`, `label: string` (required for a11y), `variant?`, `size?` | Icon-only; aria-label is mandatory |
| `Card` | `tone?: 'surface'|'canvas'`, `padding?: 'sm'|'md'|'lg'`, `withChevron?`, `header?` | 20px radius (`rounded-xl`) |
| `Badge` | `tone?: 'lime'|'muted'|'brand'|'dark'` | Uppercase, 10px, bold |
| `Chip` | `variant?: 'trendUp'|'trendDown'|'neutral'|'lime'|'dark'|'brand'`, `delta?: number` | Pill shape, formatDelta for trend |
| `InitialAvatar` | `name: string`, `size?: 32|36|40|44|48|56|64`, `tone?: 'auto'|'lime'|'blue'|'dark'|'muted'` | URL-free by design |
| `SearchInput` | `variant?: 'pill'|'icon'`, all HTMLInputAttributes | ref-forwarded |
| `SelectPill` | `value: string`, `options?: string[]`, `onChange?`, `leftAdornment?` | Native select styled as pill; options are display=value |
| `SectionLabel` | `children`, `className?` | Section heading typography |
| `StatNumeral` | `size?: 'sm'|'md'|'lg'`, `children` | Large bold numbers |
| `SquircleTile` | `size?: number`, `className?` | Superellipse (n=5) tile |
| `LegendDot` | `color: string`, `label: string` | Colored dot + label |
| `BottomNavItem` | `icon: LucideIcon`, `label: string`, `active?: boolean`, `href?: string` | Uses `hover:bg-navSlateHover` (v4 token) |

### Compounds (`design-kit/compounds/`)

| Component | Key Props | Notes |
|---|---|---|
| `KpiCard` | `title: string`, `value: string|number`, `icon: LucideIcon`, `iconBg?: 'blue'|'black'|'dark'`, `trend?: {dir,pct}`, `subLabel?` | Wraps Card + StatNumeral + Chip |
| `AppHeader` | `title?`, `action?` | Top app bar |
| `SideNavRail` | `items: SideNavItemSpec[]` | Desktop sidebar navigation |
| `BottomNavBar` | `items: BottomNavItemSpec[]`, `variant?: 'floating'|'static'` | Mobile bottom nav |
| `ChartCard` | `title`, `description?`, `children` | Card wrapper for charts |
| `DonutGauge` | `segments: DonutSegment[]` | Pure SVG donut chart |
| `GaugeLegend` | `items: GaugeLegendItem[]` | Legend for DonutGauge |
| `SegmentedPercentBar` | `segments: SegmentedPercentBarSegment[]` | Horizontal color bar |
| `Heatmap` | `data: HeatmapCell[]` | 34px squircle tiles, 6px gap |
| `StackedBarChart` | `data: StackedBarDatum[]` | Recharts-based, no axes by default |
| `AvatarRatingRow/List` | `items: AvatarRatingRowItem[]` | Avatar + score rows |

### Tailwind v4 Token Map (from `globals.css`)

Key semantic colors available as Tailwind classes:

| Token | Class | Value |
|---|---|---|
| Canvas | `bg-canvas` | Light gray page background |
| Surface | `bg-surface` | White card background |
| Nav dark | `bg-navDark` | Dark sidebar background |
| Nav slate | `bg-navSlate` | Hover state in dark nav |
| Nav slate hover | `bg-navSlateHover` | `#3A3F47` |
| Ink | `text-ink` | Primary text |
| Muted | `text-muted` | Secondary text |
| Brand | `bg-brand`, `text-brand` | `#1E53FF` |
| Data blue | `bg-data-blue` | Chart primary |
| Data lime | `bg-data-lime` | Chart secondary |
| Trend up | `text-trend-up`, `bg-trend-up` | Green (success) |
| Trend down | `text-trend-down`, `bg-trend-down` | Red (error/late) |
| Soft | `bg-soft` | Light neutral fill |
| Grid 0–6 | `bg-grid-0` … `bg-grid-6` | Heatmap blue ramp |

Typography scale classes: `text-caption`, `text-small`, `text-body`, `text-cardTitle`, `text-section`, `text-display`

Shadow classes: `shadow-soft`, `shadow-softer`, `shadow-iconBtn`, `shadow-nav`

Radius tokens: `rounded-xs`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-squircle`, `rounded-pill`

### v3 Compatibility Fixes (already applied)

Two Tailwind v3-isms were fixed at the start of the project:

1. `ring-brand/40` — Added `@layer utilities { .ring-brand\/40 { --tw-ring-color: rgb(30 83 255 / 0.4) } }` in `globals.css`
2. `hover:bg-[#3a3f47]` in `BottomNavItem.tsx` and `SideNavRail.tsx` → Changed to `hover:bg-navSlateHover`

---

## 11. Library Utilities

### `src/lib/supabase/server.ts`
```typescript
export async function createClient(): Promise<SupabaseClient>
```
Uses `next/headers` cookies. For Server Components and Server Actions.

### `src/lib/supabase/browser.ts`
```typescript
// 'use client'
export function createClient(): SupabaseClient
```
For Client Components only.

### `src/lib/supabase/service.ts`
```typescript
// 'server-only'
export function createServiceClient(): SupabaseClient
```
Uses `SUPABASE_SERVICE_ROLE_KEY`. Bypasses RLS. **Admin mutations only.**

### `src/lib/supabase/middleware.ts`
```typescript
export async function updateSession(request: NextRequest): Promise<NextResponse>
```
Refreshes session and sets updated cookies. Called by `src/middleware.ts`.

### `src/lib/auth/guards.ts`
```typescript
// 'server-only'
export async function requireUser(): Promise<{ userId: string; profile: Profile }>
export async function requireAdmin(): Promise<{ userId: string; profile: Profile }>
```

### `src/lib/auth/actions.ts`
```typescript
// 'use server'
export async function logout(): Promise<never>
```

### `src/lib/attendance/geo.ts`
```typescript
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number
// Returns distance in meters. Earth radius = 6,371,000m.
```

### `src/lib/attendance/status.ts`
```typescript
export function calcLateMinutes(workStartTime: string, gracePeriodMinutes: number, now: Date): number
// workStartTime: 'HH:mm' in Africa/Tunis
// gracePeriodMinutes: from office_settings
// now: current time (UTC Date object)
// Returns 0 if within grace period, else minutes late

export function resolveStatus(lateMinutes: number): AttendanceStatus
// Returns 'late' if lateMinutes > 0, else 'present'

export function formatTime(ts: string | null): string
// ISO timestamp → 'HH:mm' in Africa/Tunis, or '—'

export function formatDate(dateStr: string): string
// 'yyyy-MM-dd' → 'dd MMM yyyy' in Africa/Tunis
```

### `src/lib/utils/date.ts`
```typescript
export const OFFICE_TZ = 'Africa/Tunis'

export function nowInOffice(): Date
export function formatOffice(date: Date | string, pattern: string): string
export function todayDateInOffice(): string  // 'yyyy-MM-dd'
```

### `src/lib/utils/cn.ts`
```typescript
export function cn(...classes: ClassValue[]): string
// Merges Tailwind classes (clsx + tailwind-merge)
```

### `src/lib/activity/log.ts`
```typescript
// 'server-only'
export async function logActivity(params: {
  actorId: string;
  action: ActivityAction;
  targetUserId?: string;
  details?: Record<string, unknown>;
}): Promise<void>
// Uses createServiceClient() internally
```

### `src/lib/validation/` — Zod Schemas

```typescript
// auth.ts
loginSchema: { email: string (email), password: string (min 6) }

// employee.ts
createEmployeeSchema: { full_name, email, password, phone?, position?, department?,
                        work_start_time?, work_end_time?, leave_balance?, role? }
updateEmployeeSchema: (all partial, no email/password)

// attendance.ts
manualAttendanceSchema: { user_id (uuid), date (yyyy-MM-dd), status (enum),
                           check_in_at?, check_out_at?, late_minutes?, note? }
updateAttendanceSchema: (partial, no user_id/date)

// leave.ts
leaveRequestSchema: { start_date, end_date, type, reason? }
adminLeaveSchema: { user_id, start_date, end_date, type, status?, reason?,
                    admin_note?, deduct_balance? }
reviewLeaveSchema: { status (approved|rejected|cancelled), admin_note?, deduct_balance? }

// settings.ts
settingsSchema: { office_name, company_name, logo_url?, office_latitude, office_longitude,
                   allowed_radius_meters, gps_accuracy_limit_meters, grace_period_minutes,
                   forgot_checkout_cutoff_time, default_work_start_time, default_work_end_time }
```

---

## 12. Type Definitions

Full definitions in `src/types/index.ts`:

```typescript
type Role = 'employee' | 'admin'
type AttendanceStatus = 'present' | 'late' | 'absent' | 'leave' | 'holiday'
type LeaveType = 'annual' | 'sick' | 'unpaid' | 'other'
type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
type ActivityAction = /* 18 values — see schema section */

interface Profile { /* 14 fields + timestamps */ }
interface Attendance { /* 20 fields + timestamps + optional profiles join */ }
interface LeaveRequest { /* 12 fields + timestamps + optional profiles join */ }
interface OfficeSettings { /* 13 fields + timestamps */ }
interface ActivityLog { /* 5 fields + optional actor/target profile joins */ }
```

---

## 13. Environment & Deployment

### Required Environment Variables

```bash
# .env.local (local) / Vercel environment variables (production)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Supabase Setup (one-time)

1. Create Supabase project (EU region)
2. Auth → Providers → Enable Email, disable "Confirm email" for MVP
3. SQL Editor → run `0001_init.sql` → run `0002_seed.sql` → run `0003_functions.sql`
4. Auth → Users → Add user (admin email + temp password)
5. SQL Editor:
   ```sql
   update public.profiles
   set
     full_name = 'Admin Name',
     email = 'admin@company.tn',
     role = 'admin',
     leave_balance = 0,
     is_active = true
   where id = '<uuid-from-auth>';
   ```
6. Update office coordinates via Admin Settings page after first login

### Vercel Deployment

```bash
# Install Vercel CLI, link project, set env vars, deploy
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel deploy --prod
```

`next.config.ts` has `outputFileTracingRoot: path.resolve(__dirname)` to prevent Vercel build warnings from monorepo-style workspace detection.

---

## 14. Current Build Status

**`npm run build` → not verified in the current workspace. Multiple `next dev`/`next build` processes were active and the build command timed out; rerun from a clean process state before marking production build green.**

**`npm run lint` → passed**

**`npm run typecheck` → passed**

Last verified: 2026-04-22 after bug-fix pass (employee creation upsert, check-in grace_period_minutes source, decrement_leave_balance privilege hardening, leave RPC error handling).

### All Routes (28 total)

```
/ (root redirect)
/login
/dashboard
/history
/leave
/admin/dashboard
/admin/employees
/admin/employees/[id]
/admin/attendance
/admin/leave
/admin/reports
/admin/settings
/admin/logs
/api/checkin
/api/checkout
/api/attendance/me
/api/attendance/all
/api/attendance/[id]
/api/employees
/api/employees/[id]
/api/leave
/api/leave/[id]
/api/leave/all
/api/settings
/api/admin/stats
/api/logs
/api/reports/attendance.csv
/_not-found (custom 404)
```

### Loading Skeletons

`loading.tsx` files exist for:
- `/dashboard`
- `/history`
- `/leave`
- `/admin/employees`
- `/admin/attendance`
- `/admin/leave`

### Error Boundaries

- `src/app/error.tsx` — global client error boundary with retry button
- `src/app/not-found.tsx` — 404 page with link to dashboard

---

## 15. Known Gaps & Next Steps

### Not Yet Implemented

| Feature | Priority | Notes |
|---|---|---|
| **Forgot checkout cron job** | High | `forgot_checkout` column exists but is never auto-set. Need a Supabase Edge Function cron or pg_cron job that runs at `forgot_checkout_cutoff_time` daily and sets `forgot_checkout=true` where `check_in_at IS NOT NULL AND check_out_at IS NULL AND date = today` |
| **Password reset** | Medium | No "forgot password" flow. Admin communicates temp password verbally. Could add Supabase `resetPasswordForEmail()` flow |
| **Push notifications** | Low | PWA notification for forgot-checkout reminder or leave approval |
| **Real company logo** | Low | Replace placeholder SVG "X" logo with actual logo |
| **Lighthouse PWA audit** | Low | Phase 11 — verify installability on Android Chrome + iOS Safari, score ≥ 90 |
| **Safe-area inset** | Low | `.pb-safe` class defined in globals.css; verify bottom nav clears iOS home indicator |
| **Holiday management** | Medium | No UI to create `status='holiday'` attendance records for public holidays. Admin would need to create them manually via attendance table |
| **`/api/leave/all` GET filters** | Low | Current implementation filters by user_id and status but the page doesn't expose URL-based filtering (always loads all on server) |

### Potential Improvements

| Area | Suggestion |
|---|---|
| Employee detail page | Add link to full history and leave requests for that employee |
| Admin attendance | Add "forgot checkout" filter to the filter bar |
| Leave approval | Add option to partially approve (different date range than requested) |
| Reports | Add month-over-month bar chart visualization |
| Settings | Add logo upload (Supabase Storage) instead of URL field |
| Security | Add rate limiting to `/api/checkin` and `/api/checkout` (prevent GPS spoofing attempts) |
| Audit | Add `ip_address` and `user_agent` columns to `activity_logs` |

---

## 16. Critical Gotchas

### 1. Timezone: Always Africa/Tunis

**Never** use `new Date().toISOString().slice(0,10)` for the local date. Always use `todayDateInOffice()` or `formatInTimeZone(date, 'Africa/Tunis', 'yyyy-MM-dd')`. UTC midnight ≠ Tunis midnight.

### 2. Service Client = Admin Bypass

`createServiceClient()` bypasses all RLS policies. Never use it without first calling `requireAdmin()` in the same handler. The service role key must stay server-side (not prefixed with `NEXT_PUBLIC_`).

### 3. Attendance Upsert Pattern

Check-in always UPSERTs on `(user_id, date)`. If a record exists for today (e.g., from a manual admin entry), the check-in will update it — not create a duplicate. The duplicate check guards against re-check-in the same day.

### 4. `SelectPill` Value = Label

The design-kit `SelectPill` renders options where `value === display text`. For the MonthFilter, a custom `<select>` was built instead, because we need `value='2026-04'` but display `'Avril 2026'`.

### 5. Leaflet Must Be Client-Only

`MapPreview.tsx` is always loaded with `next/dynamic({ ssr: false })`. Never import `leaflet` directly in a Server Component or in a file without the `'use client'` directive. The Leaflet CSS is injected dynamically to avoid SSR conflicts.

### 6. `decrement_leave_balance` RPC — Must Exist and Privileges Are Locked

The leave approval flow calls `service.rpc('decrement_leave_balance', ...)`. If `0003_functions.sql` has not been run, approval/assignment with `deduct_balance=true` returns an API error after the leave row has already been written.

The function intentionally lives in the `public` schema (required for Supabase `.rpc()` calls) but has `EXECUTE` revoked from `public`, `anon`, and `authenticated`. Only `service_role` can invoke it. This means no client-side JWT — even an authenticated admin — can call it directly; it only runs through the server-side service client.

### 7. Admin Bootstrap Is Manual

The first admin user is created manually in the Supabase dashboard. The `handle_new_user` trigger reads `raw_app_meta_data->>'role'`; for manually created Supabase Auth users, this is empty, so the profile gets `role='employee'`. You must manually UPDATE the profile to set `role='admin'` in SQL.

### 8. Chip Variant Names

The `Chip` component uses `'trendUp'` and `'trendDown'` (camelCase), **not** `'up'`/`'down'`/`'lime-down'`. Passing an invalid variant silently falls back to no styling class. The full valid set: `'trendUp' | 'trendDown' | 'neutral' | 'lime' | 'dark' | 'brand'`.

### 9. react-hook-form + `zodResolver` for Conditional Schemas

In `EmployeeFormDialog`, the schema switches between `createEmployeeSchema` and `updateEmployeeSchema` based on `isEdit`. The resolver is cast `as never` to satisfy TypeScript since the two schemas have different fields. This is intentional and safe — the form fields rendered match the active schema.

### 10. `forgot_checkout` Is Precomputed, Not Live

The `forgot_checkout` boolean is stored on the attendance row and must be written explicitly. The check-out API sets it to `false` on a successful checkout. Setting it to `true` (for missed checkouts) requires a scheduled process that doesn't exist yet.

### 11. `leave_balance` CHECK >= 0

The database has a `CHECK (leave_balance >= 0)` constraint. The `decrement_leave_balance` RPC uses `greatest(0, leave_balance - p_days)` to floor at 0, so it never violates this constraint. Any direct UPDATE must also ensure non-negative values.

### 13. Employee Creation Uses Upsert, Not Insert

`POST /api/employees` uses `service.from('profiles').upsert(..., { onConflict: 'id' })`, not `.insert()`. Reason: the `handle_new_user` trigger fires immediately after `auth.admin.createUser()` and inserts a sparse profile row (id, email, full_name, role only). A plain `.insert()` would hit a duplicate primary key error. The upsert overwrites the trigger's sparse row with the full admin-provided data (schedule, leave_balance, department, etc.).

### 14. No Multi-Tenancy

There is one `office_settings` row, one geofence, one timezone. All employees belong to the same office. Adding multi-office support would require significant schema changes (`office_id` FK on profiles, attendance, leave).

---

## Appendix: File Quick Reference

| Task | File(s) to edit |
|---|---|
| Change geofence logic | `src/app/api/checkin/route.ts`, `src/lib/attendance/geo.ts` |
| Add a new attendance status | `src/types/index.ts`, `supabase/migrations/`, `src/app/globals.css` (STATUS_LABEL maps in components) |
| Change late calculation | `src/lib/attendance/status.ts:calcLateMinutes` |
| Add a new admin page | `src/app/(admin)/admin/[page]/page.tsx` + component in `src/components/admin/` |
| Add a new activity action | `src/types/index.ts:ActivityAction`, `supabase/migrations/` (alter enum) |
| Change French strings | `messages/fr.json` |
| Add new design token | `src/app/globals.css` (`@theme` block) |
| Add new design-kit component | `design-kit/primitives/` or `design-kit/compounds/` + re-export from `design-kit/index.ts` |
| Add forgot-checkout cron | Supabase Edge Function or pg_cron on `attendance` table |
| Change GPS accuracy threshold | Admin Settings page → updates `office_settings.gps_accuracy_limit_meters` |
| Change allowed radius | Admin Settings page → updates `office_settings.allowed_radius_meters` |
| Change grace period | Admin Settings page → updates `office_settings.grace_period_minutes` |
| Reset an employee's password | Supabase dashboard Auth → Users → Reset password |
| View raw activity logs | Admin → Journal d'activité, or Supabase Table Editor → activity_logs |
