// Shared types for the Supabase-backed layer.
import type { Domain } from '../data/domains';

export type Role = 'student' | 'mam';

export interface Profile {
  id: string;
  role: Role;
  prn: string | null;
  full_name: string;
  class_section: string | null;
  is_approved?: boolean;
  created_at: string;
  last_active: string;
}

export interface StudentApprovalRecord {
  id: string;
  fullName: string;
  prn: string | null;
  classSection: string | null;
  isApproved: boolean;
  createdAt: string;
  lastActive: string | null;
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

// ── Internal tests (Mam-authored, AI-graded, Mam-reviewed) ─────────────────

export interface InternalTestQuestion {
  id: string;
  prompt: string;
  marks: number;
}

export interface InternalTest {
  id: string;
  created_by: string | null;
  title: string;
  description: string;
  schema_sql: string;
  questions: InternalTestQuestion[];
  target_sections: string[];
  duration_minutes: number | null;
  published: boolean;
  results_released: boolean;
  created_at: string;
  updated_at: string;
}

export interface InternalTestAttempt {
  id: string;
  test_id: string;
  user_id: string;
  attempt_no: number;
  answers: Record<string, string>;
  started_at: string;
  deadline_at: string | null;
  submitted_at: string | null;
  auto_submitted: boolean;
}

export interface InternalTestQuestionMark {
  marks: number;
  max: number;
  feedback: string;
}

export interface InternalTestGrade {
  attempt_id: string;
  ai_marks: Record<string, InternalTestQuestionMark> | null;
  ai_model: string | null;
  ai_graded_at: string | null;
  final_marks: Record<string, number>;
  score: number;
  max_score: number;
  percent: number;
  reviewed_at: string | null;
  reviewed_by: string | null;
}
