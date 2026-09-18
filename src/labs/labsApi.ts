import { supabase } from '../lib/supabaseClient';
import type { LabExperiment, LabQuestion, LabSubmission } from '../lib/types';
import type { Domain } from '../data/domains';

/**
 * Normalizes a SQL statement for 'statement'-mode grading (text match): strips
 * line comments, lower-cases, tightens spacing around punctuation, collapses
 * whitespace, and drops trailing semicolons. So case, indentation, blank lines
 * and a trailing ';' don't matter — but it's still essentially one canonical
 * answer (use only for DDL the engine can't execute).
 */
export function normalizeSqlForMatch(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, ' ')          // strip line comments
    .toLowerCase()
    .replace(/\s*([(),;])\s*/g, '$1')   // tighten around ( ) , ;
    .replace(/\s+/g, ' ')               // collapse whitespace
    .replace(/;+\s*$/, '')              // drop trailing semicolon(s)
    .trim();
}

/**
 * Whether a lab is assigned to a given student section. Empty target => all
 * sections. Comparison is trimmed + case-insensitive so "TY-AIDS" matches
 * "TY-Aids" / "ty-aids " etc.
 */
export function labAssignedToSection(targetSections: string[], section: string | null): boolean {
  if (!targetSections || targetSections.length === 0) return true;
  if (section == null) return false;
  const s = section.trim().toLowerCase();
  return targetSections.some((t) => t.trim().toLowerCase() === s);
}

// ── Student-facing reads ───────────────────────────────────────────────────

/** Published labs assigned to this student's section (empty target => everyone). Requires approved student status. */
export async function listStudentLabs(section: string | null, isApproved: boolean = true): Promise<LabExperiment[]> {
  if (!isApproved) return [];
  const { data, error } = await supabase
    .from('lab_experiments')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false });
  if (error) { console.error('listStudentLabs:', error.message); return []; }
  return (data as LabExperiment[]).filter((lab) => labAssignedToSection(lab.target_sections, section));
}

export async function getMyLabSubmissions(labId: string): Promise<LabSubmission[]> {
  const { data, error } = await supabase
    .from('lab_submissions')
    .select('*')
    .eq('lab_id', labId)
    .order('created_at', { ascending: false });
  if (error) { console.error('getMyLabSubmissions:', error.message); return []; }
  return data as LabSubmission[];
}

export async function recordLabSubmission(p: {
  labId: string; questionId: string; passed: boolean; sql: string;
}): Promise<void> {
  const { error } = await supabase.from('lab_submissions').insert({
    lab_id: p.labId, question_id: p.questionId, passed: p.passed, submitted_sql: p.sql,
  });
  if (error) console.error('recordLabSubmission:', error.message);
}

/**
 * Called when a student has just passed every question in a lab. Awards the
 * lab's badge and issues the lab completion certificate. Idempotent via unique
 * constraints (23505 = already awarded). Returns what was newly created.
 */
export async function awardLabCompletion(lab: LabExperiment): Promise<{ newBadge: boolean; newCert: boolean }> {
  let newBadge = false;
  let newCert = false;

  const badge = await supabase.from('badges').insert({
    name: lab.badge_name, source: 'lab', lab_id: lab.id,
  });
  if (!badge.error) newBadge = true;
  else if (badge.error.code !== '23505') console.error('awardLabCompletion badge:', badge.error.message);

  const cert = await supabase.from('certificates').insert({
    cert_type: 'lab_completion',
    title: `${lab.title} — Completion Certificate`,
    lab_id: lab.id,
  });
  if (!cert.error) newCert = true;
  else if (cert.error.code !== '23505') console.error('awardLabCompletion cert:', cert.error.message);

  return { newBadge, newCert };
}

// ── Mam-facing CRUD ────────────────────────────────────────────────────────

export async function listMyLabs(_mamId?: string): Promise<LabExperiment[]> {
  const { data, error } = await supabase
    .from('lab_experiments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('listMyLabs:', error.message); return []; }
  return data as LabExperiment[];
}

export interface LabDraft {
  title: string;
  description: string;
  domain: Domain;
  schema_sql?: string;
  badge_name: string;
  target_sections: string[];
  questions: LabQuestion[];
  published: boolean;
}

export async function createLab(draft: LabDraft): Promise<{ data?: LabExperiment; error?: string }> {
  const { data, error } = await supabase
    .from('lab_experiments')
    .insert({ ...draft })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data: data as LabExperiment };
}

export async function updateLab(id: string, patch: Partial<LabDraft>): Promise<{ error?: string }> {
  const { error } = await supabase
    .from('lab_experiments')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  return error ? { error: error.message } : {};
}

export async function setLabPublished(id: string, published: boolean): Promise<{ error?: string }> {
  return updateLab(id, { published });
}

export async function deleteLab(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from('lab_experiments').delete().eq('id', id);
  return error ? { error: error.message } : {};
}
