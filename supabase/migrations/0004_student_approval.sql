-- ============================================================================
-- SQLQuest — Migration 0004: Student Registration Approval
-- Adds `is_approved` status to profiles table and SECURITY DEFINER RPC
-- allowing Mam (teachers) to approve or reject student accounts.
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- 1. Add `is_approved` column to public.profiles if it doesn't already exist.
-- Defaults to true so existing accounts remain active and unblocked.
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
      and table_name = 'profiles' 
      and column_name = 'is_approved'
  ) then
    alter table public.profiles add column is_approved boolean not null default true;
  end if;
end $$;

-- 2. Function for Mam to update approval status of student profiles safely.
create or replace function public.set_student_approval(
  p_target_user_id uuid,
  p_is_approved boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if caller is authenticated and has 'mam' role
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_mam() then
    raise exception 'Permission denied: Only instructors (Mam) can update student approval status';
  end if;

  -- Update target profile
  update public.profiles
     set is_approved = p_is_approved
   where id = p_target_user_id;

  if not found then
    raise exception 'Student profile not found';
  end if;
end;
$$;

-- 3. Grant execution permission on the function
grant execute on function public.set_student_approval(uuid, boolean) to authenticated;

-- 4. Update profiles policy to allow Mam to update student rows
drop policy if exists profiles_update_mam on public.profiles;
create policy profiles_update_mam on public.profiles
  for update using (public.is_mam()) with check (public.is_mam());
