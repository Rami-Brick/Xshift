# Reports Dashboard Plan

## Purpose

Upgrade the admin reports tab from a CSV-only export screen into a practical reporting dashboard for attendance, lateness, absences, leave, forgotten checkouts, and operational follow-up.

The goal is not to make a decorative analytics page. The goal is to help admins and managers answer a few daily questions quickly:

- Are employees attending consistently?
- Who is often late or absent?
- Which days create the most attendance problems?
- Are leave, day-off, and attendance records balanced?
- What should management follow up on this week or month?

## Current State

Current reports files:

- `src/app/(admin)/admin/reports/page.tsx`
- `src/components/admin/ReportsClient.tsx`
- `src/app/api/reports/attendance.csv/route.ts`

Current behavior:

- Admin reports page fetches active profiles for an employee filter.
- `ReportsClient` lets the admin choose date range, employee, and attendance status.
- The page builds a CSV download URL.
- CSV export queries `attendance` and joins `profiles`.

Current limitations:

- No dashboard metrics.
- No charts.
- No summary by employee.
- No trend view.
- No leave usage view.
- No forgotten checkout summary.
- No location/GPS compliance summary even though the data exists.
- Status filter does not include `day_off`, though the app type supports it.

## Data Already Available

The app already tracks enough information for a strong first version.

### `profiles`

Useful fields:

- `id`
- `full_name`
- `email`
- `role`
- `work_start_time`
- `work_end_time`
- `leave_balance`
- `default_day_off`
- `is_active`

Reports should initially focus on active employees, not managers/admins, unless a staff-inclusive toggle is added later.

### `attendance`

Useful fields:

- `user_id`
- `date`
- `status`
- `check_in_at`
- `check_out_at`
- `late_minutes`
- `forgot_checkout`
- `check_in_accuracy_meters`
- `check_out_accuracy_meters`
- `check_in_distance_meters`
- `check_out_distance_meters`
- `device_id`
- `device_label`
- `note`

This supports:

- attendance status breakdown
- late minutes
- missed checkout reporting
- device reporting
- GPS compliance reporting
- manual/admin attendance adjustments through `created_by` / `updated_by`

### `leave_requests`

Useful fields:

- `user_id`
- `start_date`
- `end_date`
- `type`
- `status`
- `deduct_balance`

This supports leave usage, approved leave days, pending leave volume, and leave balance context.

### `day_off_changes`

Useful fields:

- `user_id`
- `iso_year`
- `iso_week`
- `old_day`
- `new_day`
- `status`

This is needed when calculating expected working days accurately.

### `office_settings`

Useful fields:

- `grace_period_minutes`
- `allowed_radius_meters`
- `gps_accuracy_limit_meters`
- `timezone`

This is needed to make reports match the same business rules as attendance.

## Reporting Principles

1. Reports should use the office timezone.
   - Existing code commonly uses `Africa/Tunis`.
   - Prefer reading `office_settings.timezone` when possible, with `Africa/Tunis` as fallback.

2. Metrics should separate recorded facts from inferred facts.
   - Recorded fact: an `attendance` row with `status = 'absent'`.
   - Inferred fact: no attendance row exists for a working day after the day is complete.
   - Reports should label calculations internally so future bugs are easier to reason about.

3. Filters should apply consistently.
   - Date range.
   - Employee.
   - Status.
   - Optional future filters: team/role, device, location compliance, leave type.

4. CSV export should remain available.
   - It should use the same filters as the dashboard.
   - It should become a secondary action, not the whole reports page.

5. No service role access in client components.
   - Keep Supabase service client usage server-side only.
   - Admin/manager authorization should continue through `requireStaff` or server-only guards.

## V1 Scope

V1 should focus on metrics that are immediately useful and can be calculated from existing data without schema changes.

### Top KPI Cards

Add 4 to 6 compact metric cards:

- Attendance rate
- Late rate
- Absence count
- Average late minutes
- Forgotten checkouts
- Approved leave days

Suggested card content:

- main value
- short label
- tiny context line, for example `43 expected days`
- trend vs previous period if feasible in V1.5

### Attendance Status Trend

Chart: stacked bar by day.

Series:

- present
- late
- absent
- leave
- day_off

Purpose:

- Show whether issues are isolated to one day or repeated across the range.
- Make the monthly pattern visible.

Recommended implementation:

- Use `recharts`, already installed.
- Reuse or adapt `design-kit/compounds/StackedBarChart.tsx`.
- For the reports dashboard, a custom chart may be better because status names differ from the design-kit example fields.

### Late Minutes Trend

Chart: line or area chart by day.

