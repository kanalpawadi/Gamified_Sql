-- ============================================================================
-- SQLQuest — Migration 0009: Internal Tests (Mam-authored, AI-graded, reviewed)
--
-- ADDITIVE ONLY: creates new tables / functions / policies. No existing table,
-- policy or function is altered, so labs, badges, certificates and progress are
-- untouched. Idempotent: safe to run multiple times.
--
-- Trust model (unlike labs, answers never reach students):
--   • internal_tests          — test + schema + question prompts (no answers)
--   • internal_test_keys      — reference answers; Mam-only, never readable by students
--   • internal_test_attempts  — student answers; written ONLY via SECURITY DEFINER
--                               RPCs that enforce attempt limits + time limit
--   • internal_test_grades    — AI + Mam marks; Mam writes; a student can read
--                               their own row only after Mam reviewed it AND
--                               released the test's results
--   • internal_test_extra_attempts — per-student extra attempts granted by Mam
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.internal_tests (
  id               uuid primary key default gen_random_uuid(),
  created_by       uuid default auth.uid() references auth.users(id) on delete set null,
  title            text not null,
  description      text not null default '',
  schema_sql       text not null default '',
  -- [{ "id": "...", "prompt": "...", "marks": 10 }]  (NO answers in here)
  questions        jsonb not null default '[]'::jsonb,
  target_sections  text[] not null default '{}',
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0), -- null = no limit
  published        boolean not null default false,
  results_released boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists internal_tests_published_idx on public.internal_tests(published);

create table if not exists public.internal_test_keys (
  test_id uuid primary key references public.internal_tests(id) on delete cascade,
  -- { "<question id>": "<reference SQL>" }
  answers jsonb not null default '{}'::jsonb
);

