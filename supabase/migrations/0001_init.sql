-- ============================================================================
-- SQLQuest — Supabase backend schema + Row Level Security
-- Idempotent: safe to run multiple times.
-- ============================================================================

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- profiles: one row per auth.users, keyed by auth.users.id
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null default 'student' check (role in ('student','mam')),
  prn           text unique,
  full_name     text not null default '',
  class_section text,
  created_at    timestamptz not null default now(),
  last_active   timestamptz not null default now()
);

-- mam_invite_codes: one-time codes to elevate a signed-up user to 'mam'
create table if not exists public.mam_invite_codes (
  code       text primary key,
  used       boolean not null default false,
  used_by    uuid references auth.users(id) on delete set null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

-- question_attempts: every graded attempt on the main question bank
create table if not exists public.question_attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id text not null,
  category    text,                       -- basic | intermediate | advanced
  domain      text,                       -- company_hr | retail | campus
  difficulty  text,                       -- easy | medium | hard
  tags        text[] not null default '{}',
  passed      boolean not null,
  error_class text,                       -- from engine/classifier.ts (null when passed)
  attempt_sql text,
  created_at  timestamptz not null default now()
);
create index if not exists question_attempts_user_idx     on public.question_attempts(user_id);
create index if not exists question_attempts_user_q_idx    on public.question_attempts(user_id, question_id);
create index if not exists question_attempts_passed_idx    on public.question_attempts(user_id, passed);

-- lab_experiments: a Mam-authored lab. Questions live in a jsonb array:
--   [{ "id": "lq1", "prompt": "...", "hint": "...", "reference_sql": "SELECT ..." }, ...]
create table if not exists public.lab_experiments (
  id              uuid primary key default gen_random_uuid(),
  created_by      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title           text not null,
  description     text not null default '',
  domain          text not null check (domain in ('company_hr','retail','campus')),
  schema_sql      text,                             -- optional custom DDL+seed; overrides `domain`
  badge_name      text not null,
  target_sections text[] not null default '{}',   -- empty => assigned to ALL sections
  questions       jsonb not null default '[]'::jsonb,
  published       boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists lab_experiments_created_by_idx on public.lab_experiments(created_by);
create index if not exists lab_experiments_published_idx  on public.lab_experiments(published);

-- lab_submissions: append-only record of each lab question submission
create table if not exists public.lab_submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lab_id        uuid not null references public.lab_experiments(id) on delete cascade,
  question_id   text not null,
  passed        boolean not null,
  submitted_sql text,
  created_at    timestamptz not null default now()
);
create index if not exists lab_submissions_user_idx     on public.lab_submissions(user_id);
create index if not exists lab_submissions_user_lab_idx on public.lab_submissions(user_id, lab_id);

-- badges: awarded badges (lab-completion badges live here). One per (user,name).
create table if not exists public.badges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  source     text not null default 'lab',       -- lab | milestone
  lab_id     uuid references public.lab_experiments(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists badges_user_idx on public.badges(user_id);

-- certificates: milestone + lab-completion certificates. One per (user,title).
create table if not exists public.certificates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cert_type  text not null,   -- basic_sql | intermediate_sql | advanced_sql | lab_completion
  title      text not null,
  lab_id     uuid references public.lab_experiments(id) on delete cascade,
  issued_at  timestamptz not null default now(),
  unique (user_id, title)
);
create index if not exists certificates_user_idx on public.certificates(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- is_mam(): SECURITY DEFINER so it reads profiles bypassing RLS (no recursion).
create or replace function public.is_mam()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'mam'
  );
$$;

