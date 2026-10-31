import { supabase } from '../lib/supabaseClient';
import type { Profile, LabExperiment, LabSubmission, StudentApprovalRecord } from '../lib/types';
import { labAssignedToSection } from '../labs/labsApi';
import { fetchAllRows } from '../lib/fetchAllRows';

export interface StudentOverview {
  id: string;
  fullName: string;
  prn: string | null;
  classSection: string | null;
  isApproved: boolean;
  solved: number;       // distinct questions passed
  attempted: number;    // distinct questions attempted
  mastery: number;      // solved / attempted (0..1)
  labsCompleted: number;
  labsAssigned: number;
  badgeCount: number;
  lastActive: string | null;
}

export interface StudentLabRecord {
  userId: string;
  fullName: string;
  prn: string | null;
  classSection: string | null;
  labId: string;
  labTitle: string;
  status: 'Completed' | 'In Progress' | 'Not Started';
  solvedCount: number;
  totalQuestions: number;
  lastSubmittedAt: string | null;
  latestSql: string | null;
}

const APPROVALS_KEY = 'sqlquest_student_approvals';
const DELETED_KEY = 'sqlquest_deleted_student_ids';

export function getLocalApprovals(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(APPROVALS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setLocalApproval(userId: string, isApproved: boolean) {
  try {
    const map = getLocalApprovals();
    map[userId] = isApproved;
    localStorage.setItem(APPROVALS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error('setLocalApproval error:', e);
  }
}

export function getDeletedStudentIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function markStudentDeletedLocally(userId: string) {
  try {
    const deletedSet = getDeletedStudentIds();
    deletedSet.add(userId);
    localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(deletedSet)));

    // Clear from approvals map
    const localMap = getLocalApprovals();
    if (userId in localMap) {
      delete localMap[userId];
      localStorage.setItem(APPROVALS_KEY, JSON.stringify(localMap));
    }
  } catch (e) {
    console.error('markStudentDeletedLocally error:', e);
  }
}

export function getEffectiveApproval(p: Profile): boolean {
  // Check if student was marked deleted locally
  if (getDeletedStudentIds().has(p.id)) {
    return false;
  }
  // If Supabase DB has is_approved = true, student is approved!
  if (p.is_approved === true) {
    return true;
  }
  // Check local storage fallback (for Mam dashboard offline/local override)
  const localMap = getLocalApprovals();
  if (p.id in localMap) {
    return localMap[p.id];
  }
  return false;
}

/**
 * Fetches all student profiles for approval management.
 */
export async function getAllStudentsForApproval(): Promise<StudentApprovalRecord[]> {
  const deletedSet = getDeletedStudentIds();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getAllStudentsForApproval error:', error.message);
    return [];
  }

  return (data ?? [])
    .filter((p: Profile) => !deletedSet.has(p.id))
    .map((p: Profile) => ({
      id: p.id,
      fullName: p.full_name || '(no name)',
      prn: p.prn,
      classSection: p.class_section,
      isApproved: getEffectiveApproval(p),
      createdAt: p.created_at,
      lastActive: p.last_active ?? null,
    }));
}

/**
 * Sets a student's approval status (true = approved/accepted, false = rejected/pending).
 */
export async function setStudentApproval(
  userId: string,
  isApproved: boolean
): Promise<{ success: boolean; note?: string; error?: string }> {
  // Always update local storage first so the UI works seamlessly on this device
  setLocalApproval(userId, isApproved);

  // Try RPC with PostgREST alphabetical parameter names first
  const rpcRes = await supabase.rpc('set_student_approval', {
    p_is_approved: isApproved,
    p_target_user_id: userId,
  });

  if (!rpcRes.error) {
    return { success: true };
  }

  // Fallback to direct update if RPC is missing or fails
  const updateRes = await supabase
    .from('profiles')
    .update({ is_approved: isApproved })
    .eq('id', userId);

  if (updateRes.error) {
    console.warn('Supabase DB update warning:', updateRes.error.message);
    return {
      success: false,
      error: updateRes.error.message,
    };
  }

  return { success: true };
}

/**
 * Bulk approves multiple student accounts.
 */
