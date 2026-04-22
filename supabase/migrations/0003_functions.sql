-- Atomically decrement leave_balance, flooring at 0.
-- Only callable by service_role (used in server-side leave approval).
-- Anon and authenticated roles cannot execute this directly.
create or replace function public.decrement_leave_balance(p_user_id uuid, p_days int)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set leave_balance = greatest(0, leave_balance - p_days)
  where id = p_user_id;
$$;

revoke execute on function public.decrement_leave_balance(uuid, int) from public, anon, authenticated;
grant execute on function public.decrement_leave_balance(uuid, int) to service_role;