Values:

- average late minutes per day
- total late minutes per day as optional tooltip detail

Purpose:

- Show whether lateness is improving or worsening.

### Status Breakdown

Chart: donut, radial, or compact horizontal bars.

Values:

- total recorded/inferred working-day statuses in selected range

Purpose:

- Give quick distribution of presence vs lateness vs absence/leave.

### Employee Performance Table

Add a sortable employee summary table.

Columns:

- Employee
- Expected days
- Present
- Late
- Absent
- Leave
- Day off
- Attendance rate
- Avg late
- Forgotten checkout

Default sort:

- Highest attention score first.

Attention score can initially be simple:

```text
absent_count * 3 + late_count * 2 + forgot_checkout_count
```

This is not shown as a business metric unless we want it. It is mostly a sort helper.

### Needs Attention Panel

Add a small panel for the most actionable cases.

Examples:

- Repeated late arrivals: `late_count >= 3`
- Repeated absences: `absent_count >= 2`
- Forgotten checkout: `forgot_checkout_count >= 2`
- Location outside allowed radius: any check-in/check-out distance over office setting

Each row should link to the employee detail page:

```text
/admin/employees/{id}
```

### Keep CSV Export

Move export into a compact action area:

- keep date range
- employee filter
- status filter
- download button

Add `day_off` to the status options.

## V1.5 Scope

Add improvements after V1 is stable.

### Previous Period Comparison

Compare selected range with the same-length previous range.

Examples:

- Attendance rate `92%`, up/down vs previous period.
- Late count `18`, up/down vs previous period.

This makes KPI cards more useful, but should not block V1.

### Weekday Heatmap

Heatmap dimensions:

- columns: Monday through Sunday
- rows or color buckets: issue intensity

Possible views:

- lateness count by weekday
- absence count by weekday
- average late minutes by weekday

The design-kit already includes a heatmap example in:

- `design-kit/examples/ReportScreen.tsx`

### Leave Usage Breakdown

Charts:

- stacked bar by leave type
- employee leave usage table

Metrics:

- approved leave days
- pending leave requests
- deducted vs non-deducted leave days
- leave usage by type: annual, sick, unpaid, other

### GPS Compliance

Use existing fields:

- `check_in_distance_meters`
- `check_out_distance_meters`
- `check_in_accuracy_meters`
- `check_out_accuracy_meters`

Useful metrics:

- check-ins outside allowed radius
- check-outs outside allowed radius
- check-ins with poor GPS accuracy
- employees with repeated GPS issues

This should be shown carefully. It is an operational signal, not automatically proof of misuse.

## V2 Scope

V2 can add deeper reporting and exports.

Ideas:

- PDF monthly report.
- Scheduled email report.
- Employee detail report page.
- Per-employee attendance timeline.
- Department/team filter if departments are reintroduced later.
- Device consistency report.
- Manual adjustment audit report.
- Export current chart/table data as CSV.

## Suggested UI Layout

The reports page should be dense and work-focused, matching the admin app.

### Desktop Layout

```text
Header row
  Title: Rapports
  Actions: Export CSV

Filter row
  Date range | Employee | Status | Reset

KPI grid
  Attendance rate | Late rate | Absences | Avg late | Forgotten checkout | Leave days

Main grid
  Left: Attendance trend stacked bar
  Right: Status breakdown

Secondary grid
  Left: Late minutes trend
  Right: Needs attention

Employee table
  Full width
```

### Mobile Layout

```text
Header
Filters as stacked controls or a sheet
KPI cards in 2-column grid
Charts stacked vertically
Needs attention
Employee table as cards
CSV export button
```

## Component Plan

Suggested files:

- `src/app/(admin)/admin/reports/page.tsx`
- `src/components/admin/ReportsClient.tsx`
- `src/components/admin/reports/ReportsFilters.tsx`
- `src/components/admin/reports/ReportsKpiGrid.tsx`
- `src/components/admin/reports/AttendanceTrendChart.tsx`
- `src/components/admin/reports/LateMinutesChart.tsx`
- `src/components/admin/reports/StatusBreakdownChart.tsx`
- `src/components/admin/reports/EmployeeReportTable.tsx`
- `src/components/admin/reports/NeedsAttentionPanel.tsx`
- `src/lib/reports/summary.ts`
- `src/app/api/reports/summary/route.ts`
- `src/app/api/reports/attendance.csv/route.ts`

`ReportsClient.tsx` can stay as the main client orchestrator, but it should become a dashboard client instead of only an export card.

## Backend Plan

Prefer a server-side summary function:

```text
src/lib/reports/summary.ts
```

