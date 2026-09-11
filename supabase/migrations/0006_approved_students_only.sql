-- ============================================================================
-- SQLQuest — Migration 0006: Restrict Lab Access & Signups to Approved Students Only
-- 1. Adds `is_approved` column to profiles table if missing, defaulting to FALSE.
-- 2. Updates `handle_new_user()` trigger to initialize new students as pending (is_approved = false).
-- 3. Updates RLS policy on `lab_experiments` so ONLY approved students or Mam can view labs.
-- 4. Updates RLS policies on `lab_submissions` so ONLY approved students or Mam can submit/view lab attempts.
-- Idempotent: safe to run multiple times in Supabase SQL Editor.
-- ============================================================================

-- 1. Add `is_approved` column to public.profiles if it doesn't exist, defaulting to false
alter table public.profiles add column if not exists is_approved boolean not null default false;
alter table public.profiles alter column is_approved set default false;

-- 2. Update handle_new_user() trigger function so new students start as pending approval (is_approved = false)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, prn, full_name, class_section, is_approved)
  values (
    new.id,
    'student',
    nullif(lower(trim(new.raw_user_meta_data->>'prn')), ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(trim(new.raw_user_meta_data->>'class_section'), ''),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 3. Helper function to check if current caller is an approved student or Mam
create or replace function public.is_approved_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and (role = 'mam' or is_approved = true)
  );
$$;

grant execute on function public.is_approved_user() to authenticated, anon;

-- 4. Restrict lab_experiments SELECT policy: only published labs AND approved users (or author/Mam)
drop policy if exists lab_select on public.lab_experiments;
create policy lab_select on public.lab_experiments
  for select using (
    (published = true and public.is_approved_user())
    or created_by = auth.uid()
    or public.is_mam()
  );

-- 5. Restrict lab_submissions INSERT policy: only approved students can submit lab queries
drop policy if exists labsub_insert_own on public.lab_submissions;
create policy labsub_insert_own on public.lab_submissions
  for insert with check (user_id = auth.uid() and public.is_approved_user());

-- 6. Restrict lab_submissions SELECT policy: only approved students or Mam can read submissions
drop policy if exists labsub_select_own_or_mam on public.lab_submissions;
create policy labsub_select_own_or_mam on public.lab_submissions
  for select using (
    (user_id = auth.uid() and public.is_approved_user())
    or public.is_mam()
  );

-- Force PostgREST schema cache reload
notify pgrst, 'reload schema';
