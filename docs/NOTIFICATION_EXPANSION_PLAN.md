# Notification System Expansion Plan

## Context

The current notification system fires only on **employee check-in**, sending a Web Push to managers and admins. The pipeline (VAPID keys, `push_subscriptions` table with staff-only RLS, `web-push` helper, service worker handlers, defensive `!inner` join, `Promise.allSettled` fan-out, expired-subscription cleanup) is solid and reusable.

This plan extends notifications to cover the rest of the lifecycle:

| # | Event | Recipient(s) | Direction |
|---|-------|--------------|-----------|
| 1 | Employee checks **out** | Staff (managers + admins) | Employee → Staff |
| 2 | Employee submits **leave request** | Staff | Employee → Staff |
| 3 | Staff **approves/rejects leave** | The requesting employee | Staff → Employee |
| 4 | Employee submits **day-off change request** | Staff | Employee → Staff |
| 5 | Staff **approves/rejects day-off change** | The requesting employee | Staff → Employee |

Events 3 and 5 introduce a fundamentally new direction (Staff → Employee). Today's `push_subscriptions` table has staff-only RLS and the subscription UI is hidden from employees. To deliver Staff → Employee notifications, employees must also be able to subscribe. This plan covers that change.

**Out of scope (deferred):** notifications for activity like leave cancellation, request edits, manual attendance entries, deletes. These are quieter events with lower urgency; revisit after measuring real-world notification volume.

---

## Architectural decision: refactor before extending

The current helper is `notifyStaffOfCheckIn(args)` — a one-event-shaped function. Adding five more triggers as one-off helpers would duplicate the query, fan-out, expired-cleanup, and defensive-guard logic five times. Bad outcome.

The refactor is small and high-leverage:

- Replace `notifyStaffOfCheckIn` with a generic `notify(event)` function that takes a discriminated union of event types.
- Each event type defines its own `recipients` strategy (staff role list OR a specific user_id), title/body builder, tag, and URL.
- Fan-out, send, expired-row cleanup, defensive guard, and timezone-aware formatting all stay in one place.

After the refactor, **adding a new notification type is ~15 lines** — a new entry in the event union and a new payload builder. No changes to the sender query, the SW, or the API route plumbing.

---

## Refactor: file-level changes

### Rename and restructure `src/lib/notifications/attendance.ts`