Responsibilities:

- validate date range
- fetch profiles
- fetch attendance rows
- fetch approved leave rows that overlap the range
- fetch approved day-off changes that overlap the range
- fetch office settings
- calculate summary metrics
- return chart-ready data

Then expose it through:

```text
src/app/api/reports/summary/route.ts
```

This lets the client refresh reports when filters change without a full route navigation.

The page can also call the same function for initial data so the first render is useful.

## API Shape

Endpoint:

```text
GET /api/reports/summary?start=YYYY-MM-DD&end=YYYY-MM-DD&user_id=...
```

Optional query parameters:

- `user_id`
- `status`

Response shape:

```ts
interface ReportsSummary {
  filters: {
    start: string;
    end: string;
    user_id: string | null;
    status: string | null;
    timezone: string;
  };
  totals: {
    employee_count: number;
    expected_days: number;
    present_count: number;
    late_count: number;
    absent_count: number;
    leave_count: number;
    day_off_count: number;
    forgot_checkout_count: number;
    total_late_minutes: number;
    avg_late_minutes: number;
    attendance_rate: number;
    late_rate: number;
  };
  by_day: Array<{
    date: string;
    present: number;
    late: number;
    absent: number;
    leave: number;
    day_off: number;
    forgot_checkout: number;
    avg_late_minutes: number;
  }>;
  by_employee: Array<{
    user_id: string;
    full_name: string;
    expected_days: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
    day_off: number;
    forgot_checkout: number;
    avg_late_minutes: number;
    attendance_rate: number;
    attention_score: number;
  }>;
  needs_attention: Array<{
    user_id: string;
    full_name: string;
    reason: string;
    severity: "low" | "medium" | "high";
    count: number;
  }>;
}
```

## Metric Definitions

These definitions should be written into code comments or tests when implemented.

### Expected Days

An expected day is a date where an active employee is expected to work.

Exclude:

- employee default day off
- approved day-off override for that date/week
- approved leave covering that date

Include:

- days with present/late/absent attendance status
- working days where no attendance row exists, if the day is in the past

For today:

- Avoid counting missing attendance as absent until the workday has passed.
- Reuse logic similar to `src/lib/admin/stats.ts`.

### Present Count

Count attendance rows with:

```text
status = 'present'
```

### Late Count

Count attendance rows with:

```text
status = 'late'
```

If the current system sometimes stores `present` with `late_minutes > grace_period_minutes`, reports should treat it as late for consistency:

```text
late_minutes > grace_period_minutes
```

### Absent Count

Count:

- attendance rows with `status = 'absent'`
- inferred past working days without attendance rows, excluding leave/day off

### Leave Count

Count days covered by approved leave.

For leave spanning multiple days:

- count each covered date inside selected range
- optionally exclude day-off days in V1.5 if business rules require it

### Day Off Count

Count employee day-off dates:

- default day off
- approved day-off change for that ISO week

### Attendance Rate

Recommended:

```text
(present_count + late_count) / expected_days
```

This means late arrivals still count as attended.

### Punctuality Rate

Recommended optional metric:

```text
present_count / expected_days
```

This separates "showed up" from "showed up on time".

### Late Rate

Recommended:

```text
late_count / expected_days
```

### Average Late Minutes

Recommended:

```text
total late minutes / late_count
```

Show `0` when `late_count = 0`.

### Forgotten Checkout Count

Count attendance rows where:

```text
forgot_checkout = true
```

## Date Range Rules

Default range:

- current month

Recommended presets:

- This month
- Last month
- Last 30 days
- This week
- Custom

Validation:

- `start` must be present.
- `end` must be present.
- `start <= end`.
- Hard cap the range for interactive dashboard queries, for example 366 days.
- CSV export can support a larger range if needed, but should still have a practical limit.

## Security Plan

Use existing admin/staff guard patterns:

- `requireStaff` for API routes.
- `requireStaffCached` or existing admin layout guard for pages.

Keep Supabase service client server-side:

- okay in `src/lib/reports/summary.ts`
- okay in API routes
- not okay in client components

No new database tables are required for V1.

No new RLS policies are required for V1 if using the existing service client pattern in staff-only server code.

If we later add database views or functions:

- review Supabase view security behavior
- use `security_invoker = true` for views where possible
- keep privileged functions outside exposed schemas

## Performance Plan

V1 can calculate in TypeScript from fetched rows.

Expected query shape:

- fetch active employee profiles
- fetch attendance rows for date range
- fetch approved leave overlapping date range
- fetch approved day-off changes overlapping date range
- fetch office settings

