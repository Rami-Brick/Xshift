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

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own_staff"
on public.push_subscriptions
for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('manager', 'admin')
      and p.is_active = true
  )
);

create policy "push_subscriptions_insert_own_staff"
on public.push_subscriptions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('manager', 'admin')
      and p.is_active = true
  )
);

create policy "push_subscriptions_update_own_staff"
on public.push_subscriptions
for update
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('manager', 'admin')
      and p.is_active = true
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('manager', 'admin')
      and p.is_active = true
  )
);

create policy "push_subscriptions_delete_own_staff"
on public.push_subscriptions
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('manager', 'admin')
      and p.is_active = true
  )
);
