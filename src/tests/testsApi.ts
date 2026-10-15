import { supabase } from '../lib/supabaseClient';
import type {
  InternalTest, InternalTestAttempt, InternalTestGrade, InternalTestQuestion, Profile,
} from '../lib/types';
import { labAssignedToSection } from '../labs/labsApi';

// ── Shared helpers ─────────────────────────────────────────────────────────

export function testMaxScore(test: Pick<InternalTest, 'questions'>): number {
  return test.questions.reduce((n, q) => n + (Number(q.marks) || 0), 0);
}

/** Score + percentage (2 dp) from per-question marks, clamped to each max. */
export function computeScore(test: Pick<InternalTest, 'questions'>, marks: Record<string, number>) {
  const max = testMaxScore(test);
  const score = test.questions.reduce((n, q) => {
    const m = Number(marks[q.id]) || 0;
    return n + Math.min(Math.max(m, 0), Number(q.marks) || 0);
  }, 0);
  const percent = max > 0 ? Math.round((score / max) * 10000) / 100 : 0;
  return { score, max, percent };
}

/** An attempt is closed if submitted, or its time limit (+90s grace) has run out. */
export function isAttemptClosed(a: InternalTestAttempt, now = Date.now()): boolean {
  if (a.submitted_at) return true;
  return a.deadline_at != null && now > new Date(a.deadline_at).getTime() + 90_000;
}

// ── Student-facing ─────────────────────────────────────────────────────────

export async function listStudentTests(section: string | null, isApproved: boolean): Promise<InternalTest[]> {
  if (!isApproved) return [];
  const { data, error } = await supabase
    .from('internal_tests')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });
  if (error) { console.error('listStudentTests:', error.message); return []; }
  return (data as InternalTest[]).filter((t) => labAssignedToSection(t.target_sections, section));
}

export async function getMyTestState(userId: string): Promise<{
  attempts: InternalTestAttempt[];
  extra: Record<string, number>;
  grades: Record<string, InternalTestGrade>;
}> {
  const [att, ext] = await Promise.all([
    supabase.from('internal_test_attempts').select('*').eq('user_id', userId).order('attempt_no'),
    supabase.from('internal_test_extra_attempts').select('test_id, extra').eq('user_id', userId),
  ]);
  if (att.error) console.error('getMyTestState attempts:', att.error.message);
  if (ext.error) console.error('getMyTestState extra:', ext.error.message);
  const attempts = (att.data ?? []) as InternalTestAttempt[];

  // RLS only returns grades Mam has reviewed AND released.
  const grades: Record<string, InternalTestGrade> = {};
  if (attempts.length) {
    const { data, error } = await supabase
      .from('internal_test_grades')
      .select('*')
      .in('attempt_id', attempts.map((a) => a.id));
    if (error) console.error('getMyTestState grades:', error.message);
    for (const g of (data ?? []) as InternalTestGrade[]) grades[g.attempt_id] = g;
  }

  const extra: Record<string, number> = {};
  for (const r of ext.data ?? []) extra[r.test_id] = r.extra;
  return { attempts, extra, grades };
}

export async function startTest(testId: string): Promise<{ attempt?: InternalTestAttempt; serverNow?: string; error?: string }> {
  const { data, error } = await supabase.rpc('start_internal_test', { p_test_id: testId });
  if (error) return { error: error.message };
  return { attempt: data.attempt as InternalTestAttempt, serverNow: data.server_now as string };
}

export async function saveTestAnswers(
  attemptId: string, answers: Record<string, string>, submit: boolean,
): Promise<{ status?: 'saved' | 'submitted' | 'expired' | 'already_submitted'; error?: string }> {
  const { data, error } = await supabase.rpc('save_internal_test_answers', {
    p_attempt_id: attemptId, p_answers: answers, p_submit: submit,
  });
  if (error) return { error: error.message };
  return { status: data.status };
}

// ── Mam-facing ─────────────────────────────────────────────────────────────

export interface TestDraft {
  title: string;
  description: string;
  schema_sql: string;
  questions: InternalTestQuestion[];
  target_sections: string[];
  duration_minutes: number | null;
  published: boolean;
}