Rename to `src/lib/notifications/dispatch.ts` (it's no longer attendance-specific). Replace the single exported function with a small system:

```ts
// Discriminated event union — one variant per notification trigger.
type NotificationEvent =
  | { type: 'checkin'; employeeId: string; employeeName: string; attendanceId: string; at: Date; status: AttendanceStatus }
  | { type: 'checkout'; employeeId: string; employeeName: string; attendanceId: string; at: Date }
  | { type: 'leave_requested'; employeeId: string; employeeName: string; requestId: string; startDate: string; endDate: string; leaveType: LeaveType }
  | { type: 'leave_decided'; employeeId: string; requestId: string; decision: 'approved' | 'rejected'; startDate: string; endDate: string }
  | { type: 'day_off_requested'; employeeId: string; employeeName: string; requestId: string; isoYear: number; isoWeek: number; oldDay: DayOfWeek; newDay: DayOfWeek }
  | { type: 'day_off_decided'; employeeId: string; requestId: string; decision: 'approved' | 'rejected'; newDay: DayOfWeek; isoYear: number; isoWeek: number };

// Audience strategies: who receives this notification?
type Audience =
  | { kind: 'staff' }                            // all active managers + admins
  | { kind: 'specific_user'; userId: string };   // a single named user

// Each event maps to: audience, payload builder.
function eventConfig(event: NotificationEvent): {
  audience: Audience;
  payload: WebPushPayload;
}
```

Public API:

```ts
export async function notify(event: NotificationEvent): Promise<void>;
```

Internals:

- Resolve audience → run the appropriate sender query (`profiles!inner` filter by role list, or by single `user_id`).
- Build payload by switching on `event.type`.
- Fan-out via `Promise.allSettled`, exactly as today.
- Expired-cleanup, failure-count increment, defensive guard — all unchanged.

The defensive guard against `!inner` regression survives in this refactor and applies to the staff audience path. The `specific_user` path is RLS-equivalent — since we're querying by an explicit `user_id`, we don't need the role-shape guard, but we *should* still verify `is_active` to avoid notifying deactivated users.

### Backward-compatibility wrapper

Keep `notifyStaffOfCheckIn` as a thin re-export that calls `notify({ type: 'checkin', ... })`, so the existing call site at `src/app/api/checkin/route.ts:177` doesn't need to change in the same PR. Drop the wrapper after the new triggers ship.

---

## Event 1: Checkout notifications (Employee → Staff)

### Trigger location
[src/app/api/checkout/route.ts](src/app/api/checkout/route.ts) — after the existing `logActivity` call (around line 118).

### Required changes to the route
- Add `export const runtime = 'nodejs';` (mirror check-in).
- The current update at lines 101–112 doesn't return the row id. Add `.select('id').single()` so we can pass `attendanceId` into the notification payload.
- The current profile select doesn't fetch `full_name` (the route doesn't currently need it). Add `full_name` to whichever `profiles` select is in scope, or do a separate single-purpose fetch right before the notify call.
- After `logActivity`, wrap in `try/catch`:
  ```ts
  try {
    await notify({
      type: 'checkout',
      employeeId: user.id,
      employeeName: profile.full_name,
      attendanceId: updated.id,
      at: now,
    });
  } catch (err) {
    console.error('[checkout] notification dispatch failed', err);
  }
  ```

