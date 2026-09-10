// Shared types for the Supabase-backed layer.
import type { Domain } from '../data/domains';

export type Role = 'student' | 'mam';

export interface Profile {
  id: string;
  role: Role;
  prn: string | null;
  full_name: string;
  class_section: string | null;
  created_at: string;
  last_active: string;
}

// A single question inside a lab experiment (stored in lab_experiments.questions jsonb).
export interface LabQuestion {
  id: string;            // stable id within the lab, e.g. "lq1"
  prompt: string;
  hint?: string;
  reference_sql: string; // the "correct" query
  // How the student's answer is graded:
  //  'output'    → run both queries, compare result rows (default; best for SELECT)
  //  'statement' → normalized text match against reference_sql (for DDL the engine
  //                can't execute, e.g. ALTER TABLE … MODIFY …)
  grading_mode?: 'output' | 'statement';
}

export interface LabExperiment {
  id: string;
  created_by: string;
  title: string;
  description: string;
  domain: Domain;
  schema_sql?: string;       // Custom DDL / schema SQL provided by teacher (optional)
  badge_name: string;
  target_sections: string[]; // empty => all sections
  questions: LabQuestion[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface LabSubmission {
  id: string;
  user_id: string;
  lab_id: string;
  question_id: string;
  passed: boolean;
  submitted_sql: string | null;
  created_at: string;
}

export interface BadgeRow {
  id: string;
  user_id: string;
  name: string;
  source: string;
  lab_id: string | null;
  awarded_at: string;
}

export type CertType = 'basic_sql' | 'intermediate_sql' | 'advanced_sql' | 'lab_completion';

export interface CertificateRow {
  id: string;
  user_id: string;
  cert_type: CertType;
  title: string;
  lab_id: string | null;
  issued_at: string;
}

export interface QuestionAttemptRow {
  id: number;
  user_id: string;
  question_id: string;
  category: string | null;
  domain: string | null;
  difficulty: string | null;
  tags: string[];
  passed: boolean;
  error_class: string | null;
  attempt_sql: string | null;
  created_at: string;
}
