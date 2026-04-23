# Project Brief — Xshift

## Goal

Build **Xshift**, an employee attendance management PWA for a small team (~4 employees today, with room to grow).

Employees check in and check out each day with GPS validation against a single office geofence, view their attendance history, and see their leave balance. The admin manages employees, attendance records, leave, office geofence settings, reports, and activity logs.

## Product Direction

A polished, installable attendance PWA — French-only at launch, mobile-first for employees, responsive for admin. Deployed to Vercel, backed by Supabase (Auth + Postgres).

### Users

- **Employee** — checks in/out, sees today's status, history, leave balance, assigned leave.
- **Manager** — supervises daily operations: attendance, leave/day-off review, limited employee work data, and attendance reports.
- **Admin** — full control over employees, settings, reports, and audit/security surfaces.

## Decisions (locked)

| Area | Choice |
|---|---|
| Brand | **Xshift** (logo placeholder until provided) |
| Language | **French only** at launch, via `messages/fr.json`. Structure allows adding a locale by duplicating the JSON file. |
| Auth | **Email + password**. First admin seeded manually in Supabase. Admin creates employee accounts with a temporary password, which is communicated to the employee directly. Employee can change it after login. |
| Leave model | **Admin-assigned** for MVP. Schema supports an employee-request → admin-approve flow later without migration. |
| Payroll | **Deferred.** MVP exposes attendance data via CSV export; payroll can be added later as a consumer of that data. |
| Office model | **Single office** for MVP. Schema reserves a clean path to multi-office. |
| Workweek | **7 days.** Employees take their day(s) off flexibly via leave requests. Admin marks public holidays manually. |
| Platform | **Installable PWA.** Online-only (no offline queue for MVP). |
| Timezone | `Africa/Tunis`. |

## MVP scope

- Supabase email/password auth, roles (`employee`, `admin`)
- Admin-created employee accounts
- Employee GPS check-in and check-out
- Office geofence settings (location, radius, GPS accuracy limit, grace period, forgot-checkout cutoff, default work hours, brand name/logo)
- Employee dashboard, history, leave view
- Admin dashboard, employees CRUD, attendance management (full edit/create/delete), leave assignment, settings, activity logs
- CSV export

## Post-MVP

- PDF reports
- Rich charts beyond the dashboard KPIs
- Push notifications
- Payroll calculations
- Multi-office support
- Employee-initiated leave requests with approve/reject flow
- Offline check-in queue

## Stack summary

See `ARCHITECTURE.md` for the full list. Key choices: Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, Supabase SSR, next-intl, react-hook-form + zod, local `design-kit/`.