export async function bulkApprovePendingStudents(
  userIds: string[]
): Promise<{ success: boolean; count: number; error?: string }> {
  if (userIds.length === 0) return { success: true, count: 0 };

  let successCount = 0;
  for (const uid of userIds) {
    const res = await setStudentApproval(uid, true);
    if (res.success) successCount++;
  }

  return { success: true, count: successCount };
}

/**
 * Resets a student's password manually (Mam only action).
 */
export async function resetStudentPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const { error } = await supabase.rpc('reset_student_password', {
    p_new_password: newPassword,
    p_target_user_id: userId,
  });

  if (error) {
    console.error('resetStudentPassword error:', error.message);
    if (error.message.includes('schema cache') || error.message.includes('Could not find the function')) {
      return {
        success: false,
        error: `Supabase RPC Error: "${error.message}". Please run migration 0005_reset_student_password.sql in Supabase SQL Editor and reload your browser.`,
      };
    }
    return { success: false, error: error.message.replace(/^.*:\s*/, '') };
  }

  return { success: true };
}

/**
 * Permanently deletes a student profile and all associated data (attempts, lab submissions, certs, badges).
 */
export async function deleteStudentAccount(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Immediately mark as deleted locally
    markStudentDeletedLocally(userId);

    // 2. Try RPC function delete_student_account if available
    await supabase.rpc('delete_student_account', { p_target_user_id: userId });

    // 3. Delete related records from Supabase tables
    await Promise.all([
      supabase.from('question_attempts').delete().eq('user_id', userId),
      supabase.from('lab_submissions').delete().eq('user_id', userId),
      supabase.from('certificates').delete().eq('user_id', userId),
      supabase.from('badges').delete().eq('user_id', userId),
    ]);

    // 4. Delete student profile record from Supabase profiles table
    await supabase.from('profiles').delete().eq('id', userId);

    return { success: true };
  } catch (err: any) {
    console.warn('deleteStudentAccount Supabase remote delete warning:', err);
    // Return true since local state successfully removed the student
    return { success: true };
  }
}

/**
 * Aggregates every student's progress for the Mam dashboard.
 */
export async function getStudentsOverview(): Promise<StudentOverview[]> {
  const deletedSet = getDeletedStudentIds();
  // Class-wide tables exceed Supabase's 1000-row cap — page through them.
  // Solved/attempted counts come pre-aggregated from the database.
  const [profilesRes, attemptCounts, certsRes, badgesRes, labsRes] = await Promise.all([
    fetchAllRows<Profile>((from, to, withCount) => supabase.from('profiles').select('*', withCount ? { count: 'exact' } : undefined).eq('role', 'student').order('id').range(from, to)),
    getAttemptCounts(),
    fetchAllRows<{ user_id: string; cert_type: string; lab_id: string | null }>((from, to, withCount) =>
      supabase.from('certificates').select('user_id, cert_type, lab_id', withCount ? { count: 'exact' } : undefined).order('id').range(from, to)),
    fetchAllRows<{ user_id: string }>((from, to, withCount) => supabase.from('badges').select('user_id', withCount ? { count: 'exact' } : undefined).order('id').range(from, to)),
    supabase.from('lab_experiments').select('target_sections').eq('published', true),
  ]);

  if (profilesRes.error) { console.error(profilesRes.error); return []; }
  for (const r of [certsRes, badgesRes]) if (r.error) console.error('getStudentsOverview:', r.error);
  const profiles = ((profilesRes.data ?? []) as Profile[]).filter((p) => !deletedSet.has(p.id));
  const certs = certsRes.data ?? [];
  const badges = badgesRes.data ?? [];
  const labs = (labsRes.data ?? []) as { target_sections: string[] }[];

  const labsCompletedByUser = new Map<string, Set<string>>();
  for (const c of certs) {
    if (c.cert_type === 'lab_completion' && c.lab_id) {
      if (!labsCompletedByUser.has(c.user_id)) labsCompletedByUser.set(c.user_id, new Set());
      labsCompletedByUser.get(c.user_id)!.add(c.lab_id);
    }
  }

  const badgeCountByUser = new Map<string, number>();
  for (const b of badges) badgeCountByUser.set(b.user_id, (badgeCountByUser.get(b.user_id) ?? 0) + 1);

  const labsAssignedFor = (section: string | null) =>
    labs.filter((l) => labAssignedToSection(l.target_sections, section)).length;

  return profiles
    .map<StudentOverview>((p) => {
      const solved = attemptCounts.get(p.id)?.solved ?? 0;
      const attempted = attemptCounts.get(p.id)?.attempted ?? 0;
      return {
        id: p.id,
        fullName: p.full_name || '(no name)',
        prn: p.prn,
        classSection: p.class_section,
        isApproved: getEffectiveApproval(p),
        solved,
        attempted,
        mastery: attempted === 0 ? 0 : solved / attempted,
        labsCompleted: labsCompletedByUser.get(p.id)?.size ?? 0,
        labsAssigned: labsAssignedFor(p.class_section),
        badgeCount: badgeCountByUser.get(p.id) ?? 0,
        lastActive: p.last_active ?? null,
      };
    })
    .filter((s) => s.isApproved) // Only show accepted/approved students in Class Ledger
    .sort((a, b) => b.solved - a.solved);
}

