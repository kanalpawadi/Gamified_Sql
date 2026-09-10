import { supabase } from '../lib/supabaseClient';
import type { Profile, LabExperiment, LabSubmission } from '../lib/types';
import { labAssignedToSection } from '../labs/labsApi';

export interface StudentOverview {
  id: string;
  fullName: string;
  prn: string | null;
  classSection: string | null;
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

/**
 * Aggregates every student's progress for the Mam dashboard. Reads are allowed
 * for Mam by RLS (is_mam()). Aggregation happens client-side — fine at
 * classroom scale.
 */
export async function getStudentsOverview(): Promise<StudentOverview[]> {
  const [profilesRes, attemptsRes, certsRes, badgesRes, labsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'student'),
    supabase.from('question_attempts').select('user_id, question_id, passed'),
    supabase.from('certificates').select('user_id, cert_type, lab_id'),
    supabase.from('badges').select('user_id'),
    supabase.from('lab_experiments').select('target_sections').eq('published', true),
  ]);

  if (profilesRes.error) { console.error(profilesRes.error.message); return []; }
  const profiles = (profilesRes.data ?? []) as Profile[];
  const attempts = attemptsRes.data ?? [];
  const certs = certsRes.data ?? [];
  const badges = badgesRes.data ?? [];
  const labs = (labsRes.data ?? []) as { target_sections: string[] }[];

  // Per-user aggregation of attempts.
  const solvedByUser = new Map<string, Set<string>>();
  const attemptedByUser = new Map<string, Set<string>>();
  for (const a of attempts) {
    if (!attemptedByUser.has(a.user_id)) attemptedByUser.set(a.user_id, new Set());
    attemptedByUser.get(a.user_id)!.add(a.question_id);
    if (a.passed) {
      if (!solvedByUser.has(a.user_id)) solvedByUser.set(a.user_id, new Set());
      solvedByUser.get(a.user_id)!.add(a.question_id);
    }
  }

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
      const solved = solvedByUser.get(p.id)?.size ?? 0;
      const attempted = attemptedByUser.get(p.id)?.size ?? 0;
      return {
        id: p.id,
        fullName: p.full_name || '(no name)',
        prn: p.prn,
        classSection: p.class_section,
        solved,
        attempted,
        mastery: attempted === 0 ? 0 : solved / attempted,
        labsCompleted: labsCompletedByUser.get(p.id)?.size ?? 0,
        labsAssigned: labsAssignedFor(p.class_section),
        badgeCount: badgeCountByUser.get(p.id) ?? 0,
        lastActive: p.last_active ?? null,
      };
    })
    .sort((a, b) => b.solved - a.solved);
}

export async function getStudentLabCompletions(): Promise<StudentLabRecord[]> {
  const [profilesRes, labsRes, subsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'student'),
    supabase.from('lab_experiments').select('*'),
    supabase.from('lab_submissions').select('*').order('created_at', { ascending: false }),
  ]);

  if (profilesRes.error || labsRes.error) {
    console.error('getStudentLabCompletions error:', profilesRes.error || labsRes.error);
    return [];
  }

  const profiles = (profilesRes.data ?? []) as Profile[];
  const labs = (labsRes.data ?? []) as LabExperiment[];
  const subs = (subsRes.data ?? []) as LabSubmission[];

  const submissionsGrouped = new Map<string, LabSubmission[]>();
  for (const s of subs) {
    const key = `${s.user_id}_${s.lab_id}`;
    if (!submissionsGrouped.has(key)) submissionsGrouped.set(key, []);
    submissionsGrouped.get(key)!.push(s);
  }

  const records: StudentLabRecord[] = [];

  for (const p of profiles) {
    for (const lab of labs) {
      if (!labAssignedToSection(lab.target_sections, p.class_section)) {
        continue;
      }

      const key = `${p.id}_${lab.id}`;
      const userSubs = submissionsGrouped.get(key) ?? [];
      const passedQuestions = new Set(userSubs.filter((s) => s.passed).map((s) => s.question_id));
      const solvedCount = passedQuestions.size;
      const totalQuestions = lab.questions.length;

      let status: 'Completed' | 'In Progress' | 'Not Started' = 'Not Started';
      if (totalQuestions > 0 && solvedCount === totalQuestions) {
        status = 'Completed';
      } else if (userSubs.length > 0) {
        status = 'In Progress';
      }

      const lastSub = userSubs[0];

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
        lastSubmittedAt: lastSub?.created_at ?? null,
        latestSql: lastSub?.submitted_sql ?? null,
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

