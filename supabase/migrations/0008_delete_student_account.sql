-- ============================================================================
-- SQLQuest — Migration 0008: Delete Student Account by Mam
-- Adds a SECURITY DEFINER RPC allowing Mam (instructors) to delete a student's
-- account and all associated progress, lab submissions, certificates, and badges.
-- ============================================================================

-- 1. Drop existing function signature if any
drop function if exists public.delete_student_account(uuid);

-- 2. Create single clean RPC function
create or replace function public.delete_student_account(
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_target_role text;
begin
  -- Check if caller is authenticated
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Check if caller is Mam
  if not public.is_mam() then
    raise exception 'Permission denied: Only instructors (Mam) can delete student accounts';
  end if;

  -- Verify target user exists and is a student
  select role into v_target_role
    from public.profiles
   where id = p_target_user_id;

  if v_target_role = 'mam' then
    raise exception 'Permission denied: Cannot delete an instructor account';
  end if;

  -- Delete associated progress data
  delete from public.question_attempts where user_id = p_target_user_id;
  delete from public.lab_submissions where user_id = p_target_user_id;
  delete from public.certificates where user_id = p_target_user_id;
  delete from public.badges where user_id = p_target_user_id;

  -- Delete profile record
  delete from public.profiles where id = p_target_user_id;

  -- Delete auth record if present
  delete from auth.users where id = p_target_user_id;
end;
$$;

-- Grant execution permission to client roles
grant execute on function public.delete_student_account(uuid) to authenticated, anon, service_role;

-- Force PostgREST schema cache reload
notify pgrst, 'reload schema';
