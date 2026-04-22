# Claude Code Handoff

Build location:

```
c:\Users\Rami\Desktop\Business\Attendance\XshiftClaude
```

This is the single working directory for Xshift. No sibling projects are referenced.

## Must read first

1. `docs/PROJECT_BRIEF.md`
2. `docs/ARCHITECTURE.md`
3. `docs/DATABASE_SCHEMA.md`
4. `docs/WORKFLOWS.md`
5. `docs/IMPLEMENTATION_PLAN.md` (points at `C:\Users\Rami\.claude\plans\1-manual-in-supabase-since-i-nested-stardust.md`)
6. `docs/SETUP.md` — manual bootstrap before Phase 2
7. `design-kit/CLAUDE.md` — rules for using and extending the design kit

## Stack facts

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (no `tailwind.config.ts`, tokens in `src/app/globals.css` `@theme`)
- Supabase (Auth + Postgres) via `@supabase/ssr`
- next-intl, French-only (`messages/fr.json`)
- Design kit at `./design-kit/` — 13 primitives + 11 compounds, tokens are source of truth
- Auth: email + password
- Single office, Africa/Tunis timezone, 7-day workweek
- Installable PWA, online-only for MVP
- Deployed to Vercel

## Build strategy

Vertical slices following `IMPLEMENTATION_PLAN.md`. Ship each phase with `npm run lint` + `npm run build` green before moving on.

## Implementation rules

- Service-role Supabase code stays server-only. Never imported from a `"use client"` file.
- RLS is enabled on every public table. Admin writes on other users bypass RLS through the service client inside route handlers.
- Never trust `auth.users.raw_user_meta_data` for authorization. Read `profiles.role` instead.
- Role is checked in both the middleware and in layouts as defense in depth.
- All UI text is French and lives in `messages/fr.json`. No hardcoded strings in components.
- Use design-kit components and semantic Tailwind classes. No raw hex values in app code.
- Every admin mutation writes an `activity_logs` row.
- Mutations that change aggregate state (leave balance, settings) run through route handlers, not direct Supabase writes from the browser.

## Suggested first coding task

Phase 0 in the implementation plan: scaffold Next.js, wire Tailwind v4 with the ported design-kit tokens, set up next-intl + messages/fr.json, drop the PWA manifest with a placeholder X logo, add the four Supabase client files, write `.env.example` and `src/types/index.ts`, and verify `npm run lint && npm run build` pass.
