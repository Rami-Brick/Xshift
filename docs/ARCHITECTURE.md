# Architecture

## Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4** — CSS-first config via `@theme` directive in `src/app/globals.css`; no `tailwind.config.ts`
- **Local design-kit** at `./design-kit/` — 13 primitives + 11 compounds, token-based, DM Sans, 20px card radius
- **Supabase** — Auth (email/password) + Postgres, accessed via `@supabase/ssr`
- **next-intl** — French-only messages at `messages/fr.json`
- **react-hook-form** + **zod** — forms + validation (shared client/server schemas)
- **date-fns** + **date-fns-tz** — Africa/Tunis timezone math
- **sonner** — toasts
- **lucide-react** — icons
- **recharts** — used by the design-kit's `StackedBarChart`
- **swr** — only on the admin dashboard for 60s stats polling
- **react-leaflet** + **leaflet** — office map preview on the settings page (client-only, dynamic import)

No TanStack Query — the 4-employee scale doesn't justify it. Native `fetch` + Server Components handle reads; Server Actions and Route Handlers handle writes.

## Folder layout

```
XshiftClaude/
  docs/                       handoff documentation
  design-kit/                 reusable UI kit (consumed as-is, 2 small tweaks for Tailwind v4)
  messages/fr.json            French strings
  public/
    manifest.webmanifest
    icons/icon-{192,512,maskable-512}.png
    favicon.svg
  supabase/
    migrations/0001_init.sql
    migrations/0002_seed.sql
    migrations/0003_functions.sql
  src/
    app/
      layout.tsx
      globals.css             Tailwind v4 @theme tokens (ported from design-kit)
      page.tsx
      providers.tsx           Sonner + NextIntlClientProvider
      (auth)/login/
      (employee)/
        layout.tsx            BottomNavBar, employee header
        dashboard/
        history/
        leave/
      (admin)/
        layout.tsx            SideNavRail (desktop) + drawer (mobile), admin header
        dashboard/
        employees/
        employees/[id]/
        attendance/
        leave/
        reports/
        settings/
        logs/
      api/
        checkin/
        checkout/
        attendance/
        employees/
        leave/
        settings/
        logs/
        admin/stats/
        reports/attendance.csv/
    components/
      shell/                  headers, admin drawer
      attendance/             CheckInButton, TodayCard, MonthFilter
      admin/                  forms, dialogs, filter bars, map preview
      leave/                  LeavePageClient, dialogs, admin leave table
    lib/
      supabase/               browser.ts, server.ts, service.ts, middleware.ts
      attendance/             geo.ts, status.ts, format.ts
      validation/             zod schemas per domain
      i18n/                   next-intl config
      auth/                   guards.ts, actions.ts
      activity/               log.ts
      utils/                  date.ts, cn.ts
    middleware.ts             session refresh + route gates
    types/index.ts
```

## Server vs Client

### Server components / layouts

- Initial auth + role checks
- Layout-level profile lookup
- Server reads for list pages

### Client components

- Forms
- `navigator.geolocation`
- Toasts
- Interactive tables / filters / dialogs
- Leaflet map

### Route Handlers vs Server Actions

- **Server Action** - login/logout only today.
- **Route Handler (`src/app/api/*`)** - JSON/HTTP mutations and data endpoints: `POST /api/checkin`, `POST /api/checkout`, attendance CRUD, employee CRUD, leave CRUD, settings save, logs, admin stats, and CSV export.

Role is enforced server-side in every handler. The service-role client is used from server-only code after `requireAdmin()` for admin list/detail reads and admin mutations, and from check-in/check-out handlers for controlled attendance writes. It is never imported by `"use client"` files.

## Supabase clients

- `src/lib/supabase/browser.ts` — `createBrowserClient` for client components.
- `src/lib/supabase/server.ts` — `createServerClient` reading/writing cookies via `next/headers`.
- `src/lib/supabase/middleware.ts` — cookie refresh helper used from `src/middleware.ts`.
- `src/lib/supabase/service.ts` — service-role client, server-only. Never imported from a `"use client"` file.

## Data fetching

- Server-side auth + role checks in layouts.
- Employee pages read through `createServerClient` and RLS-scoped user access.
- Admin pages read through `createServiceClient()` after `requireAdmin()` because the current RLS policies do not grant admins broad browser/client access.
- Client components handle GPS capture, dialogs, filters, toasts, and admin dashboard polling.
- Admin mutations go through route handlers backed by the service client.

## Auth

- Email + password.
- First admin created manually in the Supabase dashboard (see `SETUP.md`).
- Admin creates employee accounts through `POST /api/employees` using the service client.
- `0001_init.sql` also installs `app_private.handle_new_user()`, which auto-creates a minimal `profiles` row after every Supabase Auth user insert. The employee create route must account for that trigger when writing the final profile fields.
- Middleware refreshes the session cookie on every request and redirects unauthenticated traffic to `/login`.
- Layouts perform a second server-side role check as defense in depth.

## Current implementation notes

- Migrations and running app code are the current source of truth. These docs should describe that state, and known code issues should be fixed in code rather than documented as intended behavior.
- The current migration set does not define a public `is_admin()` RLS helper. Admin access is enforced in Next.js server code, then performed with the service-role client.
- `supabase/migrations/0003_functions.sql` defines `public.decrement_leave_balance(...)`, used by admin leave assignment/review.

## Route groups

- `(auth)` — `/login`
- `(employee)` — `/dashboard`, `/history`, `/leave`
- `(admin)` — `/admin/*`

## UI direction

Use the local design-kit for everything visual. Tokens are the source of truth — no raw hex in app components. The kit's `BottomNavBar` is used as-is for the employee shell. Admin gets a custom drawer on mobile (kit ships no drawer) plus the kit's `SideNavRail` on desktop.

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Keep `.env.local` git-ignored. Commit `.env.example` only.