/**
 * Distinct questions solved / attempted per student. Uses the database
 * summary (migration 0011) — one small request; falls back to downloading
 * every attempt if that function isn't installed yet.
 */
async function getAttemptCounts(): Promise<Map<string, { solved: number; attempted: number }>> {
  const out = new Map<string, { solved: number; attempted: number }>();
  const { data, error } = await supabase.rpc('mam_attempt_summary');
  if (!error) {
    for (const r of (data ?? []) as { user_id: string; solved: number; attempted: number }[]) {
      out.set(r.user_id, { solved: r.solved, attempted: r.attempted });
    }
    return out;
  }
  console.warn('mam_attempt_summary unavailable, using slow path:', error.message);
  const res = await fetchAllRows<{ user_id: string; question_id: string; passed: boolean }>((from, to, withCount) =>
    supabase.from('question_attempts').select('user_id, question_id, passed', withCount ? { count: 'exact' } : undefined).order('id').range(from, to));
  if (res.error) console.error('getAttemptCounts:', res.error);
  const solved = new Map<string, Set<string>>();
  const attempted = new Map<string, Set<string>>();
  for (const a of res.data) {
    if (!attempted.has(a.user_id)) attempted.set(a.user_id, new Set());
    attempted.get(a.user_id)!.add(a.question_id);
    if (a.passed) {
      if (!solved.has(a.user_id)) solved.set(a.user_id, new Set());
      solved.get(a.user_id)!.add(a.question_id);
    }
  }
  for (const [u, set] of attempted) out.set(u, { solved: solved.get(u)?.size ?? 0, attempted: set.size });
  return out;
}

export async function getStudentLabCompletions(): Promise<StudentLabRecord[]> {
  const deletedSet = getDeletedStudentIds();
  const [profilesRes, labsRes, progress] = await Promise.all([
    fetchAllRows<Profile>((from, to, withCount) => supabase.from('profiles').select('*', withCount ? { count: 'exact' } : undefined).eq('role', 'student').order('id').range(from, to)),
    supabase.from('lab_experiments').select('*'),
    getLabProgress(),
  ]);

  if (profilesRes.error || labsRes.error) {
    console.error('getStudentLabCompletions error:', profilesRes.error || labsRes.error?.message);
    return [];
  }

  const approvedProfiles = profilesRes.data
    .filter((p) => !deletedSet.has(p.id) && getEffectiveApproval(p));
  return buildLabRecords(approvedProfiles, (labsRes.data ?? []) as LabExperiment[], progress);
}

/** One row per (student, lab): what the Submissions table needs. */
export interface LabProgressRow {
  user_id: string;
  lab_id: string;
  passed_question_ids: string[];
  submission_count: number;
  last_submitted_at: string | null;
  latest_sql: string | null;
}

/**
 * Per (student, lab) progress. Uses the database summary (migration 0011) —
 * one small request instead of downloading every submission with its SQL
 * (~23,500 rows, 15–25 s on the live project). Falls back to the slow path if
 * the function isn't installed yet.
 */
async function getLabProgress(): Promise<LabProgressRow[]> {
  const { data, error } = await supabase.rpc('mam_lab_progress');
  if (!error) return (data ?? []) as LabProgressRow[];
  console.warn('mam_lab_progress unavailable, using slow path:', error.message);
  const subs = await fetchAllRows<LabSubmission>((from, to, withCount) =>
    supabase.from('lab_submissions').select('*', withCount ? { count: 'exact' } : undefined).order('created_at', { ascending: false }).order('id').range(from, to));
  if (subs.error) console.error('getLabProgress:', subs.error);
  return summarizeSubmissions(subs.data);
}

