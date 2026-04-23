-- One-off helper to delete a user from Supabase Auth.
-- Run manually in Supabase SQL Editor after replacing the target value.
--
-- Why delete from auth.users?
-- - public.profiles.id references auth.users(id) ON DELETE CASCADE
-- - attendance / leave_requests / day_off_changes reference profiles(id) ON DELETE CASCADE
-- - Some audit/admin reference columns do NOT cascade, so we null them first.
-- So deleting the auth user removes the whole user record tree cleanly while
-- preserving historical logs and admin-edited records.

begin;

do $$
declare
  v_target_user_id uuid := null;
  target_email text := 'replace-me@example.com';
begin
  -- Option 1: delete by UUID
  -- v_target_user_id := '00000000-0000-0000-0000-000000000000';

  -- Option 2: delete by email
  if v_target_user_id is null then
    select id
    into v_target_user_id
    from auth.users
    where email = target_email;
  end if;

  if v_target_user_id is null then
    raise exception 'User not found. Update target_user_id or target_email first.';
  end if;

  -- Clear nullable audit/admin references that would otherwise block profile deletion.
  update public.attendance
  set
    created_by = null,
    updated_by = null
  where created_by = v_target_user_id or updated_by = v_target_user_id;

  update public.leave_requests
  set
    requested_by = null,
    reviewed_by = null
  where requested_by = v_target_user_id or reviewed_by = v_target_user_id;

  update public.day_off_changes
  set
    requested_by = null,
    reviewed_by = null
  where requested_by = v_target_user_id or reviewed_by = v_target_user_id;

  update public.office_settings
  set updated_by = null
  where updated_by = v_target_user_id;

  update public.activity_logs
  set
    actor_id = null,
    target_user_id = null
  where actor_id = v_target_user_id or target_user_id = v_target_user_id;

  delete from auth.users
  where id = v_target_user_id;

  if not found then
    raise exception 'Delete failed for user id %', v_target_user_id;
  end if;

  raise notice 'Deleted user %', v_target_user_id;
end $$;

commit;
