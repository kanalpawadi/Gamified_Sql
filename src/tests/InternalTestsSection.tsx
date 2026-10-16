import { useCallback, useEffect, useRef, useState } from 'react';
import type { InternalTest, InternalTestAttempt, InternalTestGrade } from '../lib/types';
import { SqlEditor } from '../components/SqlEditor';
import { CopyGuard } from '../components/CopyGuard';
import { LeetCodeSchemaView } from '../components/LeetCodeSchemaView';
import {
  listStudentTests, getMyTestState, startTest, saveTestAnswers, isAttemptClosed, testMaxScore,
  testQuestionCount, questionsOf,
} from './testsApi';

const STARTER = '-- Write your answer here\n\n';
const AUTOSAVE_MS = 15_000;

function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function InternalTestsSection({
  userId,
  section,
  isApproved,
  onFocusChange,
}: {
  userId: string;
  section: string | null;
  isApproved: boolean;
  onFocusChange?: (focused: boolean) => void; // parent hides its tab bar while a test/result is open
}) {
  const [tests, setTests] = useState<InternalTest[] | null>(null);
  const [state, setState] = useState<Awaited<ReturnType<typeof getMyTestState>> | null>(null);
  const [running, setRunning] = useState<{ test: InternalTest; attempt: InternalTestAttempt; serverNow: string } | null>(null);
  const [viewing, setViewing] = useState<{ test: InternalTest; attempt: InternalTestAttempt; grade: InternalTestGrade } | null>(null);
  const [confirmStart, setConfirmStart] = useState<InternalTest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [list, st] = await Promise.all([listStudentTests(section, isApproved), getMyTestState(userId)]);
    setTests(list);
    setState(st);
  }, [section, isApproved, userId]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { onFocusChange?.(Boolean(running || viewing)); }, [running, viewing, onFocusChange]);

  const begin = async (test: InternalTest) => {
    setBusy(true);
    setError(null);
    const res = await startTest(test.id);
    setBusy(false);
    setConfirmStart(null);
    if (res.error || !res.attempt) { setError(res.error ?? 'Could not start the test.'); refresh(); return; }
    setRunning({ test, attempt: res.attempt, serverNow: res.serverNow! });
  };

  if (running) {
    return (
      <TestRunner
        test={running.test}
        attempt={running.attempt}
        serverNow={running.serverNow}
        onExit={() => { setRunning(null); refresh(); }}
      />
    );
  }

  if (viewing) {
    return <ResultView {...viewing} onBack={() => setViewing(null)} />;
  }

  return (
    <div>
      {error && <div className="auth-error" role="alert" style={{ marginBottom: 12 }}>⚠️ {error}</div>}

      {confirmStart && (
        <div className="itest-modal-backdrop" onClick={() => !busy && setConfirmStart(null)}>
          <div className="ledger-card card itest-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header"><span aria-hidden>📝</span> Start “{confirmStart.title}”?</div>
            <div className="card-body">
              <ul className="itest-rules">
                <li>{testQuestionCount(confirmStart)} question(s), {testMaxScore(confirmStart)} marks in total.</li>
                {confirmStart.mode === 'random' && <li>Your questions are picked at random — other students get different questions.</li>}
                <li>{confirmStart.duration_minutes
                  ? <>You have <strong>{confirmStart.duration_minutes} minutes</strong>. The timer keeps running even if you close the page, and the test submits automatically when time is up.</>
                  : <>There is no time limit, but you must press <strong>Submit</strong> when you finish.</>}
                </li>
                <li>You get <strong>one attempt</strong>. Your answers are saved automatically as you type.</li>
                <li>Copy / paste is disabled. Results appear after your teacher reviews them.</li>
              </ul>
              <div className="flex gap-8" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmStart(null)} disabled={busy}>Cancel</button>
                <button className="btn btn-gold btn-sm" onClick={() => begin(confirmStart)} disabled={busy}>
                  {busy ? 'Starting…' : 'Start test'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between" style={{ gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <p className="text-muted" style={{ margin: 0 }}>
          Internal tests set by your teacher. Results are published after your teacher reviews them.
        </p>
        <button className="btn btn-ghost btn-sm" onClick={() => { setTests(null); refresh(); }}>↻ Refresh</button>
      </div>

      {tests === null && <div className="loading-spinner" />}
      {tests && tests.length === 0 && (
        <div className="ledger-card card"><div className="card-body">
          <p className="text-muted">No internal tests assigned to you right now.</p>
        </div></div>
      )}

      <div className="labs-grid">
        {tests?.map((test) => {
          const mine = (state?.attempts ?? []).filter((a) => a.test_id === test.id);
          const latest = mine[mine.length - 1];
          const allowed = 1 + (state?.extra[test.id] ?? 0);
          const left = allowed - mine.length;
          const open = latest && !isAttemptClosed(latest);
          const grade = latest ? state?.grades[latest.id] : undefined;

          let statusEl: React.ReactNode;
          let action: React.ReactNode = null;
          if (open) {
            statusEl = <span className="pill pill-medium">In progress</span>;
            action = <button className="btn btn-gold btn-sm" onClick={() => begin(test)} disabled={busy}>▶ Resume test</button>;
          } else if (!latest) {
            statusEl = <span className="pill pill-basic">Not started</span>;
            action = <button className="btn btn-primary btn-sm" onClick={() => setConfirmStart(test)}>Start test</button>;
          } else if (grade) {
            statusEl = <span className="pill pill-easy">Result: {grade.percent}%</span>;
            action = (
              <button className="btn btn-ghost btn-sm" onClick={() => setViewing({ test, attempt: latest, grade })}>
                View result
              </button>
            );
          } else {
            statusEl = <span className="pill pill-medium">Submitted · awaiting results</span>;
          }
          if (!open && latest && left > 0) {
            action = (
              <>
                {action}
                <button className="btn btn-gold btn-sm" onClick={() => setConfirmStart(test)}>↻ Retake (allowed by teacher)</button>
              </>
            );
          }

          return (
            <div key={test.id} className={`ledger-card card ${grade ? 'ledger-success' : ''}`}>
              <div className="card-body">
                <div className="lab-card-top">
                  {statusEl}
                  <span className="text-xs text-muted">
                    {testQuestionCount(test)} Qs · {testMaxScore(test)} marks
                    {test.duration_minutes ? ` · ⏱ ${test.duration_minutes} min` : ''}
                  </span>
                </div>
                <h3 className="lab-card-title">{test.title}</h3>
                <p className="lab-card-desc">{test.description}</p>
                {grade && (
                  <p className="text-sm" style={{ margin: '0 0 8px' }}>
                    <strong>{grade.score}</strong> / {grade.max_score} marks
                  </p>
                )}
                <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>{action}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Test runner ────────────────────────────────────────────────────────────

function TestRunner({
  test, attempt, serverNow, onExit,
}: {
  test: InternalTest;
  attempt: InternalTestAttempt;
  serverNow: string;
  onExit: () => void;
}) {
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(attempt.answers ?? {});
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [finished, setFinished] = useState<null | 'submitted' | 'expired'>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Server clock offset so the countdown can't be extended by changing the PC clock.
  const offset = useRef(new Date(serverNow).getTime() - Date.now());
  const answersRef = useRef(answers);
  const dirtyRef = useRef(false);
  const finishedRef = useRef(false);
  const [now, setNow] = useState(() => Date.now() + offset.current);

  answersRef.current = answers;
  const questions = questionsOf(test, attempt);
  const q = questions[qIndex];
  const deadline = attempt.deadline_at ? new Date(attempt.deadline_at).getTime() : null;
  const remaining = deadline != null ? deadline - now : null;

  const persist = useCallback(async (submit: boolean) => {
    if (finishedRef.current) return;
    if (!submit && !dirtyRef.current) return;
    dirtyRef.current = false;
    setSaveState('saving');
    const res = await saveTestAnswers(attempt.id, answersRef.current, submit);
    if (res.error) {
      dirtyRef.current = true;
      setSaveState('error');
      setError(res.error);
      return;
    }
    setError(null);
    setSaveState(dirtyRef.current ? 'dirty' : 'saved');
    if (res.status === 'submitted' || res.status === 'already_submitted') {
      finishedRef.current = true;
      setFinished('submitted');
    } else if (res.status === 'expired') {
      finishedRef.current = true;
      setFinished('expired');
    }
  }, [attempt.id]);

  // Clock tick + autosave.
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now() + offset.current), 1000);
    const save = window.setInterval(() => { persist(false); }, AUTOSAVE_MS);
    return () => { window.clearInterval(tick); window.clearInterval(save); };
  }, [persist]);

  // Auto-submit when time is up.
  useEffect(() => {
    if (remaining != null && remaining <= 0 && !finishedRef.current && !submitting) {
      setSubmitting(true);
      persist(true).finally(() => setSubmitting(false));
    }
  }, [remaining, persist, submitting]);

  // Warn before closing the tab with unsaved work; flush on unmount.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!finishedRef.current && dirtyRef.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (!finishedRef.current && dirtyRef.current) saveTestAnswers(attempt.id, answersRef.current, false);
    };
  }, [attempt.id]);

  const setAnswer = (v: string) => {
    if (finishedRef.current) return;
    dirtyRef.current = true;
    setSaveState('dirty');
    setAnswers((m) => ({ ...m, [q.id]: v }));
  };

  const goTo = (i: number) => { persist(false); setQIndex(i); };

  const answered = (id: string) => {
    const v = (answers[id] ?? '').replace(/--[^\n]*/g, '').trim();
    return v.length > 0;
  };
  const unanswered = questions.filter((x) => !answered(x.id)).length;

  const submit = async () => {
    const msg = unanswered > 0
      ? `You have ${unanswered} unanswered question(s). Submit anyway?\n\nYou cannot change your answers after submitting.`
      : 'Submit your test?\n\nYou cannot change your answers after submitting.';
    if (!confirm(msg)) return;
    setSubmitting(true);
    await persist(true);
    setSubmitting(false);
  };

  if (finished) {
    return (
      <div className="labs-wrap">
        <div className="ledger-card card ledger-success" style={{ maxWidth: 560, margin: '24px auto' }}>
          <div className="card-body" style={{ textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: '2.6rem' }} aria-hidden>{finished === 'submitted' ? '✅' : '⏱'}</div>
            <h3 style={{ margin: '8px 0' }}>{finished === 'submitted' ? 'Test submitted' : 'Time is up'}</h3>
            <p className="text-muted">
              {finished === 'submitted'
                ? 'Your answers have been recorded.'
                : 'Your last saved answers have been submitted.'}{' '}
              Your result will appear here after your teacher reviews it.
            </p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={onExit}>Back to tests</button>
          </div>
        </div>
      </div>
    );
  }

  const lowTime = remaining != null && remaining < 5 * 60_000;

  return (
    <div className="lab-solver">
      <div className="lab-solver-bar">
        <button className="btn btn-ghost btn-sm" onClick={async () => { await persist(false); onExit(); }}>← Save &amp; exit</button>
        <strong className="lab-solver-title">📝 {test.title}</strong>
        <span className={`itest-save itest-save-${saveState}`}>
          {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? '✓ Saved' : saveState === 'dirty' ? 'Unsaved changes' : '⚠ Save failed — retrying'}
        </span>
        {remaining != null && (
          <span className={`itest-timer ${lowTime ? 'low' : ''}`} role="timer" aria-live="off">⏱ {fmtDuration(remaining)}</span>
        )}
        <button className="btn btn-gold btn-sm" onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit test'}
        </button>
      </div>

      {error && <div className="auth-error" role="alert" style={{ margin: '8px 0' }}>⚠️ {error}</div>}

      <div className="lab-qnav">
        {questions.map((tq, i) => (
          <button
            key={tq.id}
            className={`lab-qchip ${i === qIndex ? 'active' : ''} ${answered(tq.id) ? 'done' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Question ${i + 1}${answered(tq.id) ? ' (answered)' : ''}`}
          >
            {i + 1}
          </button>
        ))}
        <span className="text-xs text-muted" style={{ marginLeft: 8 }}>
          {questions.length - unanswered}/{questions.length} answered
        </span>
      </div>

      {q && (
        <div className="lab-solver-grid">
          <div className="lab-solver-left">
            <CopyGuard className="ledger-card card">
              <div className="card-header">
                <span aria-hidden>📋</span> Question {qIndex + 1} of {questions.length}
                {q.topic && <span className="itest-topic" style={{ marginLeft: 8 }}>{q.topic}</span>}
                <span className="shortcut-hint">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
              </div>
              <div className="card-body">
                <p className="problem-statement">{q.prompt}</p>
              </div>
            </CopyGuard>

            {test.schema_sql.trim() && (
              <CopyGuard className="ledger-card card">
                <div className="card-header"><span aria-hidden>🗄️</span> Database schema</div>
                <div className="card-body" style={{ padding: 12 }}>
                  <LeetCodeSchemaView schemaSQL={test.schema_sql} seedSQL="" />
                </div>
              </CopyGuard>
            )}
          </div>

          <div className="lab-solver-right">
            <div className="ledger-card card" style={{ minHeight: 260 }}>
              <div className="card-header"><span aria-hidden>✏️</span> Your answer
                <span className="shortcut-hint">Ctrl/⌘ + Enter to save</span>
              </div>
              <SqlEditor
                key={q.id}
                value={answers[q.id] ?? STARTER}
                onChange={setAnswer}
                onExecute={() => persist(false)}
                disableCopyPaste={true}
              />
            </div>
            <div className="flex gap-8" style={{ justifyContent: 'space-between', marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" disabled={qIndex === 0} onClick={() => goTo(qIndex - 1)}>← Previous</button>
              {qIndex < questions.length - 1
                ? <button className="btn btn-primary btn-sm" onClick={() => goTo(qIndex + 1)}>Next →</button>
                : <button className="btn btn-gold btn-sm" onClick={submit} disabled={submitting}>Submit test</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Released result ────────────────────────────────────────────────────────

function ResultView({
  test, attempt, grade, onBack,
}: {
  test: InternalTest;
  attempt: InternalTestAttempt;
  grade: InternalTestGrade;
  onBack: () => void;
}) {
  return (
    <div className="labs-wrap">
      <div className="lab-solver-bar">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← All tests</button>
        <strong className="lab-solver-title">📝 {test.title} — Result</strong>
      </div>

      <div className="mam-stat-row" style={{ marginTop: 12 }}>
        <div className="ledger-card card mam-stat"><div className="card-body">
          <div className="mam-stat-value">{grade.percent}%</div><div className="mam-stat-label">Percentage</div>
        </div></div>
        <div className="ledger-card card mam-stat"><div className="card-body">
          <div className="mam-stat-value">{grade.score} / {grade.max_score}</div><div className="mam-stat-label">Marks</div>
        </div></div>
      </div>

      {questionsOf(test, attempt).map((q, i) => {
        const m = grade.final_marks[q.id] ?? 0;
        const feedback = grade.ai_marks?.[q.id]?.feedback;
        return (
          <div key={q.id} className="ledger-card card" style={{ marginBottom: 12 }}>
            <div className="card-header">
              Q{i + 1}
              <span className="shortcut-hint"><strong>{m}</strong> / {q.marks}</span>
            </div>
            <div className="card-body">
              <p className="problem-statement" style={{ marginTop: 0 }}>{q.prompt}</p>
              <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Your answer</div>
              <pre className="itest-code">{(attempt.answers[q.id] ?? '').trim() || '— no answer —'}</pre>
              {feedback && <p className="text-sm" style={{ marginBottom: 0 }}>💬 {feedback}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
