import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gradeQuery } from '../engine/sqlEngine';
import type { GradingResult, QueryResult } from '../engine/sqlEngine';
import { domainSchemas } from '../data/domains';
import type { LabExperiment, LabQuestion } from '../lib/types';
import { SqlEditor } from '../components/SqlEditor';
import { ResultsGrid } from '../components/ResultsGrid';
import { SchemaBlock } from '../components/SchemaBlock';
import { CopyGuard } from '../components/CopyGuard';
import {
  listStudentLabs, getMyLabSubmissions, recordLabSubmission, awardLabCompletion,
  normalizeSqlForMatch,
} from './labsApi';

const STARTER = '-- Write your SQL query here\n-- Ctrl/Cmd + Enter to execute\n\n';

export function LabsSection({
  section,
  onCompletion,
}: {
  section: string | null;
  onCompletion?: () => void; // parent refreshes badges/certs after a lab completes
}) {
  const [labs, setLabs] = useState<LabExperiment[] | null>(null);
  const [active, setActive] = useState<LabExperiment | null>(null);
  const [passedByLab, setPassedByLab] = useState<Record<string, Set<string>>>({});

  const refreshLabs = useCallback(async () => {
    const list = await listStudentLabs(section);
    setLabs(list);
    // Load passed-state for each lab so the list can show progress.
    const map: Record<string, Set<string>> = {};
    for (const lab of list) {
      const subs = await getMyLabSubmissions(lab.id);
      map[lab.id] = new Set(subs.filter((s) => s.passed).map((s) => s.question_id));
    }
    setPassedByLab(map);
  }, [section]);

  useEffect(() => { refreshLabs(); }, [refreshLabs]);

  if (active) {
    return (
      <LabSolver
        lab={active}
        initialPassed={passedByLab[active.id] ?? new Set()}
        onBack={() => { setActive(null); refreshLabs(); }}
        onCompletion={onCompletion}
      />
    );
  }

  return (
    <div className="labs-wrap">
      <div className="labs-head">
        <div className="flex items-center justify-between" style={{ gap: 12, flexWrap: 'wrap' }}>
          <h2>🧪 Lab Experiments</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => { setLabs(null); refreshLabs(); }}>↻ Refresh</button>
        </div>
        <p className="text-muted">
          {section ? `Assigned to section ${section}` : 'Assigned labs'} — solve every challenge to earn the lab badge & certificate.
        </p>
      </div>

      {labs === null && <div className="loading-spinner" />}
      {labs && labs.length === 0 && (
        <div className="ledger-card card"><div className="card-body">
          <p className="text-muted">No labs assigned to you yet. Check back after your teacher publishes one.</p>
        </div></div>
      )}

      <div className="labs-grid">
        {labs?.map((lab) => {
          const passed = passedByLab[lab.id] ?? new Set();
          const total = lab.questions.length;
          const done = lab.questions.filter((q) => passed.has(q.id)).length;
          const complete = total > 0 && done === total;
          return (
            <button
              key={lab.id}
              className={`ledger-card card lab-card ${complete ? 'ledger-success' : ''}`}
              onClick={() => setActive(lab)}
            >
              <div className="card-body">
                <div className="lab-card-top">
                  <span className={`pill pill-${lab.domain === 'company_hr' ? 'basic' : lab.domain === 'retail' ? 'intermediate' : 'advanced'}`}>
                    {lab.domain.replace('_', ' ')}
                  </span>
                  {complete && <span className="lab-complete-tag">✓ Completed</span>}
                </div>
                <h3 className="lab-card-title">{lab.title}</h3>
                <p className="lab-card-desc">{lab.description}</p>
                <div className="lab-card-foot">
                  <span className="lab-progress-text">{done}/{total} solved</span>
                  <div className="lab-progress-track">
                    <div className="lab-progress-fill" style={{ width: total ? `${(done / total) * 100}%` : '0%' }} />
                  </div>
                  <span className="badge-chip" title="Badge on completion">🏅 {lab.badge_name}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Solver ─────────────────────────────────────────────────────────────────

function LabSolver({
  lab, initialPassed, onBack, onCompletion,
}: {
  lab: LabExperiment;
  initialPassed: Set<string>;
  onBack: () => void;
  onCompletion?: () => void;
}) {
  const schema = lab.schema_sql ? { schemaSQL: lab.schema_sql, seedSQL: '' } : domainSchemas[lab.domain];
  const [qIndex, setQIndex] = useState(0);
  const [sqlByQ, setSqlByQ] = useState<Record<string, string>>({});
  const [passed, setPassed] = useState<Set<string>>(new Set(initialPassed));
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const [runResult, setRunResult] = useState<QueryResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const awardedRef = useRef(false);

  const q: LabQuestion | undefined = lab.questions[qIndex];
  const sql = sqlByQ[q?.id ?? ''] ?? STARTER;
  const setSql = (v: string) => setSqlByQ((m) => ({ ...m, [q!.id]: v }));
  const isStatement = (q?.grading_mode ?? 'output') === 'statement';

  useEffect(() => { setGrading(null); setRunResult(null); setShowHint(false); }, [qIndex]);

  const allDone = useMemo(
    () => lab.questions.length > 0 && lab.questions.every((x) => passed.has(x.id)),
    [lab.questions, passed]
  );

  const execute = useCallback(async () => {
    if (!q || !sql.trim() || isRunning) return;
    setIsRunning(true);
    try {
      // Statement-match mode: compare normalized text, don't execute (for DDL
      // the SQLite engine can't run, e.g. ALTER TABLE … MODIFY …).
      if ((q.grading_mode ?? 'output') === 'statement') {
        const ok = normalizeSqlForMatch(sql) === normalizeSqlForMatch(q.reference_sql);
        setGrading({ passed: ok });
        setRunResult(null);
        await recordLabSubmission({ labId: lab.id, questionId: q.id, passed: ok, sql });
        if (ok) setPassed((prev) => new Set(prev).add(q.id));
        return;
      }

      const requireOrder = q.reference_sql.toUpperCase().includes('ORDER BY');
      // Reuse the exact same engine + multiset-diff comparator as the main app.
      const grade = await gradeQuery(schema.schemaSQL, schema.seedSQL, sql, q.reference_sql, requireOrder);
      setGrading(grade);
      setRunResult(grade.learnerResult || null);

      if (grade.passed) {
        await recordLabSubmission({ labId: lab.id, questionId: q.id, passed: true, sql });
        setPassed((prev) => {
          const next = new Set(prev);
          next.add(q.id);
          return next;
        });
      } else {
        await recordLabSubmission({ labId: lab.id, questionId: q.id, passed: false, sql });
      }
    } catch (e) {
      setGrading({ passed: false, errorMessage: (e as Error).message });
    } finally {
      setIsRunning(false);
    }
  }, [q, sql, isRunning, schema, lab.id]);

  // Award badge + certificate once all questions are passed.
  useEffect(() => {
    if (allDone && !awardedRef.current) {
      awardedRef.current = true;
      awardLabCompletion(lab).then(() => {
        setJustCompleted(true);
        onCompletion?.();
      });
    }
  }, [allDone, lab, onCompletion]);

  return (
    <div className="lab-solver">
      <div className="lab-solver-bar">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← All labs</button>
        <strong className="lab-solver-title">{lab.title}</strong>
        <span className="badge-chip">🏅 {lab.badge_name}</span>
      </div>

      {justCompleted && (
        <div className="verdict-banner verdict-pass" role="status">
          <span className="verdict-icon" aria-hidden>🎉</span>
          <div className="verdict-body">
            <div className="verdict-title">Lab complete!</div>
            <div className="verdict-detail">Badge “{lab.badge_name}” awarded and your completion certificate is ready in the Certificates tab.</div>
          </div>
        </div>
      )}

      <div className="lab-qnav">
        {lab.questions.map((lq, i) => (
          <button
            key={lq.id}
            className={`lab-qchip ${i === qIndex ? 'active' : ''} ${passed.has(lq.id) ? 'done' : ''}`}
            onClick={() => setQIndex(i)}
            aria-label={`Question ${i + 1}${passed.has(lq.id) ? ' (solved)' : ''}`}
          >
            {passed.has(lq.id) ? '✓' : i + 1}
          </button>
        ))}
      </div>

      {q && (
        <div className="lab-solver-grid">
          <div className="lab-solver-left">
            <CopyGuard className="ledger-card card">
              <div className="card-header"><span aria-hidden>📋</span> Challenge {qIndex + 1} of {lab.questions.length}</div>
              <div className="card-body">
                <p className="problem-statement">{q.prompt}</p>
                {q.hint && (
                  <div className="mt-12">
                    {showHint ? (
                      <div className="hint-revealed">{q.hint}</div>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowHint(true)}>💡 Show hint</button>
                    )}
                  </div>
                )}
              </div>
            </CopyGuard>

            <CopyGuard className="ledger-card card">
              <div className="card-header"><span aria-hidden>🗄️</span> Schema — {lab.schema_sql ? 'Custom Schema' : lab.domain.replace('_', ' ')}</div>
              <div className="card-body"><SchemaBlock sql={schema.schemaSQL} /></div>
            </CopyGuard>
          </div>

          <div className="lab-solver-right">
            <div className="ledger-card card" style={{ minHeight: 220 }}>
              <div className="card-header"><span aria-hidden>✏️</span> Your Query
                <span className="shortcut-hint">Ctrl/⌘ + Enter to run</span>
              </div>
              <SqlEditor value={sql} onChange={setSql} onExecute={execute} disableCopyPaste={true} />
            </div>

            <button className="btn-execute" onClick={execute} disabled={isRunning || !sql.trim()}>
              {isRunning ? 'Running…' : '▶ Run & Check'}
            </button>

            {grading && grading.passed && (
              <div className="verdict-banner verdict-pass" role="status">
                <span className="verdict-icon" aria-hidden>✅</span>
                <div className="verdict-body">
                  <div className="verdict-title">Correct!</div>
                  <div className="verdict-detail">
                    {isStatement ? 'Your statement matches the expected answer.' : 'Your result matches the reference output.'}
                  </div>
                </div>
              </div>
            )}
            {grading && !grading.passed && (
              <div className="verdict-banner verdict-fail" role="alert">
                <span className="verdict-icon" aria-hidden>{grading.errorMessage ? '⚠️' : '❌'}</span>
                <div className="verdict-body">
                  <div className="verdict-title">{grading.errorMessage ? 'SQL Error' : 'Not quite'}</div>
                  <div className="verdict-detail" style={grading.errorMessage ? { fontFamily: 'var(--font-code)', fontSize: '0.82rem' } : undefined}>
                    {grading.errorMessage
                      ? grading.errorMessage
                      : isStatement
                      ? 'Your statement doesn’t match the expected answer yet. Check keywords, spelling, and order.'
                      : 'Your result differs from the expected output. Compare the two grids below.'}
                  </div>
                  {grading.diff && (
                    <div className="diff-info mt-8">
                      <span className="diff-matched">✓ {grading.diff.matchingRows} matching</span>
                      {grading.diff.missingRows.length > 0 && <span className="diff-missing">✗ {grading.diff.missingRows.length} missing</span>}
                      {grading.diff.extraRows.length > 0 && <span className="diff-extra">+ {grading.diff.extraRows.length} extra</span>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {runResult && (
              <div className="ledger-card card">
                <div className="card-header"><span aria-hidden>📊</span> Your Result
                  <span className="text-muted text-sm" style={{ marginLeft: 8 }}>({runResult.rows.length} rows)</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <ResultsGrid result={runResult} diff={grading?.diff} />
                </div>
              </div>
            )}

            {grading && !grading.passed && grading.expectedResult && (
              <div className="ledger-card card ledger-error">
                <div className="card-header"><span aria-hidden>🎯</span> Expected Result
                  <span className="text-muted text-sm" style={{ marginLeft: 8 }}>({grading.expectedResult.rows.length} rows)</span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                  <ResultsGrid result={grading.expectedResult} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
