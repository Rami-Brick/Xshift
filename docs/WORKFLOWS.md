# Workflows

## Auth

1. Admin opens the Supabase dashboard and creates the first admin account (see `SETUP.md`).
2. Admin logs into Xshift at `/login` with email + password.
3. Admin creates employee accounts via `/admin/employees` → server creates the auth user with a temporary password chosen by the admin and inserts a `profiles` row.
4. Admin communicates the temporary password to the employee directly.
5. Employee signs in at `/login`.
6. The app fetches the profile role server-side and redirects: admin → `/admin/dashboard`, employee → `/dashboard`.

Password reset for MVP: admin re-issues a new temporary password from the employee edit dialog.

## Route guards

- `src/middleware.ts` refreshes the Supabase session cookie and redirects unauthenticated traffic to `/login`.
- Each layout (`(employee)/layout.tsx`, `(admin)/layout.tsx`) re-checks the role server-side and redirects mismatches.
- Logged-out users cannot access any page except `/login`.
- Employees cannot reach `/admin/*`.

## Employee check-in

1. Employee opens `/dashboard`.
2. Server component renders today's attendance row (if any) and the KPI cards.
3. Employee taps **"Pointer l'arrivée"**.
4. Browser requests GPS (`navigator.geolocation.getCurrentPosition`, `{ enableHighAccuracy: true, timeout: 10000 }`).
5. Client POSTs `{ latitude, longitude, accuracy }` to `/api/checkin`.
6. The route handler verifies:
   - User is authenticated.
   - All GPS fields are finite numbers.
   - `accuracy <= office_settings.gps_accuracy_limit_meters`.
   - Haversine distance to office `<= office_settings.allowed_radius_meters`.
   - No existing `attendance` row with `check_in_at` for today.
7. Handler computes `late_minutes` against the employee's `work_start_time` with `office_settings.grace_period_minutes` grace. If `now - work_start_time > grace`, `status = 'late'` and `late_minutes` = (actual − start), else `status = 'present'` and `late_minutes = 0`.
8. Handler upserts the `attendance` row on `(user_id, date)`.
9. Handler inserts an `activity_logs` row with `action = 'checkin'` and GPS details.
10. Client shows a Sonner toast and revalidates the dashboard.

Failure toasts (all in French):
- Missing GPS → "GPS indisponible".
- Permission denied → "Accès à la localisation refusé".
- Accuracy too low → "Précision GPS insuffisante — réessayez près d'une fenêtre".
- Outside radius → "Vous êtes à X m du bureau (rayon autorisé : Y m)".
- Already checked in → "Vous avez déjà pointé votre arrivée à HH:MM".

## Employee check-out

1. Employee taps **"Pointer le départ"**.
2. Same GPS capture and validation as check-in.
3. Handler requires an existing row for today with `check_in_at` set and `check_out_at` null.
4. Handler updates `check_out_at` and the check-out GPS fields.
5. Handler writes an `activity_logs` row with `action = 'checkout'`.

## Forgot-checkout flag

A row whose `check_in_at is not null`, `check_out_at is null`, and local time has passed `office_settings.forgot_checkout_cutoff_time` is flagged `forgot_checkout = true` so it surfaces clearly in the admin attendance list. The flag is toggled on read in the admin list or via a scheduled job (future). Admin fixes the record manually with a checkout time.

## Employee dashboard (`/dashboard`)

- Greeting with first name + today's date.
- Today's check-in / check-out card with status chip (Présent / En retard / Oubli de départ).
- Monthly KPIs: days present, days late, leave balance.
- Recent attendance preview (5 rows).

## Employee history (`/history`)

- Month selector (SelectPill).
- Paginated table: date, arrivée, départ, statut, minutes de retard, note.
- Data from `GET /api/attendance/me?start=...&end=...`.

## Employee leave (`/leave`)

- Leave balance with SegmentedPercentBar visualization.
- List of assigned/approved leave (type, période, jours, statut, motif).
- MVP: read-only. Admin assigns.

## Admin dashboard (`/admin/dashboard`)

- Active employee count.
- Présents aujourd'hui / En retard / Absents / En congé.
- Today's attendance list.
- Recent activity (last 10 `activity_logs`).
- DonutGauge for presence breakdown.
- Client wrapper polls `GET /api/admin/stats` every 60s via SWR.

## Admin employees (`/admin/employees`)

- Search by name/email.
- Table columns: avatar, nom, email, rôle, département, poste, heures de travail, solde de congés, statut.
- Actions: Créer, Modifier, Désactiver, Ouvrir détail.

### Create employee

1. Admin submits the form (nom, email, mot de passe temporaire, rôle, département, poste, heures de travail, solde de congés).
2. Route handler `POST /api/employees` verifies admin role.
3. Service-role client creates the Supabase auth user (`auth.admin.createUser`, `email_confirm: true`).
4. Handler inserts/updates the `profiles` row.
5. Handler writes `activity_logs` action `create_employee`.

### Deactivate employee

- Sets `profiles.is_active = false`.
- Optionally bans the auth user (`auth.admin.updateUserById`) in a later pass.
- Writes `activity_logs` action `deactivate_employee`.

No hard deletes in MVP.

## Admin employee detail (`/admin/employees/[id]`)

- Profile details.
- Monthly attendance grid.
- Leave history.
- Stats: présent, en retard, minutes totales de retard, taux de présence.

## Admin attendance (`/admin/attendance`)

- Filters: employé, statut, date début, date fin.
- Paginated table.
- **Full manual control**: create any date, edit any field, delete any row.
- Manual creation does not require GPS; `created_by` and `updated_by` are stamped.
- Every mutation writes `activity_logs` with before/after JSON in `details`.

## Admin leave (`/admin/leave`)

- List of leave rows for all employees.
- Filter by employé, type, statut, date range.
- Actions: Assigner, Modifier, Annuler.
- Assign flow: admin picks employé, type, dates, motif, and whether to deduct balance.
  - If `deduct_balance = true`: decrement `profiles.leave_balance` by `(end_date - start_date + 1)` days atomically.
  - Create/overwrite `attendance` rows in the range with `status = 'leave'`.
  - Write `activity_logs` action `assign_leave`.

## Admin settings (`/admin/settings`)

- Company name + logo URL.
- Office name.
- Latitude / Longitude with Leaflet map preview + radius circle.
- "Capturer ma position" button fills lat/lng from the admin's current GPS.
- Allowed radius (m), GPS accuracy limit (m).
- Grace period (min), forgot-checkout cutoff time.
- Default work start / end time.
- Timezone (read-only display for MVP).
- Writes `activity_logs` action `update_settings`.

## Admin logs (`/admin/logs`)

- Paginated, newest-first.
- Columns: horodatage, acteur, action, cible, détails (JSON preview).

## Reports (`/admin/reports`)

- MVP: CSV export of filtered attendance via `GET /api/reports/attendance.csv`.
- Stretch: PDF, department report, payroll-ready summary.
