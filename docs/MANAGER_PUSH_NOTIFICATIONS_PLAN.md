# Manager Push Notifications Plan

## Goal

Add Web Push notifications to Xshift so staff users (`manager` and `admin`) can opt in to receive a mobile/desktop notification whenever an employee marks their arrival attendance.

Example notification:

```text
Nouveau pointage
Yassine Ben Ali a pointe son arrivee a 08:31.
```

This plan is written for the current codebase:

- Next.js 15 App Router
- Supabase Auth/Postgres
- Vercel deployment
- Existing PWA files in `public/manifest.webmanifest` and `public/sw.js`
- Existing employee check-in endpoint at `src/app/api/checkin/route.ts`
- Existing staff model where `manager` and `admin` are staff roles

## Feasibility Summary

This is doable on the current Supabase free tier.

The preferred v1 implementation should send notifications from the existing Next.js API route after the attendance row is successfully written. That keeps the flow simple, avoids adding a Supabase Database Webhook dependency, and keeps Supabase usage low.

Supabase free tier is still suitable because the database additions are tiny and the notification send is not a heavy workload. If a Supabase Edge Function is used later, the free tier currently includes a large monthly invocation allowance relative to an attendance system's likely volume.

## Mobile PWA Support

### Android

Android Chrome and Chromium-based browsers support standards-based Web Push for installed PWAs and normal sites, subject to user permission.

### iPhone and iPad

iOS and iPadOS support Web Push for Home Screen web apps starting with iOS/iPadOS 16.4.

Important iOS rules:

- The manager must install Xshift to the Home Screen.
- The manifest must use app-like display mode, which this app already does with `"display": "standalone"`.
- Notification permission must be requested from a direct user action, such as tapping an "Enable notifications" button.
- The installed Home Screen app must be the context where the manager grants permission.
- Push notifications can appear on the Lock Screen and Notification Center, but iOS delivery can be stricter than Android.

References:

- WebKit: `https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/`
- MDN Push API: `https://developer.mozilla.org/en-US/docs/Web/API/Push_API`
- Supabase Edge Functions push example: `https://supabase.com/docs/guides/functions/examples/push-notifications`

## Recommended Architecture

```text
Manager opens app
  -> taps Enable notifications
  -> browser creates PushSubscription
  -> app stores subscription in Supabase via a Next.js API route

Employee taps Pointer
  -> existing /api/checkin validates auth, GPS, day off, duplicate pointage
  -> attendance row is upserted
  -> activity log is written
  -> server loads active staff push subscriptions
  -> server sends Web Push notification to each staff device
  -> invalid/expired subscriptions are removed
```

## Why Next.js API Routes for v1

Use Next.js server routes for v1 instead of Supabase Database Webhooks.

Benefits:

- The attendance write already happens in `src/app/api/checkin/route.ts`.
- The app already has `SUPABASE_SERVICE_ROLE_KEY` in server-only code via `src/lib/supabase/service.ts`.
- Vercel server routes can use the Node package `web-push`.
- The notification can be sent only after all existing business rules pass.
- It avoids accidental notifications from manual admin attendance edits in `src/app/api/attendance/all/route.ts`.
- It avoids needing to configure and monitor a Supabase Database Webhook for the first version.

Supabase Edge Functions remain a good later option if notifications need to be triggered by multiple systems outside the Next.js app.

## Data Model

Create a new table for browser push subscriptions.

Recommended migration:

```sql
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_label text,
  enabled boolean not null default true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx
on public.push_subscriptions(user_id);

create index push_subscriptions_enabled_idx
on public.push_subscriptions(enabled)
where enabled = true;

alter table public.push_subscriptions enable row level security;
```

Recommended trigger:

```sql
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();
```

Recommended RLS policies:

```sql
create policy "push_subscriptions_select_own"
on public.push_subscriptions
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "push_subscriptions_insert_own"
on public.push_subscriptions
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "push_subscriptions_update_own"
on public.push_subscriptions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "push_subscriptions_delete_own"
on public.push_subscriptions
for delete
to authenticated
using (user_id = (select auth.uid()));
```

The notification sender should use the service role and should only target users whose `profiles.role in ('manager', 'admin')` and `profiles.is_active = true`.

## Environment Variables

Add VAPID keys.