### Payload
- Title: `Pointage de départ`
- Body: `${employeeName} a pointé son départ à ${time}.`
- Tag: `attendance-checkout-${dateKey}-${employeeId}` (separate tag from check-in so the OS doesn't replace one with the other)
- URL: `/admin/attendance`

### Product question
Departure is lower-signal than arrival. **Recommendation:** ship it but make it controllable per-recipient later (Phase 5 polish), so a manager who finds it noisy can mute checkouts without losing arrivals. For v1, ship checkout notifications to all subscribed staff.

---

## Events 2 & 3: Leave request notifications

Two flows, two recipients.

### Event 2: Submit → notify staff (Employee → Staff)

**Trigger:** [src/app/api/leave/route.ts](src/app/api/leave/route.ts) POST handler, after the existing `logActivity('request_leave')` call (line 85).

**Data already in scope:** the inserted row's `id`, `start_date`, `end_date`, `type`. Missing: the requesting employee's `full_name`. The current insert select returns the leave row but not the joined profile. Two ways to handle:

- **Option A (cleanest):** add `, profiles:profiles!leave_requests_user_id_fkey(full_name)` to the insert's `.select(...)` — leverages the existing FK alias used elsewhere in `[id]/route.ts:11`.
- **Option B (simpler):** since we already loaded the profile for the `is_active` check (line 57), select `full_name` there and reuse it.

Go with **Option B** — it's a one-word change to an existing select.

**Notification:**
- Title: `Nouvelle demande de congé`
- Body: `${employeeName} a demandé un congé du ${start_date} au ${end_date}.` (use locale-aware date formatting, `Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long' })`)
- Tag: `leave-requested-${requestId}` (one tag per request — duplicate POSTs replace, distinct requests stack)
- URL: `/admin/leave`

### Event 3: Approve/Reject → notify employee (Staff → Employee)

**Trigger:** [src/app/api/leave/[id]/route.ts](src/app/api/leave/%5Bid%5D/route.ts), inside `updateLeaveAsAdmin` (lines 161–244). After the status update at line 208 succeeds and after the `logActivity('approve_leave' | 'reject_leave')` call (around line 239).

**Data already in scope:** `leave.user_id`, the existing `LEAVE_SELECT` already pulls in the employee's joined profile (line 11). The new `nextStatus` (`'approved'` or `'rejected'`) is the decision. `start_date`, `end_date` are on the row.

**Important:** only fire the notification when `nextStatus` is `'approved'` or `'rejected'`. If staff just edits an admin note without changing status, no notification. Same gating: don't notify on transitions to `'cancelled'` (employee-driven action) — those flow through the employee PATCH path at lines 93–159.

**Notification:**
- Title:
  - approved → `Demande de congé approuvée`
  - rejected → `Demande de congé refusée`
- Body: `Votre demande du ${start_date} au ${end_date} a été ${decision}.`
- Tag: `leave-decided-${requestId}` (only one decision per request, same tag fine)
- URL: `/leave` (employee's page)

---

## Events 4 & 5: Day-off change request notifications

Mirror leave request flows exactly. Same two-trigger structure.

### Event 4: Submit → notify staff (Employee → Staff)

**Trigger:** [src/app/api/day-off/route.ts](src/app/api/day-off/route.ts) POST, after `logActivity('request_day_off_change')` at line 162.

**Same Option B for fetching `full_name`** — leverage the existing profile fetch in this route.

**Notification:**
- Title: `Nouvelle demande de changement de jour`
- Body: `${employeeName} demande de changer son jour de repos de ${oldDayLabel} à ${newDayLabel} (semaine ${isoWeek}).`
  - `oldDayLabel` / `newDayLabel`: French day names — add a helper `dayOfWeekLabelFr(day: DayOfWeek): string`.
- Tag: `day-off-requested-${requestId}`
- URL: `/admin/day-off`

### Event 5: Approve/Reject → notify employee (Staff → Employee)

**Trigger:** [src/app/api/day-off/[id]/route.ts](src/app/api/day-off/%5Bid%5D/route.ts), inside `updateAsAdmin` (lines 171–261). After the status transition at line 218 and after `logActivity('approve_day_off_change' | 'reject_day_off_change')` at line 249.

**Data in scope:** `change.user_id`, `change.new_day`, `change.iso_year`, `change.iso_week`, profile via `CHANGE_SELECT` (line 14).

**Notification:**
- Title:
  - approved → `Changement de jour approuvé`
  - rejected → `Changement de jour refusé`
- Body: `Votre demande de changement vers ${newDayLabel} (semaine ${isoWeek}) a été ${decision}.`
- Tag: `day-off-decided-${requestId}`
- URL: `/day-off` (employee's page)

---

## Required infrastructure changes

### A. Allow employees to subscribe (RLS rewrite)

Currently [supabase/migrations/0009_push_subscriptions.sql](supabase/migrations/0009_push_subscriptions.sql) has 4 staff-only RLS policies. Each requires `role IN ('manager', 'admin')`.

**New migration:** `supabase/migrations/0010_allow_employee_push_subscriptions.sql`

Replace the role gate. The simplest correct version:

```sql
drop policy "push_subscriptions_select_own_staff" on public.push_subscriptions;
drop policy "push_subscriptions_insert_own_staff" on public.push_subscriptions;
drop policy "push_subscriptions_update_own_staff" on public.push_subscriptions;
drop policy "push_subscriptions_delete_own_staff" on public.push_subscriptions;

-- Anyone active and authenticated can manage their own subscriptions.
create policy "push_subscriptions_select_own"
on public.push_subscriptions for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_active = true
  )
);
-- ... three more policies (insert / update / delete) following the same shape.
```

Note: the `role IN (...)` clause goes away entirely. The "only staff *receive* notifications about employee events" property is now enforced by the **sender query**, not RLS. This is the correct division of concerns:

- **RLS:** "who can write a row." Anyone active.
- **Sender:** "who receives this specific event." Determined by event type.

This is consistent with the existing principle: RLS is the security boundary against direct `supabase.from(...)` calls; the API route + sender are the product-rule layer.

### B. API route changes

**`src/app/api/notifications/subscribe/route.ts`** at line 38: remove the `isStaffRole` check. Active employees can subscribe. The Zod validation, endpoint reassignment cleanup (delete-then-upsert), and `runtime: 'nodejs'` all stay.

`unsubscribe/route.ts` and `status/route.ts`: no changes — they already only require `is_active`.

### C. Sender-query split

Current single query (`profiles!inner` filtered to staff roles) becomes one of two paths:

```ts
// audience = { kind: 'staff' }: existing query, unchanged.
// audience = { kind: 'specific_user', userId }:
const { data, error } = await service
  .from('push_subscriptions')
  .select(`id, user_id, endpoint, p256dh, auth, failure_count,
    profiles!inner ( id, is_active )
  `)
  .eq('enabled', true)
  .eq('user_id', userId)
  .eq('profiles.is_active', true);
```

Then a defensive guard: throw if any returned row's `user_id !== userId`, or `profiles.is_active === false`. (The `!inner` regression risk applies here too — same comment block from `attendance.ts` should accompany this query.)

### D. Notification button visible to employees

Currently [src/components/shell/AdminTopBar.tsx](src/components/shell/AdminTopBar.tsx) and [src/components/shell/MobileNavMoreSheet.tsx](src/components/shell/MobileNavMoreSheet.tsx) render `<NotificationPermissionButton />` gated on `isStaffRole(role)`. Employees never see the button.

Need an equivalent surface in the employee shell:

- **Desktop employee:** there's no `EmployeeTopBar` analogue — the employee uses `EmployeeHeader`/`EmployeeNav`. Read those to confirm where an account-menu lives, and add the button there. If no account menu exists, add a simple settings dropdown.
- **Mobile employee:** `EmployeeNav` likely has its own "Plus" sheet equivalent (or doesn't). Add the button there using `variant="sheet"`.

Drop the `isStaffRole(role)` gate at both insertion sites (or replace with `is_active` if there's any concern about deactivated users seeing the toggle — RLS would block them anyway).

The button component itself ([src/components/notifications/NotificationPermissionButton.tsx](src/components/notifications/NotificationPermissionButton.tsx)) needs zero changes. Its variant prop already covers both shells. iOS permission timing rules apply identically.

### E. Updated French copy hint

The button currently uses generic French copy (`Activer les notifications`). Both staff and employees see the same labels — fine. No change needed.

---

## Notification audit by audience

A useful sanity check after wiring everything:

| Event | Staff sees? | Employee sees? |
|---|---|---|
| Their own check-in | No (they're the actor) | No |
| Other employee's check-in | Yes | No |
| Their own checkout | No | No |
| Other employee's checkout | Yes | No |
| Their own leave request submitted | No | No |
| Other employee's leave request submitted | Yes | No |
| Their own leave approved | No | **Yes** |
| Their own leave rejected | No | **Yes** |
| Other employee's leave approved/rejected | No | No |
| Their own day-off submitted | No | No |
| Other employee's day-off submitted | Yes | No |
| Their own day-off decision | No | **Yes** |

Edge cases:

- **Staff requesting their own leave / day-off:** they get a staff-side notification (because all staff are subscribed) about their own request. Solution: in the sender, when audience is `staff`, exclude the actor's own `user_id`. Add a `excludeUserId?: string` field to the staff audience variant.
- **Staff approving their own request:** same — exclude the actor.
- **Manager A approving Manager B's request:** B should be notified (it's their request), but B is also in the staff audience — they'd get *two* notifications. The exclude-actor logic on the staff path handles the first; the specific_user path handles the second correctly. So B gets exactly one. Verify in QA.

---

## Implementation order

Three phases. Each phase ends with `npm run typecheck && npm run build` clean and a manual smoke test before the next.

### Phase 1 — Refactor (no behavior change)

Goal: replace `notifyStaffOfCheckIn` with `notify(event)` and a configured event registry. Keep the wrapper so check-in keeps working unchanged.

Files:
- Rename `src/lib/notifications/attendance.ts` → `src/lib/notifications/dispatch.ts`. Rewrite as `notify(event)` + helper splits.
- Add `notifyStaffOfCheckIn` thin wrapper in the same file (or in `attendance.ts` re-export shim) so `src/app/api/checkin/route.ts` still compiles.
- Add `dayOfWeekLabelFr` helper to `src/lib/utils/date.ts` (or wherever French formatting helpers live).

Verify: existing check-in notification still works end-to-end on localhost.

### Phase 2 — Add staff-direction events (Employee → Staff)

Doesn't require RLS changes, doesn't require employee subscription UI. Lower risk, higher value.

Files modified:
- `src/app/api/checkout/route.ts` — runtime, `.select('id').single()`, profile `full_name`, `notify({ type: 'checkout', ... })`.
- `src/app/api/leave/route.ts` — extend profile select, `notify({ type: 'leave_requested', ... })`.
- `src/app/api/day-off/route.ts` — extend profile select, `notify({ type: 'day_off_requested', ... })`.
- `src/lib/notifications/dispatch.ts` — implement `excludeUserId` on staff audience and use it for self-exclusion.

Verify on localhost: a manager subscribes; an employee checks out / requests leave / requests day-off swap; the manager receives one notification per event with correct title, body, tag, and click URL.

### Phase 3 — Add employee-direction events (Staff → Employee)

This is the biggest jump. Includes the RLS migration, the subscribe-route gate change, the employee subscription UI surface, and the `specific_user` audience path.

Files added:
- `supabase/migrations/0010_allow_employee_push_subscriptions.sql`.

Files modified:
- `src/app/api/notifications/subscribe/route.ts` — drop `isStaffRole` check.
- `src/lib/notifications/dispatch.ts` — implement `specific_user` audience path with the equivalent defensive guard.
- `src/app/api/leave/[id]/route.ts` — call `notify({ type: 'leave_decided', ... })` inside `updateLeaveAsAdmin` after the status flip.
- `src/app/api/day-off/[id]/route.ts` — same for `updateAsAdmin`.
- Employee shell components — surface `<NotificationPermissionButton />` (desktop + mobile sheet equivalent in employee navigation).

Verify on localhost:
- An employee can now click "Activer les notifications" and a row lands in `push_subscriptions`.
- Manager approves the employee's leave → the employee receives a notification, manager receives nothing.
- Manager rejects another request → same shape.
- Verify RLS: open the SQL editor as the employee user (or use Supabase JWT impersonation) and confirm they can write a row to `push_subscriptions` for themselves — and *cannot* write for another user.

### Phase 4 — Real-device QA

No code changes. Test all event types on Android Chrome PWA install and iOS 16.4+ Home Screen install:

- Each event type fires the right title/body.
- Tag dedup works (same employee, same request, same day → one notification, not two).
- Different events for the same employee don't replace each other (checkout doesn't replace check-in).
- Click routing lands on the right page (admin event → admin page; employee event → employee page).
- An employee whose role gets downgraded mid-session stops receiving staff notifications immediately (sender filters by current role on every dispatch).
- Expired subscription cleanup works for both audiences.

### Phase 5 (later, optional) — Per-recipient preferences

The volume of notifications per manager scales with team size and event count. After running Phases 1–3 in production for a few days:

- Add a `notification_preferences` table or JSONB column on `profiles` keyed by event type (`checkin`, `checkout`, `leave_requested`, etc.).
- In `dispatch.ts`, the staff audience query joins on preferences and filters out subscribers who muted that event.
- Add a per-event toggle to the subscribe UI (a small drawer with checkboxes — keep it simple).

This is the scalable answer to "too many notifications" — better than blanket caps, better than digest mode for v1.

---

## Critical files (high-risk, double-check before merging)

- `src/lib/notifications/dispatch.ts` — both audience paths and both defensive guards. The `!inner` regression is the same silent-failure risk as today, doubled.
- `supabase/migrations/0010_allow_employee_push_subscriptions.sql` — RLS rewrite. Verify in SQL editor that an employee can manage **only their own** rows, and cannot escalate to write rows for other users.
- Each of the five new `notify(...)` call sites — must be wrapped in try/catch, must not throw to the caller, must not run before the DB write succeeds, must not run on duplicate-rejection paths (e.g. checkout's existing 409 guard).
- The actor-self-exclusion logic on the staff audience path — easy to forget; without it, every staff member sees their own check-ins/checkouts/etc.

---

## Verification checklist

- [ ] Phase 1: `npm run typecheck` clean. Existing check-in notifications still work end-to-end.
- [ ] Phase 2: `npm run typecheck && npm run build` clean. Manual test: manager receives notifications for checkout, leave-submit, day-off-submit. Manager does *not* receive a notification for their own checkout.
- [ ] Phase 3: migration applies cleanly. RLS verification: employee can write own row, cannot write for others. Subscribe route accepts employee subscription. Employee receives leave-decided / day-off-decided notification when staff acts on their request.
- [ ] No notification fires when a request is updated without status change (e.g. admin note edit).
- [ ] No notification fires on cancel paths (employee-driven cancellation).
- [ ] Tag dedup verified across all event types.
- [ ] Click-routing lands on the correct page for each event.
- [ ] Role downgrade stops staff-direction notifications immediately.
- [ ] Subscription deactivation stops user-direction notifications immediately.
- [ ] Expired subscription cleanup works on both audience paths.
- [ ] Check-in route still returns success even if all notification sends fail (verified by killing VAPID env vars temporarily).

---

## Effort estimate

- **Phase 1 (refactor):** ~30 min, mostly mechanical.
- **Phase 2 (staff-direction events):** ~45 min — three nearly-identical wirings.
- **Phase 3 (employee-direction events):** ~60–75 min — the migration, subscribe-route change, employee shell UI surface, two `notify` calls. Mostly time on the employee shell since I haven't read those components yet.
- **Phase 4 (QA):** ~30 min real-device.
- **Phase 5 (preferences):** out of scope for this plan — separate effort if/when noise becomes a real problem.

**Total active dev: ~2.5 hours.** Most of the leverage comes from the Phase 1 refactor; everything after that is roughly copy-paste with different payloads.

---

## Open questions for you

1. **Checkout notifications: ship or skip?** Lower signal than arrivals. My take: ship them now, add the per-event mute in Phase 5 if managers complain. Other reasonable answer: skip checkout entirely for v1, since "who left at 5pm" rarely needs a real-time push.

2. **Leave/day-off cancellation by employee: notify staff or not?** When an employee withdraws their own pending request, staff currently see no notification. Symmetry would suggest yes (you knew about the request, you should know it's withdrawn). Counterargument: low-urgency, just shows up in the next list refresh. Default to **no** unless you tell me otherwise.

3. **What about admin-side direct creation of leave / day-off changes?** [src/app/api/leave/all/route.ts](src/app/api/leave/all/route.ts) lets admins create leave directly for an employee with immediate approval. Should the affected employee get a notification (`leave_decided`)? My take: yes — the employee should know their PTO was assigned. Flag for the implementation, easy to wire.

4. **Employee subscriptions UI: how visible?** Today the staff button lives in the account dropdown. For employees, the same dropdown works on desktop. But the employee mobile shell needs a similar surface. Are you OK with me adding a "Plus" sheet to the employee mobile nav if one doesn't exist, or would you rather settle for desktop-only employee subscription in v1?

5. **Notification button label once both roles see it:** today it's `Activer les notifications`. That's fine for both audiences, but if you want different copy for employees ("Activer les notifications pour mes congés") let me know — the variant prop can carry it.