create table if not exists public.internal_test_attempts (
  id             uuid primary key default gen_random_uuid(),
  test_id        uuid not null references public.internal_tests(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  attempt_no     integer not null default 1,
  -- { "<question id>": "<student SQL>" }
  answers        jsonb not null default '{}'::jsonb,
  started_at     timestamptz not null default now(),
  deadline_at    timestamptz,               -- null = no time limit
  submitted_at   timestamptz,               -- null = still in progress
  auto_submitted boolean not null default false,
  unique (test_id, user_id, attempt_no)
);
create index if not exists internal_test_attempts_test_idx on public.internal_test_attempts(test_id);
create index if not exists internal_test_attempts_user_idx on public.internal_test_attempts(user_id, test_id);

create table if not exists public.internal_test_grades (
  attempt_id   uuid primary key references public.internal_test_attempts(id) on delete cascade,
  -- { "<question id>": { "marks": 7.5, "max": 10, "feedback": "..." } }
  ai_marks     jsonb,
  ai_model     text,
  ai_graded_at timestamptz,
  -- { "<question id>": 7.5 }  (Mam-adjusted; starts as the AI marks)
  final_marks  jsonb not null default '{}'::jsonb,
  score        numeric not null default 0,
  max_score    numeric not null default 0,
  percent      numeric not null default 0,
  reviewed_at  timestamptz,                 -- set when Mam approves the marks
  reviewed_by  uuid references auth.users(id) on delete set null
);

create table if not exists public.internal_test_extra_attempts (
  test_id uuid not null references public.internal_tests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  extra   integer not null default 0 check (extra >= 0),
  primary key (test_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.internal_tests               enable row level security;
alter table public.internal_test_keys           enable row level security;
alter table public.internal_test_attempts       enable row level security;
alter table public.internal_test_grades         enable row level security;
alter table public.internal_test_extra_attempts enable row level security;

-- internal_tests: approved users see published tests; Mam manages all.
drop policy if exists itest_select on public.internal_tests;
create policy itest_select on public.internal_tests
  for select using ((published = true and public.is_approved_user()) or public.is_mam());

drop policy if exists itest_insert_mam on public.internal_tests;
create policy itest_insert_mam on public.internal_tests
  for insert with check (public.is_mam());

drop policy if exists itest_update_mam on public.internal_tests;
create policy itest_update_mam on public.internal_tests
  for update using (public.is_mam()) with check (public.is_mam());

drop policy if exists itest_delete_mam on public.internal_tests;
create policy itest_delete_mam on public.internal_tests
  for delete using (public.is_mam());

-- internal_test_keys: Mam only (students can never read answers).
drop policy if exists itkey_mam_all on public.internal_test_keys;
create policy itkey_mam_all on public.internal_test_keys
  for all using (public.is_mam()) with check (public.is_mam());

-- internal_test_attempts: read own (or Mam). NO client insert/update/delete —
-- writes go through start_internal_test() / save_internal_test_answers().
drop policy if exists itatt_select on public.internal_test_attempts;
create policy itatt_select on public.internal_test_attempts
  for select using (user_id = auth.uid() or public.is_mam());

-- internal_test_grades: Mam reads/writes; a student reads their own grade only
-- once it's reviewed AND the test's results are released.
drop policy if exists itgrade_mam_all on public.internal_test_grades;
create policy itgrade_mam_all on public.internal_test_grades
  for all using (public.is_mam()) with check (public.is_mam());

drop policy if exists itgrade_select_own_released on public.internal_test_grades;
create policy itgrade_select_own_released on public.internal_test_grades
  for select using (
    reviewed_at is not null
    and exists (
      select 1
        from public.internal_test_attempts a
        join public.internal_tests t on t.id = a.test_id
       where a.id = internal_test_grades.attempt_id
         and a.user_id = auth.uid()
         and t.results_released = true
    )
  );

-- internal_test_extra_attempts: student reads own; Mam manages.
drop policy if exists itextra_select on public.internal_test_extra_attempts;
create policy itextra_select on public.internal_test_extra_attempts
  for select using (user_id = auth.uid() or public.is_mam());

drop policy if exists itextra_mam_all on public.internal_test_extra_attempts;
create policy itextra_mam_all on public.internal_test_extra_attempts
  for all using (public.is_mam()) with check (public.is_mam());

grant select, insert, update, delete on
  public.internal_tests,
  public.internal_test_keys,
  public.internal_test_attempts,
  public.internal_test_grades,
  public.internal_test_extra_attempts
to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs
-- ─────────────────────────────────────────────────────────────────────────────

-- Grace period after the deadline in which a final save/submit is still
-- accepted (covers network latency on auto-submit).
-- Used inline below as interval '90 seconds'.

-- start_internal_test(): returns the caller's in-progress attempt, or starts a
-- new one if they still have attempts left (1 + Mam-granted extras).
create or replace function public.start_internal_test(p_test_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_test     public.internal_tests%rowtype;
  v_section  text;
  v_attempt  public.internal_test_attempts%rowtype;
  v_used     integer;
  v_extra    integer;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if not public.is_approved_user() then raise exception 'Only approved students can take tests'; end if;

  select * into v_test from public.internal_tests where id = p_test_id and published = true;
  if not found then raise exception 'Test not found or not published'; end if;

  select class_section into v_section from public.profiles where id = v_uid;
  if coalesce(array_length(v_test.target_sections, 1), 0) > 0
     and not exists (
       select 1 from unnest(v_test.target_sections) s
        where lower(trim(s)) = lower(trim(coalesce(v_section, '')))
     ) then
    raise exception 'This test is not assigned to your section';
  end if;

  -- Close any attempt whose time ran out while the student was away.
  update public.internal_test_attempts
     set submitted_at = deadline_at, auto_submitted = true
   where test_id = p_test_id and user_id = v_uid
     and submitted_at is null
     and deadline_at is not null and now() > deadline_at + interval '90 seconds';

  -- Resume an in-progress attempt.
  select * into v_attempt from public.internal_test_attempts
   where test_id = p_test_id and user_id = v_uid and submitted_at is null
   order by attempt_no desc limit 1;

  if not found then
    select count(*) into v_used from public.internal_test_attempts
     where test_id = p_test_id and user_id = v_uid;
    select coalesce(max(extra), 0) into v_extra from public.internal_test_extra_attempts
     where test_id = p_test_id and user_id = v_uid;

    if v_used >= 1 + v_extra then
      raise exception 'No attempts left for this test. Ask your teacher if there was a problem.';
    end if;

    insert into public.internal_test_attempts (test_id, user_id, attempt_no, deadline_at)
    values (
      p_test_id, v_uid, v_used + 1,
      case when v_test.duration_minutes is null then null
           else now() + make_interval(mins => v_test.duration_minutes) end
    )
    returning * into v_attempt;
  end if;

  return jsonb_build_object('attempt', to_jsonb(v_attempt), 'server_now', now());
end;
$$;

-- save_internal_test_answers(): autosave and/or final submit of the caller's
-- own in-progress attempt. Rejects writes after the deadline (+ grace).
create or replace function public.save_internal_test_answers(
  p_attempt_id uuid,
  p_answers jsonb,
  p_submit boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.internal_test_attempts%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if jsonb_typeof(p_answers) <> 'object' then raise exception 'Invalid answers payload'; end if;
  if octet_length(p_answers::text) > 200000 then raise exception 'Answers too large'; end if;

  select * into v_attempt from public.internal_test_attempts
   where id = p_attempt_id and user_id = auth.uid()
   for update;
  if not found then raise exception 'Attempt not found'; end if;
  if v_attempt.submitted_at is not null then
    return jsonb_build_object('status', 'already_submitted', 'server_now', now());
  end if;

  -- Past deadline + grace: lock the attempt with what was last saved.
  if v_attempt.deadline_at is not null and now() > v_attempt.deadline_at + interval '90 seconds' then
    update public.internal_test_attempts
       set submitted_at = v_attempt.deadline_at, auto_submitted = true
     where id = p_attempt_id;
    return jsonb_build_object('status', 'expired', 'server_now', now());
  end if;

  update public.internal_test_attempts
     set answers = p_answers,
         submitted_at = case
           when p_submit or (deadline_at is not null and now() > deadline_at) then now()
           else null end,
         auto_submitted = (not p_submit) and deadline_at is not null and now() > deadline_at
   where id = p_attempt_id;

  return jsonb_build_object(
    'status', case when p_submit or (v_attempt.deadline_at is not null and now() > v_attempt.deadline_at)
                   then 'submitted' else 'saved' end,
    'server_now', now()
  );
end;
$$;

-- grant_internal_test_attempt(): Mam gives a student one more attempt.
create or replace function public.grant_internal_test_attempt(p_test_id uuid, p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_extra integer;
begin
  if not public.is_mam() then raise exception 'Only teachers can grant attempts'; end if;
  insert into public.internal_test_extra_attempts (test_id, user_id, extra)
  values (p_test_id, p_user_id, 1)
  on conflict (test_id, user_id) do update set extra = internal_test_extra_attempts.extra + 1
  returning extra into v_extra;
  return v_extra;
end;
$$;

-- force_submit_internal_test_attempt(): Mam closes a student's open attempt
-- (e.g. a no-time-limit test the student never submitted).
create or replace function public.force_submit_internal_test_attempt(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_mam() then raise exception 'Only teachers can force-submit'; end if;
  update public.internal_test_attempts
     set submitted_at = now(), auto_submitted = true
   where id = p_attempt_id and submitted_at is null;
end;
$$;

revoke all on function public.start_internal_test(uuid) from public, anon;
revoke all on function public.save_internal_test_answers(uuid, jsonb, boolean) from public, anon;
revoke all on function public.grant_internal_test_attempt(uuid, uuid) from public, anon;
revoke all on function public.force_submit_internal_test_attempt(uuid) from public, anon;
grant execute on function public.start_internal_test(uuid) to authenticated;
grant execute on function public.save_internal_test_answers(uuid, jsonb, boolean) to authenticated;
grant execute on function public.grant_internal_test_attempt(uuid, uuid) to authenticated;
grant execute on function public.force_submit_internal_test_attempt(uuid) to authenticated;

notify pgrst, 'reload schema';
