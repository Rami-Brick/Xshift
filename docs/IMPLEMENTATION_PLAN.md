# Implementation Plan

The authoritative phased plan lives at:

```
C:\Users\Rami\.claude\plans\1-manual-in-supabase-since-i-nested-stardust.md
```

It describes 11 phases (scaffold → DB → auth → shell → employee attendance → admin employees → admin attendance → leave → settings → dashboard/logs → reports → polish), with concrete file paths, design-kit components used, gotchas, and verification steps per phase.

## Execution order summary

| Phase | Deliverable |
|------:|---|
| 0 | Next.js 15 scaffold, Tailwind v4, design-kit port, next-intl, PWA manifest, Supabase clients |
| 1 | `supabase/migrations/0001_init.sql` + `0002_seed.sql` + `SETUP.md` |
| 2 | Email/password login, middleware, role-gated layouts |
| 3 | App shell (employee bottom nav, admin side-rail + drawer) |
| 4 | Employee attendance (check-in/out APIs, dashboard, history) |
| 5 | Admin employees CRUD |
| 6 | Admin attendance (full edit/create/delete) |
| 7 | Leave (employee view + admin assign) |
| 8 | Admin settings (+ Leaflet map preview) |
| 9 | Admin dashboard + logs |
| 10 | CSV export |
| 11 | Loading/error/empty states, PWA audit, lint/build green |

## Per-phase verification

Every phase must end with:

- `npm run lint` — zero warnings
- `npm run build` — zero errors
- Manual QA of that phase's user-facing behavior

The final phase additionally verifies the full employee flow (login → check in → check out → history → leave) and the full admin flow (create employee → edit attendance → assign leave → update settings → export CSV → view logs) on both desktop and installed-PWA mobile.
