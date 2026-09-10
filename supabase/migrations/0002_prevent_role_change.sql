-- ============================================================================
-- Harden profiles: a student must NOT be able to self-promote to 'mam' by
-- updating their own row. The profiles UPDATE policy allows editing own row
-- (needed for full_name / class_section / last_active), so we block role
-- changes at the row level and only permit them from a SECURITY DEFINER
-- routine (redeem_mam_invite runs as the table owner 'postgres').
-- Idempotent.
-- ============================================================================

-- IMPORTANT: SECURITY INVOKER (the default). A SECURITY DEFINER trigger would
-- run as its owner (postgres) and the current_user check below would always
-- pass, defeating the guard. As INVOKER, current_user reflects the real caller:
-- 'authenticated' for a direct client update (blocked), but 'postgres' when the
-- update happens inside redeem_mam_invite() (SECURITY DEFINER) — allowed.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if current_user not in ('postgres', 'supabase_admin') then
      raise exception 'role can only be changed via redeem_mam_invite()';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();
