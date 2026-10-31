-- ============================================================================
-- SQLQuest — Migration 0011: Teacher dashboard speed
--
-- Measured on the live project: Mam's Submissions tab read ~23,500
-- lab_submissions rows in 24 pages of 3–7 s each; Class Ledger read ~16,500
-- question_attempts rows. Two causes, two fixes:
--
-- 1. The SELECT policies called is_mam() / is_approved_user() once PER ROW
--    (each one a profiles lookup). Wrapping them in (select …) makes Postgres
--    evaluate them ONCE per query (Supabase's documented RLS performance
--    advice). The policy LOGIC IS UNCHANGED — same rows visible to everyone.
--
-- 2. The dashboards downloaded every row and counted in the browser. Two
--    summary functions now do the counting in the database and return one row
--    per student (per lab). They run with the caller's permissions (security
--    invoker), so RLS still decides what each caller can see.
--
-- No data is changed. Idempotent: safe to run multiple times.
-- ============================================================================

-- 1. Same policies, evaluated once per query --------------------------------

drop policy if exists qa_select_own_or_mam on public.question_attempts;
create policy qa_select_own_or_mam on public.question_attempts
  for select using (user_id = (select auth.uid()) or (select public.is_mam()));

drop policy if exists labsub_select_own_or_mam on public.lab_submissions;
create policy labsub_select_own_or_mam on public.lab_submissions
  for select using (
    (user_id = (select auth.uid()) and (select public.is_approved_user()))
    or (select public.is_mam())
  );

-- 2. Summaries for the teacher dashboard ------------------------------------

-- Class Ledger: distinct questions solved / attempted per student.
create or replace function public.mam_attempt_summary()
returns table (user_id uuid, solved integer, attempted integer)
language sql
stable
security invoker
set search_path = public
as $$
  select qa.user_id,
         count(distinct qa.question_id) filter (where qa.passed)::integer,
         count(distinct qa.question_id)::integer
    from public.question_attempts qa
   group by qa.user_id
$$;

-- Submissions: per (student, lab) the passed question ids, number of
-- submissions, time of the latest one and its SQL.
create or replace function public.mam_lab_progress()
returns table (
  user_id uuid,
  lab_id uuid,
  passed_question_ids text[],
  submission_count integer,
  last_submitted_at timestamptz,
  latest_sql text
)
language sql
stable
security invoker
set search_path = public
as $$
  with agg as (
    select s.user_id, s.lab_id,
           coalesce(array_agg(distinct s.question_id) filter (where s.passed), '{}') as passed_ids,
           count(*)::integer as n,
           max(s.created_at) as last_at
      from public.lab_submissions s
     group by s.user_id, s.lab_id
  ),
  latest as (
    select distinct on (s.user_id, s.lab_id) s.user_id, s.lab_id, s.submitted_sql
      from public.lab_submissions s
     order by s.user_id, s.lab_id, s.created_at desc, s.id desc
  )
  select agg.user_id, agg.lab_id, agg.passed_ids, agg.n, agg.last_at, latest.submitted_sql
    from agg
    join latest on latest.user_id = agg.user_id and latest.lab_id = agg.lab_id
$$;

revoke all on function public.mam_attempt_summary() from public, anon;
revoke all on function public.mam_lab_progress() from public, anon;
grant execute on function public.mam_attempt_summary() to authenticated;
grant execute on function public.mam_lab_progress() to authenticated;

-- Helps the "latest submission per student & lab" lookup.
create index if not exists lab_submissions_user_lab_created_idx
  on public.lab_submissions (user_id, lab_id, created_at desc);

notify pgrst, 'reload schema';