/** Same result as mam_lab_progress(), computed in the browser (fallback + tests). */
export function summarizeSubmissions(subs: LabSubmission[]): LabProgressRow[] {
  const map = new Map<string, LabProgressRow & { _passed: Set<string> }>();
  for (const s of subs) {
    const key = `${s.user_id}_${s.lab_id}`;
    let row = map.get(key);
    if (!row) {
      row = { user_id: s.user_id, lab_id: s.lab_id, passed_question_ids: [], submission_count: 0, last_submitted_at: null, latest_sql: null, _passed: new Set() };
      map.set(key, row);
    }
    row.submission_count++;
    if (s.passed) row._passed.add(s.question_id);
    if (!row.last_submitted_at || s.created_at > row.last_submitted_at) {
      row.last_submitted_at = s.created_at;
      row.latest_sql = s.submitted_sql;
    }
  }
  return [...map.values()].map(({ _passed, ...r }) => ({ ...r, passed_question_ids: [..._passed] }));
}

/** Display form of a submitted query: drops the editor's starter comments. */
export function cleanSubmittedSql(sql: string | null): string | null {
  if (!sql) return null;
  const cleaned = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
  return cleaned || null;
}

/**
 * Pure: one record per (approved student, lab). Exported for tests.
 * - Only questions that still exist in the lab count towards "solved".
 * - Draft labs and labs no longer assigned to the student's section are
 *   skipped unless the student already has submissions for them.
 */
export function buildLabRecords(
  profiles: Profile[], labs: LabExperiment[], progress: LabProgressRow[],
): StudentLabRecord[] {
  const byKey = new Map<string, LabProgressRow>();
  for (const r of progress) byKey.set(`${r.user_id}_${r.lab_id}`, r);

  const records: StudentLabRecord[] = [];

  for (const p of profiles) {
    for (const lab of labs) {
      const row = byKey.get(`${p.id}_${lab.id}`);
      const relevant = lab.published && labAssignedToSection(lab.target_sections, p.class_section);
      if (!relevant && !row) continue;

      const passedQuestions = new Set(row?.passed_question_ids ?? []);
      const solvedCount = lab.questions.filter((q) => passedQuestions.has(q.id)).length;
      const totalQuestions = lab.questions.length;

      let status: StudentLabRecord['status'] = 'Not Started';
      if (totalQuestions > 0 && solvedCount === totalQuestions) {
        status = 'Completed';
      } else if (row && row.submission_count > 0) {
        status = 'In Progress';
      }

      records.push({
        userId: p.id,
        fullName: p.full_name || '(no name)',
        prn: p.prn,
        classSection: p.class_section,
        labId: lab.id,
        labTitle: lab.title,
        status,
        solvedCount,
        totalQuestions,
        lastSubmittedAt: row?.last_submitted_at ?? null,
        latestSql: cleanSubmittedSql(row?.latest_sql ?? null),
      });
    }
  }

  return records.sort((a, b) => {
    if (a.status === 'Completed' && b.status !== 'Completed') return -1;
    if (a.status === 'In Progress' && b.status === 'Not Started') return -1;
    if (a.status === 'Not Started' && b.status !== 'Not Started') return 1;
    return (b.lastSubmittedAt ?? '').localeCompare(a.lastSubmittedAt ?? '');
  });
}

export function exportLabCompletionsCSV(records: StudentLabRecord[], filename = 'student_lab_completions.csv') {
  const headers = [
    'Student Name',
    'PRN / Login ID',
    'Class / Section',
    'Lab Title',
    'Status',
    'Questions Solved',
    'Total Questions',
    'Last Submitted At',
    'Submitted SQL Query',
  ];

  const rows = records.map((r) => [
    r.fullName,
    r.prn || '',
    r.classSection || '',
    r.labTitle,
    r.status,
    r.solvedCount.toString(),
    r.totalQuestions.toString(),
    r.lastSubmittedAt ? new Date(r.lastSubmittedAt).toLocaleString() : '',
    r.latestSql ? r.latestSql.replace(/[\r\n]+/g, ' ') : '',
  ]);

  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

