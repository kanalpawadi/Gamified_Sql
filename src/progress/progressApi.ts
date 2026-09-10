// Supabase-backed progress. question_attempts is the source of truth for graded
// progress; completedIds / skillProfile / XP baseline are derived from it on load.
import { supabase } from '../lib/supabaseClient';
import { allQuestions } from '../data/index';
import type { Question } from '../data/index';
import type { SkillProfile } from '../engine/adaptiveEngine';
import type { ErrorClass } from '../engine/classifier';

export interface DerivedProgress {
  completedIds: Set<string>;
  skillProfile: SkillProfile;
  completedByCategory: { basic: number; intermediate: number; advanced: number };
  derivedXp: number;
}

const questionById = new Map<string, Question>(allQuestions.map((q) => [q.id, q]));

// ── Record one graded attempt ──────────────────────────────────────────────
export async function recordAttempt(params: {
  question: Question;
  passed: boolean;
  errorClass?: ErrorClass | null;
  sql: string;
}): Promise<void> {
  const { question, passed, errorClass, sql } = params;
  const { error } = await supabase.from('question_attempts').insert({
    question_id: question.id,
    category: question.category,
    domain: question.domain,
    difficulty: question.difficulty,
    tags: question.tags,
    passed,
    error_class: passed ? null : errorClass ?? null,
    attempt_sql: sql,
  });
  if (error) console.error('recordAttempt failed:', error.message);
}

// ── Load + derive progress for a user ──────────────────────────────────────
export async function loadProgress(userId: string): Promise<DerivedProgress> {
  const empty: DerivedProgress = {
    completedIds: new Set(),
    skillProfile: {},
    completedByCategory: { basic: 0, intermediate: 0, advanced: 0 },
    derivedXp: 0,
  };

  const { data, error } = await supabase
    .from('question_attempts')
    .select('question_id, category, tags, passed, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('loadProgress failed:', error.message);
    return empty;
  }

  const completedIds = new Set<string>();
  const skillProfile: SkillProfile = {};

  for (const row of data ?? []) {
    const ts = new Date(row.created_at).getTime();
    for (const tag of row.tags ?? []) {
      const existing = skillProfile[tag] || {
        solved: 0, failed: 0, mastery: 0, lastPracticed: 0, stuckCount: 0,
      };
      if (row.passed) existing.solved += 1;
      else existing.failed += 1;
      const total = existing.solved + existing.failed;
      existing.mastery = total === 0 ? 0 : Math.min(1, existing.solved / total);
      existing.lastPracticed = Math.max(existing.lastPracticed, ts);
      skillProfile[tag] = existing;
    }
    if (row.passed) completedIds.add(row.question_id);
  }

  const completedByCategory = { basic: 0, intermediate: 0, advanced: 0 };
  let derivedXp = 0;
  for (const id of completedIds) {
    const q = questionById.get(id);
    if (!q) continue;
    if (q.category in completedByCategory) {
      completedByCategory[q.category as keyof typeof completedByCategory] += 1;
    }
    derivedXp += q.points;
  }

  return { completedIds, skillProfile, completedByCategory, derivedXp };
}

// ── last_active heartbeat ──────────────────────────────────────────────────
export async function touchLastActive(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ last_active: new Date().toISOString() })
    .eq('id', userId);
  if (error) console.error('touchLastActive failed:', error.message);
}

// ── Milestone certificate thresholds ───────────────────────────────────────
export const MILESTONE_CERTS = [
  { cert_type: 'basic_sql', title: 'Basic SQL Certified', category: 'basic', threshold: 40 },
  { cert_type: 'intermediate_sql', title: 'Intermediate SQL Certified', category: 'intermediate', threshold: 20 },
  { cert_type: 'advanced_sql', title: 'Advanced SQL Certified', category: 'advanced', threshold: 12 },
] as const;

/**
 * Issues any milestone certificate whose threshold is now met and that the
 * student doesn't already have. Idempotent (unique(user_id,title) + on-conflict
 * ignore). Returns the titles of certificates newly issued this call.
 */
export async function issueMilestoneCertificatesIfEarned(
  completedByCategory: DerivedProgress['completedByCategory']
): Promise<string[]> {
  const earned = MILESTONE_CERTS.filter(
    (c) => completedByCategory[c.category as keyof typeof completedByCategory] >= c.threshold
  );
  if (earned.length === 0) return [];

  const { data: existing } = await supabase
    .from('certificates')
    .select('title');
  const have = new Set((existing ?? []).map((r) => r.title));

  const toInsert = earned.filter((c) => !have.has(c.title));
  if (toInsert.length === 0) return [];

  const { error } = await supabase.from('certificates').insert(
    toInsert.map((c) => ({ cert_type: c.cert_type, title: c.title }))
  );
  // 23505 = unique_violation → someone/somewhere already issued it; not an error.
  if (error && error.code !== '23505') {
    console.error('issueMilestoneCertificates failed:', error.message);
    return [];
  }
  return toInsert.map((c) => c.title);
}
