# Setup

One-time bootstrap for Xshift. Do this once before Phase 2.

## 1. Supabase project

1. Create a Supabase project (EU region recommended).
2. **Settings → API** — copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. **Authentication → Providers → Email** — ensure Email is enabled. For MVP, disable "Confirm email" so admin-created users can log in immediately with the temporary password.

## 2. Environment variables

Create `.env.local` in the repo root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Never commit `.env.local`. Commit only `.env.example`.

## 3. Run migrations

Open **SQL Editor** in the Supabase dashboard and run, in order:

1. `supabase/migrations/0001_init.sql` — enums, tables, indexes, triggers, RLS policies.
2. `supabase/migrations/0002_seed.sql` — one `office_settings` row with Tunis placeholder coordinates.

Verify:

```sql
select count(*) from public.office_settings;  -- should return 1
```

## 4. Create the first admin

Still in the Supabase dashboard:

1. **Authentication → Users → Add user** → fill email + a strong password. Set "Auto-confirm user" to true.
2. Copy the new user's `id` (UUID).
3. **SQL Editor**:

```sql
insert into public.profiles (id, full_name, email, role, leave_balance, is_active)
values (
  '<paste-uuid-here>',
  'Admin Xshift',
  '<same-email-here>',
  'admin',
  0,
  true
);
```

You should now be able to log into the app at `/login` with that admin account and access `/admin/*`.

## 5. Deploy to Vercel

1. Push the repo to GitHub.
2. Import the repo in Vercel.
3. Set the three env vars from step 2 in the Vercel project settings (Production + Preview).
4. Deploy.

The PWA manifest is served from `/manifest.webmanifest` and the placeholder icons from `/icons/`. Install the app from Chrome (Android) or Safari (iOS → Add to Home Screen).

## 6. Onboard employees

From `/admin/employees` → **Créer un employé**: admin fills the form with a temporary password of their choice. Admin communicates the password to the employee directly. The employee signs in at `/login` and can change their password later.