Indexes already help:

- `attendance_user_date_idx`
- `attendance_date_idx`
- `attendance_status_idx`
- `leave_requests_user_dates_idx`
- `leave_requests_status_idx`

If report ranges become large or employee count grows:

- add database aggregation functions
- add monthly materialized summary table
- add caching per date range
- paginate employee table

## Testing Plan

### Unit Tests

Add focused tests for:

- expected day calculation
- default day off exclusion
- approved day-off change handling
- approved leave overlap handling
- inferred absence handling
- today not-yet-arrived logic
- average late minutes when late count is zero
- attention score sorting

### Manual QA

Test cases:

- Current month with all employees.
- Single employee filter.
- Status filter.
- Range with no attendance rows.
- Employee with approved leave.
- Employee with changed day off.
- Employee with forgotten checkout.
- CSV export uses same filter values.
- Mobile layout does not overflow.

### Verification Commands

Run:

```bash
npm run typecheck
npm run build
```

If lint is fixed/available in this project, also run:

```bash
npm run lint
```

## Implementation Phases

### Phase 1: Reporting Data Core

Create:

- `src/lib/reports/summary.ts`
- report-specific TypeScript types in `src/types/index.ts` or colocated with reports

Implement:

- date range validation
- Supabase queries
- in-memory aggregation
- metrics definitions
- chart-ready arrays
- employee summary rows
- needs attention rows

Deliverable:

- Server function returns `ReportsSummary`.

### Phase 2: Summary API

Create:

- `src/app/api/reports/summary/route.ts`

Implement:

- `requireStaff`
- parse query params
- call report summary function
- return JSON
- return useful validation errors

Deliverable:

- Client can fetch dashboard summary by date range.

### Phase 3: Reports UI Foundation

Refactor:

- `src/components/admin/ReportsClient.tsx`

Create:

- filters
- KPI cards
- loading state
- empty state
- error state

Deliverable:

- Reports page shows real metrics for default current month.

### Phase 4: Charts

Create:

- `AttendanceTrendChart`
- `LateMinutesChart`
- `StatusBreakdownChart`

Use:

- `recharts`
- existing design tokens/colors
- compact admin-friendly layout

Deliverable:

- Dashboard has readable trends and status breakdowns.

### Phase 5: Employee Table and Attention Panel

Create:

- `EmployeeReportTable`
- `NeedsAttentionPanel`

Implement:

- desktop table
- mobile cards
- links to employee detail pages
- sorting by attention score

Deliverable:

- Admins can identify who needs follow-up.

### Phase 6: CSV Export Alignment

Update:

- `ReportsClient` export action
- `attendance.csv` status options

Add:

- `day_off` status option
- same date/user/status filter behavior as dashboard

Deliverable:

- CSV export stays available and consistent.

### Phase 7: Polish and QA

Polish:

- responsive spacing
- chart tooltips
- French labels
- loading skeletons if needed
- empty states

Verify:

- typecheck
- build
- manual QA on desktop/mobile

Deliverable:

- production-ready reports dashboard.

## Suggested First Implementation Order

1. Build `getReportsSummary`.
2. Add `/api/reports/summary`.
3. Replace the CSV-only card with filters plus KPI cards.
4. Add attendance trend chart.
5. Add employee table.
6. Add needs attention panel.
7. Add late minutes chart and status breakdown.
8. Align CSV export with the same filters.

This order gives useful progress early and keeps risk manageable.

## Acceptance Criteria

V1 is done when:

- Reports page defaults to current month.
- Admin can filter by date range and employee.
- KPI cards show real values.
- Attendance trend chart renders real data.
- Employee table ranks employees by useful operational metrics.
- Needs attention panel highlights repeated late/absent/forgot-checkout cases.
- CSV export still works.
- `day_off` is included where relevant.
- Service role is not exposed to the client.
- `npm run typecheck` passes.
- `npm run build` passes.

## Open Questions

1. Should managers see all employees or only employees they manage?
   - Current app does not appear to model manager ownership, so V1 can show all active employees to staff roles.

2. Should reports include managers/admins in employee metrics?
   - Recommendation: no for V1. Focus on active employees only.

3. Should approved leave days count against expected days?
   - Recommendation: exclude approved leave from expected working days, but show leave separately.

4. Should late arrivals count as attendance?
   - Recommendation: yes for attendance rate, no for punctuality rate.

5. Should missing attendance rows always infer absence?
   - Recommendation: only for past working days, and for today only after work end time.

6. Should GPS compliance be included in V1?
   - Recommendation: keep it V1.5 unless you want location compliance to be a primary admin concern.