export async function listAllTests(): Promise<InternalTest[]> {
  const { data, error } = await supabase
    .from('internal_tests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('listAllTests:', error.message); return []; }
  return data as InternalTest[];
}

export async function getTestKey(testId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('internal_test_keys')
    .select('answers')
    .eq('test_id', testId)
    .maybeSingle();
  if (error) console.error('getTestKey:', error.message);
  return (data?.answers as Record<string, string>) ?? {};
}

export async function saveTest(
  draft: TestDraft, answers: Record<string, string>, existingId?: string,
): Promise<{ id?: string; error?: string }> {
  let id = existingId;
  if (id) {
    const { error } = await supabase
      .from('internal_tests')
      .update({ ...draft, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase.from('internal_tests').insert(draft).select('id').single();
    if (error) return { error: error.message };
    id = data.id as string;
  }
  const { error: keyErr } = await supabase
    .from('internal_test_keys')
    .upsert({ test_id: id, answers }, { onConflict: 'test_id' });
  if (keyErr) return { error: `Test saved but answer key failed: ${keyErr.message}` };
  return { id };
}

export async function updateTestFlags(
  id: string, patch: Partial<Pick<InternalTest, 'published' | 'results_released'>>,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('internal_tests')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  return error ? { error: error.message } : {};
}

export async function deleteTest(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('internal_tests').delete().eq('id', id);
  return error ? { error: error.message } : {};
}

export interface TestResultRow {
  student: Pick<Profile, 'id' | 'full_name' | 'prn' | 'class_section'>;
  attempts: InternalTestAttempt[];   // ascending by attempt_no
  latest: InternalTestAttempt | null;
  grade: InternalTestGrade | null;   // grade of the latest attempt
  extra: number;
}

/** Every approved student assigned to the test, with their attempts + grades. */
export async function getTestResults(test: InternalTest): Promise<TestResultRow[]> {
  const [profiles, attempts, extras] = await Promise.all([
    supabase.from('profiles').select('id, full_name, prn, class_section, is_approved').eq('role', 'student'),
    supabase.from('internal_test_attempts').select('*').eq('test_id', test.id).order('attempt_no'),
    supabase.from('internal_test_extra_attempts').select('user_id, extra').eq('test_id', test.id),
  ]);
  if (profiles.error) console.error('getTestResults profiles:', profiles.error.message);
  if (attempts.error) console.error('getTestResults attempts:', attempts.error.message);

  const atts = (attempts.data ?? []) as InternalTestAttempt[];
  const grades: Record<string, InternalTestGrade> = {};
  if (atts.length) {
    const { data, error } = await supabase
      .from('internal_test_grades').select('*').in('attempt_id', atts.map((a) => a.id));
    if (error) console.error('getTestResults grades:', error.message);
    for (const g of (data ?? []) as InternalTestGrade[]) grades[g.attempt_id] = g;
  }
  const extraBy: Record<string, number> = {};
  for (const r of extras.data ?? []) extraBy[r.user_id] = r.extra;

  const byUser = new Map<string, InternalTestAttempt[]>();
  for (const a of atts) byUser.set(a.user_id, [...(byUser.get(a.user_id) ?? []), a]);

  return (profiles.data ?? [])
    .filter((p) => byUser.has(p.id)
      || (p.is_approved && labAssignedToSection(test.target_sections, p.class_section)))
    .map((p) => {
      const list = byUser.get(p.id) ?? [];
      const latest = list[list.length - 1] ?? null;
      return {
        student: p,
        attempts: list,
        latest,
        grade: latest ? grades[latest.id] ?? null : null,
        extra: extraBy[p.id] ?? 0,
      };
    })
    .sort((a, b) => (a.student.prn ?? a.student.full_name).localeCompare(b.student.prn ?? b.student.full_name));
}

export async function grantExtraAttempt(testId: string, userId: string): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('grant_internal_test_attempt', { p_test_id: testId, p_user_id: userId });
  return error ? { error: error.message } : {};
}

export async function forceSubmitAttempt(attemptId: string): Promise<{ error?: string }> {
  const { error } = await supabase.rpc('force_submit_internal_test_attempt', { p_attempt_id: attemptId });
  return error ? { error: error.message } : {};
}

/**
 * Asks the server function to grade one attempt with the AI. Groq's key lives
 * only on the server; we send the Mam's session token so the function reads
 * and writes with Mam's own permissions (RLS still applies).
 */
export async function gradeAttemptWithAI(attemptId: string): Promise<{
  grade?: InternalTestGrade; error?: string; retryAfterMs?: number;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not signed in' };
  try {
    const res = await fetch('/api/grade-internal-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ attemptId }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 429) {
      return { error: body.error ?? 'AI rate limit reached', retryAfterMs: (Number(body.retryAfter) || 20) * 1000 };
    }
    if (!res.ok) return { error: body.error ?? `Grading failed (HTTP ${res.status})` };
    return { grade: body.grade as InternalTestGrade };
  } catch (e) {
    return { error: `Could not reach the grading service: ${(e as Error).message}` };
  }
}

/** Mam approves (optionally adjusted) marks for an attempt. */
export async function saveReview(
  test: InternalTest, attemptId: string, finalMarks: Record<string, number>, reviewerId: string,
): Promise<{ grade?: InternalTestGrade; error?: string }> {
  const { score, max, percent } = computeScore(test, finalMarks);
  const { data, error } = await supabase
    .from('internal_test_grades')
    .upsert({
      attempt_id: attemptId,
      final_marks: finalMarks,
      score, max_score: max, percent,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    }, { onConflict: 'attempt_id' })
    .select()
    .single();
  if (error) return { error: error.message };
  return { grade: data as InternalTestGrade };
}

export function exportTestResultsCSV(test: InternalTest, rows: TestResultRow[]) {
  const qHeaders = test.questions.map((q, i) => `Q${i + 1} (/${q.marks})`);
  const headers = ['Student Name', 'PRN', 'Section', 'Status', 'Attempts', ...qHeaders,
    `Score (/${testMaxScore(test)})`, 'Percentage', 'Reviewed'];
  const lines = rows.map((r) => {
    const g = r.grade;
    const status = !r.latest ? 'Not attempted' : !isAttemptClosed(r.latest) ? 'In progress' : 'Submitted';
    return [
      r.student.full_name, r.student.prn ?? '', r.student.class_section ?? '', status, String(r.attempts.length),
      ...test.questions.map((q) => (g && g.final_marks[q.id] != null ? String(g.final_marks[q.id]) : '')),
      g ? String(g.score) : '', g ? `${g.percent}%` : '', g?.reviewed_at ? 'Yes' : 'No',
    ];
  });
  const csv = [headers, ...lines]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SQLQuest_${test.title.replace(/[^\w-]+/g, '_')}_Results.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
