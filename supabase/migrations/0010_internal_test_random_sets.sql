-- ============================================================================
-- SQLQuest — Migration 0010: Random per-student question sets for Internal Tests
--
-- Mam pastes a topic-wise question bundle (the "pool"); when a student starts,
-- the server picks THEIR set: one question per topic first (topics in random
-- order), then a second round, … until the requested count is reached.
--
-- ADDITIVE ONLY, and only on Internal Tests objects from 0009: new columns with
-- defaults, one new Mam-only table, and a replaced start_internal_test().
-- Existing ("fixed") tests behave exactly as before. Idempotent.
-- Requires 0009_internal_tests.sql.
-- ============================================================================

alter table public.internal_tests
  add column if not exists mode text not null default 'fixed',
  add column if not exists question_count integer,
  add column if not exists marks_per_question numeric;

do $$ begin
  alter table public.internal_tests
    add constraint internal_tests_mode_chk check (mode in ('fixed', 'random'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.internal_tests
    add constraint internal_tests_random_cfg_chk check (
      mode = 'fixed'
      or (question_count is not null and question_count > 0
          and marks_per_question is not null and marks_per_question > 0)
    );
exception when duplicate_object then null; end $$;

-- The question pool for random tests: [{ "id", "topic", "prompt" }].
-- Mam-only — students must never see the whole bundle.
create table if not exists public.internal_test_pools (
  test_id   uuid primary key references public.internal_tests(id) on delete cascade,
  questions jsonb not null default '[]'::jsonb
);

alter table public.internal_test_pools enable row level security;

drop policy if exists itpool_mam_all on public.internal_test_pools;
create policy itpool_mam_all on public.internal_test_pools
  for all using (public.is_mam()) with check (public.is_mam());

grant select, insert, update, delete on public.internal_test_pools to authenticated;

-- The student's own question set for random tests: [{ "id", "topic", "prompt", "marks" }].
-- NULL for fixed tests (they use internal_tests.questions).
alter table public.internal_test_attempts
  add column if not exists questions jsonb;

-- start_internal_test(): same rules as 0009, plus per-student random sets.
create or replace function public.start_internal_test(p_test_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_test      public.internal_tests%rowtype;
  v_section   text;
  v_attempt   public.internal_test_attempts%rowtype;
  v_used      integer;
  v_extra     integer;
  v_questions jsonb;
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

  -- Resume an in-progress attempt (keeps the same question set).
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

    if v_test.mode = 'random' then
      -- Spread evenly: rank questions randomly inside each topic, give each
      -- topic a random order, then take round 1 (rn = 1) across all topics,
      -- round 2, … until question_count is reached.
      with pool as (
        select q.value as item,
               coalesce(nullif(trim(q.value->>'topic'), ''), 'General') as topic,
               q.ordinality as pos
          from public.internal_test_pools p,
               jsonb_array_elements(p.questions) with ordinality as q(value, ordinality)
         where p.test_id = p_test_id
           and coalesce(trim(q.value->>'prompt'), '') <> ''
      ),
      topics as (
        select topic, random() as topic_order from (select distinct topic from pool) t
      ),
      ranked as (
        select pool.item, pool.topic,
               row_number() over (partition by pool.topic order by random()) as rn,
               topics.topic_order
          from pool join topics using (topic)
      ),
      picked as (
        select item, topic, row_number() over (order by rn, topic_order) as seq
          from ranked
         order by rn, topic_order
         limit v_test.question_count
      )
      select coalesce(jsonb_agg(
               jsonb_build_object(
                 'id', item->>'id',
                 'topic', topic,
                 'prompt', item->>'prompt',
                 'marks', v_test.marks_per_question
               ) order by seq), '[]'::jsonb)
        into v_questions
        from picked;

      if jsonb_array_length(v_questions) = 0 then
        raise exception 'This test has no questions yet. Please tell your teacher.';
      end if;
    end if;

    insert into public.internal_test_attempts (test_id, user_id, attempt_no, deadline_at, questions)
    values (
      p_test_id, v_uid, v_used + 1,
      case when v_test.duration_minutes is null then null
           else now() + make_interval(mins => v_test.duration_minutes) end,
      v_questions
    )
    returning * into v_attempt;
  end if;

  return jsonb_build_object('attempt', to_jsonb(v_attempt), 'server_now', now());
end;
$$;

revoke all on function public.start_internal_test(uuid) from public, anon;
grant execute on function public.start_internal_test(uuid) to authenticated;

notify pgrst, 'reload schema';