`.env.example`:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
```

Vercel project settings:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

Generate keys locally with the `web-push` package:

```powershell
npx web-push generate-vapid-keys
```

The public key is safe for the browser. The private key must stay server-only and must not use the `NEXT_PUBLIC_` prefix.

## Dependencies

Install:

```powershell
npm install web-push
npm install -D @types/web-push
```

If TypeScript compatibility is awkward with `web-push`, keep the sender helper isolated in one server-only module.

## Files to Add

### `supabase/migrations/<next>_push_subscriptions.sql`

Adds the `push_subscriptions` table, indexes, trigger, and RLS policies.

Use the next migration number after the current sequence. The current latest migration is:

```text
supabase/migrations/0008_add_manager_role.sql
```

So the likely next file is:

```text
supabase/migrations/0009_push_subscriptions.sql
```

### `src/lib/notifications/web-push.ts`

Server-only helper responsible for sending push messages.

Responsibilities:

- Import `server-only`.
- Configure VAPID details from env vars.
- Accept a subscription and payload.
- Call `webpush.sendNotification(...)`.
- Treat HTTP 404/410 as expired subscriptions.
- Return structured success/failure results.

Suggested payload shape:

```ts
type WebPushPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};
```

### `src/lib/notifications/attendance.ts`

Server-only helper for attendance-specific notifications.

Responsibilities:

- Load active `manager` and `admin` subscriptions.
- Build the French notification text.
- Send to all staff subscriptions.
- Remove expired subscriptions or mark repeated failures.
- Avoid throwing errors that would make check-in fail after attendance has already succeeded.

Recommended function:

```ts
notifyStaffOfCheckIn({
  employeeId,
  employeeName,
  attendanceId,
  checkInAt,
  status,
});
```

### `src/app/api/notifications/subscribe/route.ts`

Authenticated route to save or update the current user's push subscription.

Behavior:

- Require logged-in user.
- Load profile using normal Supabase server client.
- Reject inactive users.
- Reject employees if v1 only supports staff recipients.
- Accept `endpoint`, `keys.p256dh`, `keys.auth`, optional `device_label`.
- Upsert by `endpoint`.
- Set `enabled = true`.
- Return `{ success: true }`.

Important:

- This route should use the server user session to set `user_id`.
- Do not trust a `user_id` sent by the browser.

### `src/app/api/notifications/unsubscribe/route.ts`

Authenticated route to disable or delete a subscription.

Behavior:

- Require logged-in user.
- Accept `endpoint`.
- Set `enabled = false` or delete the row.
- Return `{ success: true }`.

Soft-disable is useful for diagnostics. Hard-delete is simpler. Prefer soft-disable for v1 because it helps debugging.

### `src/app/api/notifications/status/route.ts`

Optional but useful route for the settings UI.

Behavior:

- Require logged-in user.
- Return whether the server has an enabled subscription for the current browser endpoint.
- The frontend can also inspect `Notification.permission`.

## Files to Modify

### `public/sw.js`

Add push handling to the existing service worker.

Current service worker already handles:

- install
- activate
- static asset caching
- fetch for static assets

Add:

```js
self.addEventListener('push', (event) => {
  const fallback = {
    title: 'Xshift',
    body: 'Nouvelle notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    url: '/admin/dashboard',
  };

  const payload = event.data ? event.data.json() : fallback;
  const title = payload.title || fallback.title;

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || fallback.body,
      icon: payload.icon || fallback.icon,
      badge: payload.badge || fallback.badge,
      tag: payload.tag || 'xshift-notification',
      data: {
        url: payload.url || fallback.url,
        ...(payload.data || {}),
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/admin/dashboard';
  const targetUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
```

iOS note: every `push` event should result in a visible notification. Avoid using silent push messages.

### `src/app/providers.tsx`

Current behavior only registers the service worker in production:

```ts
if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
  return;
}
```

Options:

1. Keep this as-is for production-first testing on Vercel.
2. Allow service worker registration on localhost for desktop development.

Recommended v1:

- Keep production behavior for minimal risk.
- Add a small comment in the implementation PR explaining that local push testing requires service worker registration on localhost or a deployed preview URL.

### `src/app/api/checkin/route.ts`

Modify after successful attendance upsert and activity logging.

Current flow:

- Authenticate user.
- Validate GPS.
- Load office settings, profile, day-off overrides.
- Reject invalid pointage conditions.
- Upsert `attendance`.
- Write `logActivity(...)`.
- Return success.

Needed changes:

- Select `full_name` from `profiles` in the existing profile query:

```ts
.select('full_name, work_start_time, default_day_off')
```

- Return the upserted attendance ID, or query it after upsert.
- After `logActivity`, call `notifyStaffOfCheckIn(...)`.
- Wrap notification send in `try/catch`.
- Log errors server-side, but do not fail the employee check-in if push sending fails.

Recommended order:

```text
1. Save attendance
2. Log activity
3. Fire notification best-effort
4. Return success
```

Important:

- Do not send notification before the database write succeeds.
- Do not send on duplicate check-in rejection.
- Do not send from manual attendance creation unless the product explicitly wants that later.

### `src/types/index.ts`

Add a type for push subscriptions if frontend/backend shared typing is useful:

```ts
export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  device_label: string | null;
  enabled: boolean;
  last_success_at: string | null;
  last_failure_at: string | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
}
```

### `src/components/...`

Add a manager/admin notification control.

Recommended placement:

- v1: account dropdown in `src/components/shell/AdminTopBar.tsx`
- v2: dedicated notification settings panel under `/admin/settings`

Why `AdminTopBar` for v1:

- It is visible to both `manager` and `admin`.
- Settings page is admin-only in this app.
- Managers also need to opt in.

Recommended component:

```text
src/components/notifications/NotificationPermissionButton.tsx
```

States:

- Unsupported browser
- iOS instructions needed
- Permission default
- Permission granted and subscribed
- Permission denied
- Subscribe loading
- Unsubscribe loading
- Error

Button labels in French:

- `Activer les notifications`
- `Notifications activees`
- `Desactiver les notifications`
- `Notifications bloquees`

Use `Bell` / `BellOff` icons from `lucide-react`.

## Client Subscription Flow

Create a client helper:

```text
src/lib/notifications/client.ts
```

Responsibilities:

- Check support:
  - `serviceWorker` in `navigator`
  - `PushManager` in `window`
  - `Notification` in `window`
- Wait for service worker registration.
- Request permission only from button click.
- Convert VAPID public key from base64url to `Uint8Array`.
- Call `registration.pushManager.subscribe(...)`.
- POST subscription to `/api/notifications/subscribe`.
- Support unsubscribe:
  - `registration.pushManager.getSubscription()`
  - POST endpoint to `/api/notifications/unsubscribe`
  - call `subscription.unsubscribe()`

VAPID conversion helper:

```ts
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
```

## Notification Content

Recommended payload:

```json
{
  "title": "Nouveau pointage",
  "body": "Yassine Ben Ali a pointe son arrivee a 08:31.",
  "icon": "/icons/icon-192.png",
  "badge": "/icons/icon-192.png",
  "tag": "attendance-checkin-2026-04-25-user-id",
  "url": "/admin/attendance",
  "data": {
    "type": "attendance_checkin",
    "attendanceId": "..."
  }
}
```

Formatting rules:

- Use office timezone from `office_settings.timezone` if available.
- Fallback to `Africa/Tunis`, which the app already uses.
- Keep the body short for lock screens.
- Do not include sensitive GPS coordinates in notifications.

## Security Notes

- Never expose `VAPID_PRIVATE_KEY` to the browser.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
- The subscribe route must derive `user_id` from the authenticated session.
- Only staff users should be allowed to subscribe in v1.
- The sender should only target active `manager` and `admin` profiles.
- Store push endpoints carefully. They are capability URLs and should not be logged in full.
- RLS should allow users to manage only their own subscriptions.
- Service role access is acceptable in server-only notification sender code.

## Failure Handling

Notification delivery should be best-effort.

If notification sending fails:

- The employee's successful check-in should still return success.
- Expired subscriptions should be disabled/deleted when `web-push` returns 404 or 410.
- Temporary failures should increment `failure_count` and set `last_failure_at`.
- A later cleanup can disable subscriptions with repeated failures.

Recommended cleanup rule:

```text
If failure_count >= 5, set enabled = false.
```

## Testing Plan

### Unit/Type Checks

Run:

```powershell
npm run typecheck
```

If lint script is fixed/available:

```powershell
npm run lint
```

Note: `package.json` currently uses `next lint`, which may need adjustment for newer Next.js versions if it fails.

### Desktop Browser Test

1. Deploy to Vercel preview or enable local service worker registration on localhost.
2. Log in as a manager/admin.
3. Click "Activer les notifications".
4. Confirm browser permission.
5. Verify a row exists in `push_subscriptions`.
6. Log in as employee on another browser/device.
7. Mark arrival.
8. Confirm manager receives notification.
9. Tap notification and confirm it opens `/admin/attendance`.

### Android Test

1. Open deployed PWA in Chrome.
2. Install the app.
3. Log in as manager/admin.
4. Enable notifications.
5. Trigger employee check-in.
6. Confirm notification appears when PWA is backgrounded/closed.

### iOS Test

1. Use iPhone/iPad on iOS/iPadOS 16.4 or newer.
2. Open the deployed site in Safari.
3. Add Xshift to Home Screen.
4. Open Xshift from the Home Screen icon.
5. Log in as manager/admin.
6. Tap "Activer les notifications".
7. Accept permission prompt.
8. Trigger employee check-in.
9. Confirm notification appears on Lock Screen or Notification Center.

If iOS does not prompt:

- Confirm the app was opened from the Home Screen icon.
- Confirm manifest `display` is `standalone`.
- Confirm the permission request happens from a button click.
- Confirm iOS version is 16.4 or newer.

## Rollout Plan

### Phase 1 - Backend and PWA Foundation

- Add VAPID env vars.
- Install `web-push`.
- Add `push_subscriptions` migration.
- Add server-side Web Push helper.
- Add service worker `push` and `notificationclick` listeners.

### Phase 2 - Staff Opt-In UI

- Add client notification helper.
- Add `NotificationPermissionButton`.
- Place it in `AdminTopBar` account menu or a small staff-visible settings area.
- Add subscribe/unsubscribe API routes.

### Phase 3 - Attendance Trigger

- Update `src/app/api/checkin/route.ts`.
- Load employee `full_name`.
- Notify active staff subscriptions after successful check-in.
- Ensure failures are logged but do not break check-in.

### Phase 4 - QA on Real Devices

- Test desktop Chrome.
- Test Android PWA.
- Test iOS Home Screen PWA.
- Verify expired subscription cleanup.
- Verify manager and admin receive notifications, employees do not.

### Phase 5 - Optional Enhancements

- Add in-app notification center.
- Add Supabase Realtime toast for staff while dashboard is open.
- Add notification preferences:
  - arrivals
  - late arrivals only
  - check-outs
  - leave requests
- Add a staff notification history table.
- Add digest mode for high employee counts.
- Add "Test notification" button for admins/managers.

## Acceptance Criteria

- Managers/admins can enable notifications from the app.
- Employees cannot subscribe as notification recipients in v1.
- Subscriptions are stored in Supabase and tied to the logged-in user.
- A successful employee arrival pointage sends a push notification to active staff subscriptions.
- Duplicate/rejected check-ins do not send notifications.
- Manual admin attendance edits do not send notifications in v1.
- Clicking the notification opens `/admin/attendance`.
- Expired subscriptions are cleaned up or disabled.
- Check-in still succeeds if push sending fails.
- Android mobile PWA works.
- iOS Home Screen PWA works on iOS/iPadOS 16.4 or newer.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| iOS manager expects notifications from Safari tab | Show short UI copy that iPhone users must install/open the Home Screen app. |
| Notification permission denied | Show disabled state and tell user to re-enable notifications in browser/system settings. |
| Expired push subscriptions pile up | Remove or disable 404/410 subscriptions after send attempts. |
| Too many notifications for large teams | Add preferences or late-only mode later. |
| Service worker changes break static cache | Keep push handlers additive and avoid changing existing fetch behavior. |
| Notification send slows check-in response | Send after DB write and keep it best-effort; if needed later, move sending to a background queue or Supabase Edge Function. |

## Future Alternative: Supabase Edge Function

If the notification trigger needs to become database-driven later:

```text
attendance insert
  -> Supabase Database Webhook
  -> Supabase Edge Function
  -> load staff subscriptions
  -> send Web Push
```

Use this if:

- Attendance can be created by systems outside Next.js.
- Notifications need to be decoupled from user-facing request latency.
- A centralized event pipeline is introduced.

For the current app, keep v1 in Next.js because the existing check-in route is the single source of truth for employee pointage.
