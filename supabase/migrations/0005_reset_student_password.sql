-- ============================================================================
-- SQLQuest — Migration 0005: Reset Student Password by Mam
-- Adds a SECURITY DEFINER RPC allowing Mam (instructors) to reset a student's
-- password manually when a student forgets their password.
-- Idempotent: safe to run multiple times in Supabase SQL Editor.
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Drop any older/overloaded versions of reset_student_password to avoid schema cache conflicts
drop function if exists public.reset_student_password(uuid, text);
drop function if exists public.reset_student_password(text, text);
drop function if exists public.reset_student_password(text, uuid);
drop function if exists public.reset_student_password(uuid, uuid);

-- 2. Create single clean RPC function (parameters in alphabetical order for PostgREST)
create or replace function public.reset_student_password(
  p_new_password text,
  p_target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, extensions
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
    raise exception 'Permission denied: Only instructors (Mam) can reset student passwords';
  end if;

  -- Check password length
  if length(p_new_password) < 6 then
    raise exception 'Password must be at least 6 characters long';
  end if;

  -- Verify target user exists and is a student
  select role into v_target_role
    from public.profiles
   where id = p_target_user_id;

  if not found then
    raise exception 'Student profile not found';
  end if;

  if v_target_role = 'mam' and p_target_user_id <> auth.uid() then
    raise exception 'Permission denied: Cannot reset another instructor password via student reset endpoint';
  end if;

  -- Update encrypted_password in auth.users using bcrypt AND confirm email
  update auth.users
     set encrypted_password = crypt(p_new_password, gen_salt('bf')),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   where id = p_target_user_id;

  if not found then
    raise exception 'Student user auth account not found';
  end if;
end;
$$;

-- Grant execution permission to client roles
grant execute on function public.reset_student_password(text, uuid) to authenticated, anon, service_role;

-- Force PostgREST schema cache reload
notify pgrst, 'reload schema';