-- handle_new_user(): create a profile row when an auth user signs up.
-- Reads prn / full_name / class_section from signup metadata. Role always
-- starts as 'student'; elevation to 'mam' only happens via redeem_mam_invite().
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, prn, full_name, class_section)
  values (
    new.id,
    'student',
    nullif(lower(trim(new.raw_user_meta_data->>'prn')), ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(trim(new.raw_user_meta_data->>'class_section'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- redeem_mam_invite(): atomically consume a one-time code and elevate caller
-- to 'mam'. Runs as definer so it can touch mam_invite_codes (which has no
-- client-facing RLS policies at all).
create or replace function public.redeem_mam_invite(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.mam_invite_codes
     set used = true, used_by = auth.uid(), used_at = now()
   where code = p_code and used = false;

  if not found then
    raise exception 'Invalid or already-used invite code';
  end if;

  update public.profiles set role = 'mam' where id = auth.uid();
end;
$$;

grant execute on function public.redeem_mam_invite(text) to authenticated;
grant execute on function public.is_mam() to authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles          enable row level security;
alter table public.mam_invite_codes  enable row level security;
alter table public.question_attempts enable row level security;
alter table public.lab_experiments   enable row level security;
alter table public.lab_submissions   enable row level security;
alter table public.badges            enable row level security;
alter table public.certificates      enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists profiles_select_own_or_mam on public.profiles;
create policy profiles_select_own_or_mam on public.profiles
  for select using (id = auth.uid() or public.is_mam());

-- A user may only insert / update THEIR OWN profile row. Mam can read every
-- student row (above) but cannot write to student-owned rows.
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- mam_invite_codes ----------------------------------------------------------
-- No policies => no direct client access at all. Redemption is only possible
-- through the SECURITY DEFINER redeem_mam_invite() function.

-- question_attempts ---------------------------------------------------------
drop policy if exists qa_insert_own on public.question_attempts;
create policy qa_insert_own on public.question_attempts
  for insert with check (user_id = auth.uid());

drop policy if exists qa_select_own_or_mam on public.question_attempts;
create policy qa_select_own_or_mam on public.question_attempts
  for select using (user_id = auth.uid() or public.is_mam());
-- (no update / delete policies => students cannot alter history)

-- lab_experiments -----------------------------------------------------------
drop policy if exists lab_select on public.lab_experiments;
create policy lab_select on public.lab_experiments
  for select using (published = true or created_by = auth.uid() or public.is_mam());

drop policy if exists lab_insert_mam on public.lab_experiments;
create policy lab_insert_mam on public.lab_experiments
  for insert with check (public.is_mam() and created_by = auth.uid());

drop policy if exists lab_update_owner on public.lab_experiments;
create policy lab_update_owner on public.lab_experiments
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists lab_delete_owner on public.lab_experiments;
create policy lab_delete_owner on public.lab_experiments
  for delete using (created_by = auth.uid());

-- lab_submissions -----------------------------------------------------------
drop policy if exists labsub_insert_own on public.lab_submissions;
create policy labsub_insert_own on public.lab_submissions
  for insert with check (user_id = auth.uid());

drop policy if exists labsub_select_own_or_mam on public.lab_submissions;
create policy labsub_select_own_or_mam on public.lab_submissions
  for select using (user_id = auth.uid() or public.is_mam());

-- badges --------------------------------------------------------------------
drop policy if exists badges_insert_own on public.badges;
create policy badges_insert_own on public.badges
  for insert with check (user_id = auth.uid());

drop policy if exists badges_select_own_or_mam on public.badges;
create policy badges_select_own_or_mam on public.badges
  for select using (user_id = auth.uid() or public.is_mam());

-- certificates --------------------------------------------------------------
drop policy if exists cert_insert_own on public.certificates;
create policy cert_insert_own on public.certificates
  for insert with check (user_id = auth.uid());

drop policy if exists cert_select_own_or_mam on public.certificates;
create policy cert_select_own_or_mam on public.certificates
  for select using (user_id = auth.uid() or public.is_mam());

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED — initial one-time Mam invite codes (change / add more as needed)
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.mam_invite_codes (code) values
  ('MAM-KP-7Q2F9X'),
  ('MAM-KP-3H8LM2'),
  ('MAM-KP-2026A'),
  ('MAM-KP-2026B'),
  ('MAM-KP-2026C'),
  ('MAM-KP-2026D')
on conflict (code) do nothing;
