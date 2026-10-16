import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { InternalTest, InternalTestGrade, InternalTestMode, InternalTestQuestion, PoolQuestion } from '../lib/types';
import { CLASS_SECTIONS } from '../data/sections';
import { SchemaBlock } from '../components/SchemaBlock';
import {
  listAllTests, getTestKey, saveTest, updateTestFlags, deleteTest, getTestResults,
  grantExtraAttempt, forceSubmitAttempt, gradeAttemptWithAI, saveReview, computeScore,
  exportTestResultsCSV, isAttemptClosed, testMaxScore, testQuestionCount, questionsOf,
  getTestPool, parseQuestionBundle, groupByTopic, pickSampleSet,
} from '../tests/testsApi';
import type { TestDraft, TestResultRow } from '../tests/testsApi';

type Mode =
  | { kind: 'list' }
  | { kind: 'new' }
  | { kind: 'edit'; test: InternalTest }
  | { kind: 'results'; test: InternalTest };

export function InternalTestsTab() {
  const [tests, setTests] = useState<InternalTest[] | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });

  const load = useCallback(async () => setTests(await listAllTests()), []);
  useEffect(() => { load(); }, [load]);

  const toList = () => { setMode({ kind: 'list' }); load(); };

  if (mode.kind === 'new') return <div className="mam-wrap"><TestCreator onSaved={toList} onCancel={toList} /></div>;
  if (mode.kind === 'edit') return <div className="mam-wrap"><TestCreator existing={mode.test} onSaved={toList} onCancel={toList} /></div>;
  if (mode.kind === 'results') return <TestResults test={mode.test} onBack={toList} />;

  return (
    <div className="mam-wrap">
      <div className="mam-head">
        <div>
          <h2>Internal Tests</h2>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>
            Set a schema and questions, students answer once, AI grades each answer against the question, you review and release results.
          </p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={() => setMode({ kind: 'new' })}>+ New Test</button>
        </div>
      </div>

      {tests === null && <div className="loading-spinner" />}
      {tests && tests.length === 0 && (
        <div className="ledger-card card"><div className="card-body">
          <p className="text-muted">No internal tests yet. Click “New Test” to create one.</p>
        </div></div>
      )}

      <div className="labs-grid">
        {tests?.map((t) => (
          <div key={t.id} className={`ledger-card card ${t.published ? 'ledger-success' : ''}`}>
            <div className="card-body">
              <div className="lab-card-top">
                <span className={`pill ${t.published ? 'pill-easy' : 'pill-medium'}`}>{t.published ? 'Published' : 'Draft'}</span>
                {t.results_released && <span className="pill pill-approved">Results released</span>}
                {t.mode === 'random' && <span className="pill pill-basic" title="Each student gets a different random set">🎲 Random sets</span>}
              </div>
              <h3 className="lab-card-title">{t.title}</h3>
              <p className="lab-card-desc">{t.description || <span className="text-muted">No description</span>}</p>
              <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
                {testQuestionCount(t)} Qs{t.mode === 'random' ? ' per student' : ''} · {testMaxScore(t)} marks · {t.duration_minutes ? `${t.duration_minutes} min` : 'No time limit'}
                {' · '}Sections: {t.target_sections.length ? t.target_sections.join(', ') : 'All'}
              </p>
              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                <button className="btn btn-gold btn-sm" onClick={() => setMode({ kind: 'results', test: t })}>📊 Results &amp; grading</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setMode({ kind: 'edit', test: t })}>Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={async () => { await updateTestFlags(t.id, { published: !t.published }); load(); }}>
                  {t.published ? 'Unpublish' : 'Publish'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  if (confirm(`Delete test “${t.title}”?\n\nThis permanently removes the test, its answer key, and every student's answers and marks. This cannot be undone.`)) {
                    await deleteTest(t.id); load();
                  }
                }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Creator / editor ───────────────────────────────────────────────────────

const DEFAULT_SCHEMA = `CREATE TABLE department (
  dept_id INT PRIMARY KEY,
  dept_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE employee (
  emp_id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  salary DECIMAL(10,2) CHECK (salary > 0),
  dept_id INT REFERENCES department(dept_id)
);
`;

interface QDraft extends InternalTestQuestion { reference: string }

function blankQ(): QDraft {
  return { id: crypto.randomUUID(), prompt: '', marks: 10, reference: '' };
}

function TestCreator({ existing, onSaved, onCancel }: { existing?: InternalTest; onSaved: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [schemaSql, setSchemaSql] = useState(existing?.schema_sql ?? DEFAULT_SCHEMA);
  const [sections, setSections] = useState<string[]>(existing?.target_sections ?? []);
  const [duration, setDuration] = useState<string>(existing?.duration_minutes ? String(existing.duration_minutes) : '');
  const [questions, setQuestions] = useState<QDraft[]>(
    existing?.questions?.length ? existing.questions.map((q) => ({ ...q, reference: '' })) : [blankQ()]
  );
  const [mode, setMode] = useState<InternalTestMode>(existing?.mode ?? 'fixed');
  const [pool, setPool] = useState<PoolQuestion[]>([]);
  const [bundleText, setBundleText] = useState('');
  const [bundleMsg, setBundleMsg] = useState<string | null>(null);
  const [count, setCount] = useState<string>(String(existing?.question_count ?? 10));
  const [marksEach, setMarksEach] = useState<string>(String(existing?.marks_per_question ?? 10));
  const [sample, setSample] = useState<PoolQuestion[] | null>(null);
  const [keyLoaded, setKeyLoaded] = useState(!existing);
  const [showSchema, setShowSchema] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the answer key for an existing test (Mam-only table).
  useEffect(() => {
    if (!existing) return;
    Promise.all([getTestKey(existing.id), existing.mode === 'random' ? getTestPool(existing.id) : []]).then(([key, p]) => {
      setQuestions((qs) => qs.map((q) => ({ ...q, reference: key[q.id] ?? '' })));
      setPool(p);
      setKeyLoaded(true);
    });
  }, [existing]);

  const patchQ = (id: string, patch: Partial<QDraft>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const toggleSection = (sec: string) =>
    setSections((s) => (s.some((x) => x.toLowerCase() === sec.toLowerCase()) ? s.filter((x) => x.toLowerCase() !== sec.toLowerCase()) : [...s, sec]));

  const total = questions.reduce((n, q) => n + (Number(q.marks) || 0), 0);

  const save = async (publish: boolean) => {
    setError(null);
    if (!title.trim()) { setError('Title is required.'); return; }
    const dur = duration.trim() ? Number(duration) : null;
    if (dur != null && (!Number.isInteger(dur) || dur <= 0)) { setError('Time limit must be a whole number of minutes (or blank for none).'); return; }
    const common = {
      title: title.trim(),
      description: description.trim(),
      schema_sql: schemaSql.trim(),
      target_sections: sections,
      duration_minutes: dur,
      published: publish,
    };

    if (mode === 'random') {
      const cnt = Number(count);
      const each = Number(marksEach);
      const cleanPool = pool
        .map((q) => ({ ...q, topic: q.topic.trim() || 'General', prompt: q.prompt.trim() }))
        .filter((q) => q.prompt);
      if (cleanPool.length === 0) { setError('Paste your question bundle and click “Read questions” first.'); return; }
      if (!Number.isInteger(cnt) || cnt <= 0) { setError('Questions per student must be a whole number greater than 0.'); return; }
      if (cnt > cleanPool.length) { setError(`The bundle has only ${cleanPool.length} questions — lower “Questions per student” or add more questions.`); return; }
      if (!(each > 0)) { setError('Marks per question must be greater than 0.'); return; }
      setSaving(true);
      const res = await saveTest(
        { ...common, questions: [], mode: 'random', question_count: cnt, marks_per_question: each },
        {}, existing?.id, cleanPool,
      );
      setSaving(false);
      if (res.error) { setError(res.error); return; }
      onSaved();
      return;
    }

    const clean = questions
      .map((q) => ({ ...q, prompt: q.prompt.trim(), reference: q.reference.trim(), marks: Number(q.marks) }))
      .filter((q) => q.prompt);
    if (clean.length === 0) { setError('Add at least one question.'); return; }
    const bad = clean.find((q) => !(q.marks > 0));
    if (bad) { setError(`Question “${bad.prompt.slice(0, 40)}…” needs marks greater than 0.`); return; }

    const draft: TestDraft = {
      ...common,
      questions: clean.map(({ id, prompt, marks }) => ({ id, prompt, marks })),
      mode: 'fixed',
      question_count: null,
      marks_per_question: null,
    };
    const key = Object.fromEntries(clean.filter((q) => q.reference).map((q) => [q.id, q.reference]));

    setSaving(true);
    const res = await saveTest(draft, key, existing?.id);
    setSaving(false);
    if (res.error) { setError(res.error); return; }
    onSaved();
  };

  return (
    <div className="ledger-card card lab-creator">
      <div className="card-header"><span aria-hidden>📝</span> {existing ? 'Edit Internal Test' : 'Create Internal Test'}</div>
      <div className="card-body">
        {existing?.published && (
          <div className="itest-note">⚠️ This test is published. Avoid changing questions or marks after students have started.</div>
        )}
        <div className="lc-grid">
          <label className="auth-field"><span>Title</span>
            <input className="auth-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Internal Test 1 — Constraints & Keys" />
          </label>
          <label className="auth-field"><span>Time limit (minutes, blank = no limit)</span>
            <input className="auth-input" type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 45" />
          </label>
        </div>

        <label className="auth-field" style={{ marginTop: 12 }}><span>Instructions / description</span>
          <textarea className="auth-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Shown to students before they start…" />
        </label>

        <div className="auth-field" style={{ marginTop: 12 }}>
          <span>Target sections <span className="text-muted" style={{ fontWeight: 400, textTransform: 'none' }}>(none = all sections)</span></span>
          <div className="lc-section-chips">
            {CLASS_SECTIONS.map((sec) => {
              const on = sections.some((s) => s.toLowerCase() === sec.toLowerCase());
              return (
                <label key={sec} className={`lc-section-chip ${on ? 'on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleSection(sec)} />
                  {sec}
                </label>
              );
            })}
          </div>
        </div>

        <div className="auth-field" style={{ marginTop: 12 }}>
          <span>Questions</span>
          <div className="itest-mode" role="radiogroup">
            <label className={`itest-mode-opt ${mode === 'fixed' ? 'on' : ''}`}>
              <input type="radio" name="itest-mode" checked={mode === 'fixed'} onChange={() => setMode('fixed')} />
              <strong>✍️ Write questions myself</strong>
              <span className="text-xs text-muted">Every student answers the same questions.</span>
            </label>
            <label className={`itest-mode-opt ${mode === 'random' ? 'on' : ''}`}>
              <input type="radio" name="itest-mode" checked={mode === 'random'} onChange={() => setMode('random')} />
              <strong>🎲 Random set from a topic bundle</strong>
              <span className="text-xs text-muted">Paste topic-wise questions; each student gets a different set.</span>
            </label>
          </div>
        </div>

        <label className="auth-field" style={{ marginTop: 12 }}>
          <span>Database schema shown to students (CREATE TABLE …)</span>
          <textarea
            className="auth-input mono"
            style={{ fontFamily: 'var(--font-code)', fontSize: '0.85rem' }}
            rows={8}
            value={schemaSql}
            onChange={(e) => setSchemaSql(e.target.value)}
          />
        </label>
        <div className="lc-schema-ref">
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowSchema((s) => !s)}>
            {showSchema ? 'Hide preview' : 'Preview schema'}
          </button>
          {showSchema && <div style={{ marginTop: 8 }}><SchemaBlock sql={schemaSql} /></div>}
        </div>

        {mode === 'random' ? (
          <BundleEditor
            pool={pool}
            setPool={(p) => { setPool(p); setSample(null); }}
            bundleText={bundleText}
            setBundleText={setBundleText}
            message={bundleMsg}
            setMessage={setBundleMsg}
            count={count}
            setCount={setCount}
            marksEach={marksEach}
            setMarksEach={setMarksEach}
            sample={sample}
            setSample={setSample}
          />
        ) : (
        <div className="lc-questions">
          <div className="flex items-center justify-between" style={{ margin: '16px 0 8px' }}>
            <strong>Questions ({questions.length}) · {total} marks total</strong>
            {!keyLoaded && <span className="text-xs text-muted">Loading answer key…</span>}
          </div>

          {questions.map((q, i) => (
            <div key={q.id} className="lc-question">
              <div className="flex items-center justify-between" style={{ marginBottom: 6, gap: 8 }}>
                <span className="lc-qnum">Q{i + 1}</span>
                <div className="flex items-center gap-8">
                  <label className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    Marks
                    <input className="auth-input" type="number" min={0.5} step={0.5} style={{ width: 80, padding: '4px 8px' }}
                      value={q.marks} onChange={(e) => patchQ(q.id, { marks: Number(e.target.value) })} />
                  </label>
                  {questions.length > 1 && (
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}>✕ Remove</button>
                  )}
                </div>
              </div>
              <textarea className="auth-input" rows={2} value={q.prompt} onChange={(e) => patchQ(q.id, { prompt: e.target.value })} placeholder="Question shown to students — state every key / constraint you expect; the AI grades against exactly this" />
              <textarea className="auth-input mono" style={{ marginTop: 6, fontFamily: 'var(--font-code)' }} rows={4}
                value={q.reference} onChange={(e) => patchQ(q.id, { reference: e.target.value })}
                placeholder="Model answer — optional, only you see it while reviewing (the AI grades from the question)" />
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setQuestions((qs) => [...qs, blankQ()])} style={{ marginTop: 8 }}>+ Add question</button>
        </div>
        )}

        {error && <div className="auth-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}

        <div className="flex gap-8" style={{ marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => save(false)} disabled={saving || !keyLoaded} type="button">
            {saving ? 'Saving…' : existing ? 'Save changes (keep draft)' : 'Save as draft'}
          </button>
          <button className="btn btn-gold" onClick={() => save(true)} disabled={saving || !keyLoaded} type="button">
            {saving ? 'Saving…' : 'Save & Publish'}
          </button>
          <button className="btn btn-ghost" onClick={onCancel} type="button">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Results, AI grading & review ───────────────────────────────────────────

function statusOf(r: TestResultRow): 'not_started' | 'in_progress' | 'submitted' {
  if (!r.latest) return 'not_started';
  return isAttemptClosed(r.latest) ? 'submitted' : 'in_progress';
}

function TestResults({ test: initial, onBack }: { test: InternalTest; onBack: () => void }) {
  const { profile } = useAuth();
  const [test, setTest] = useState(initial);
  const [rows, setRows] = useState<TestResultRow[] | null>(null);
  const [key, setKey] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reviewing, setReviewing] = useState<TestResultRow | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const [r, k] = await Promise.all([getTestResults(test), getTestKey(test.id)]);
    setRows(r);
    setKey(k);
  }, [test]);
  useEffect(() => { load(); }, [load]);

  const setGrade = (attemptId: string, grade: InternalTestGrade) =>
    setRows((rs) => rs?.map((r) => (r.latest?.id === attemptId ? { ...r, grade } : r)) ?? rs);

  const gradeOne = async (r: TestResultRow): Promise<boolean> => {
    if (!r.latest) return false;
    for (let tries = 0; tries < 4; tries++) {
      const res = await gradeAttemptWithAI(r.latest.id);
      if (res.grade) { setGrade(r.latest.id, res.grade); return true; }
      if (res.retryAfterMs && tries < 3) {
        setProgress(`Rate limit reached — waiting ${Math.round(res.retryAfterMs / 1000)}s…`);
        await new Promise((ok) => setTimeout(ok, res.retryAfterMs));
        continue;
      }
      setMessage({ type: 'error', text: `${r.student.full_name}: ${res.error}` });
      return false;
    }
    return false;
  };

  const ungraded = (rows ?? []).filter((r) => statusOf(r) === 'submitted' && !r.grade?.ai_graded_at && !r.grade?.reviewed_at);

  const gradeAll = async () => {
    if (ungraded.length === 0) return;
    setBusy('all');
    setMessage(null);
    let ok = 0;
    for (let i = 0; i < ungraded.length; i++) {
      setProgress(`Grading ${i + 1} of ${ungraded.length}: ${ungraded[i].student.full_name}…`);
      if (await gradeOne(ungraded[i])) ok++;
    }
    setProgress(null);
    setBusy(null);
    if (ok > 0) setMessage({ type: 'success', text: `AI graded ${ok} submission(s). Review them, then release results.` });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows ?? [];
    return (rows ?? []).filter((r) =>
      r.student.full_name.toLowerCase().includes(q)
      || (r.student.prn ?? '').toLowerCase().includes(q)
      || (r.student.class_section ?? '').toLowerCase().includes(q));
  }, [rows, search]);

  const stats = useMemo(() => {
    const list = rows ?? [];
    const submitted = list.filter((r) => statusOf(r) === 'submitted');
    const reviewed = submitted.filter((r) => r.grade?.reviewed_at);
    const avg = reviewed.length ? reviewed.reduce((n, r) => n + Number(r.grade!.percent), 0) / reviewed.length : null;
    return {
      assigned: list.length,
      submitted: submitted.length,
      graded: submitted.filter((r) => r.grade).length,
      reviewed: reviewed.length,
      avg: avg == null ? '—' : `${Math.round(avg * 100) / 100}%`,
    };
  }, [rows]);

  const toggleRelease = async () => {
    const next = !test.results_released;
    if (next && stats.reviewed < stats.submitted &&
      !confirm(`${stats.submitted - stats.reviewed} submission(s) are not reviewed yet. Students only see results you have reviewed.\n\nRelease results now?`)) return;
    setBusy('release');
    const res = await updateTestFlags(test.id, { results_released: next });
    setBusy(null);
    if (res.error) { setMessage({ type: 'error', text: res.error }); return; }
    setTest({ ...test, results_released: next });
    setMessage({ type: 'success', text: next ? 'Results released — students can now see their reviewed marks.' : 'Results hidden from students.' });
  };

  return (
    <div className="mam-wrap">
      {reviewing && reviewing.latest && (
        <ReviewModal
          test={test}
          row={reviewing}
          answerKey={key}
          onClose={() => setReviewing(null)}
          onRegrade={async () => {
            const ok = await gradeOne(reviewing);
            if (ok) load();
            return ok;
          }}
          onSave={async (marks) => {
            const res = await saveReview(questionsOf(test, reviewing.latest), reviewing.latest!.id, marks, profile!.id);
            if (res.error) return res.error;
            setGrade(reviewing.latest!.id, res.grade!);
            setReviewing(null);
            return null;
          }}
          latestGrade={rows?.find((r) => r.student.id === reviewing.student.id)?.grade ?? null}
        />
      )}

      <div className="mam-head">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: 6 }}>← All tests</button>
          <h2>{test.title} — Results</h2>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>
            {testQuestionCount(test)} questions{test.mode === 'random' ? ' per student (random sets)' : ''} · {testMaxScore(test)} marks · {test.duration_minutes ? `${test.duration_minutes} min` : 'no time limit'}
          </p>
        </div>
        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setRows(null); load(); }}>↻ Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={gradeAll} disabled={busy !== null || ungraded.length === 0}>
            🤖 Grade all with AI ({ungraded.length})
          </button>
          <button className={`btn btn-sm ${test.results_released ? 'btn-ghost' : 'btn-gold'}`} onClick={toggleRelease} disabled={busy !== null}>
            {test.results_released ? '🙈 Hide results' : '📢 Release results'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => rows && exportTestResultsCSV(test, rows)} disabled={!rows?.length}>
            📥 Export CSV
          </button>
        </div>
      </div>

      {progress && <div className="itest-note">⏳ {progress}</div>}
      {message && (
        <div className={`itest-msg itest-msg-${message.type}`} role={message.type === 'error' ? 'alert' : 'status'}>
          {message.type === 'success' ? '✓ ' : '⚠️ '}{message.text}
        </div>
      )}

      <div className="mam-stat-row">
        <StatBox label="Assigned students" value={stats.assigned} />
        <StatBox label="Submitted" value={stats.submitted} />
        <StatBox label="AI graded" value={stats.graded} />
        <StatBox label="Reviewed" value={stats.reviewed} />
        <StatBox label="Class average" value={stats.avg} />
      </div>

      <div className="approvals-filter-bar flex gap-12 align-center justify-between" style={{ marginBottom: 14 }}>
        <span className={`pill ${test.results_released ? 'pill-approved' : 'pill-pending'}`}>
          {test.results_released ? 'Results visible to students' : 'Results hidden from students'}
        </span>
        <input type="text" className="approval-search-input" placeholder="🔍 Search name, PRN, section…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="ledger-card card">
        <div className="mam-table-wrap">
          {rows === null ? (
            <div style={{ padding: 24 }}><div className="loading-spinner" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-muted" style={{ padding: 20 }}>No students found for this test.</p>
          ) : (
            <table className="mam-table">
              <thead>
                <tr>
                  <th>Name</th><th>PRN</th><th>Section</th><th>Status</th><th>Attempts</th>
                  <th>Score</th><th>%</th><th>Review</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const st = statusOf(r);
                  const g = r.grade;
                  return (
                    <tr key={r.student.id}>
                      <td className="mam-name">{r.student.full_name}</td>
                      <td className="mono">{r.student.prn ?? '—'}</td>
                      <td>{r.student.class_section ?? '—'}</td>
                      <td>
                        <span className={`pill ${st === 'submitted' ? 'pill-easy' : st === 'in_progress' ? 'pill-medium' : 'pill-basic'}`}>
                          {st === 'submitted' ? (r.latest?.auto_submitted ? 'Submitted (auto)' : 'Submitted') : st === 'in_progress' ? 'In progress' : 'Not started'}
                        </span>
                      </td>
                      <td>{r.attempts.length} / {1 + r.extra}</td>
                      <td>{g ? `${g.score} / ${g.max_score}` : '—'}</td>
                      <td>{g ? `${g.percent}%` : '—'}</td>
                      <td>
                        {!g ? <span className="text-muted">—</span>
                          : g.reviewed_at ? <span className="pill pill-approved">✓ Reviewed</span>
                          : <span className="pill pill-pending">AI only</span>}
                      </td>
                      <td>
                        <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                          {st === 'submitted' && (
                            <button className="btn btn-sm btn-gold" style={{ padding: '3px 10px', fontSize: '0.78rem' }}
                              onClick={() => setReviewing(r)} disabled={busy !== null}>
                              {g ? 'Review' : 'Mark'}
                            </button>
                          )}
                          {st === 'submitted' && !g && (
                            <button className="btn btn-sm btn-ghost" style={{ padding: '3px 10px', fontSize: '0.78rem' }}
                              disabled={busy !== null}
                              onClick={async () => { setBusy(r.student.id); setMessage(null); await gradeOne(r); setProgress(null); setBusy(null); }}>
                              {busy === r.student.id ? 'Grading…' : '🤖 AI grade'}
                            </button>
                          )}
                          {st === 'in_progress' && (
                            <button className="btn btn-sm btn-ghost" style={{ padding: '3px 10px', fontSize: '0.78rem' }}
                              disabled={busy !== null}
                              onClick={async () => {
                                if (!confirm(`Force-submit ${r.student.full_name}'s test now with their last saved answers?`)) return;
                                const res = await forceSubmitAttempt(r.latest!.id);
                                if (res.error) setMessage({ type: 'error', text: res.error });
                                load();
                              }}>
                              ⏹ Force submit
                            </button>
                          )}
                          {st === 'submitted' && (
                            <button className="btn btn-sm btn-ghost" style={{ padding: '3px 10px', fontSize: '0.78rem' }}
                              disabled={busy !== null}
                              title="Allow one more attempt (e.g. if there was a technical problem)"
                              onClick={async () => {
                                if (!confirm(`Give ${r.student.full_name} one more attempt?\n\nTheir new attempt will replace this one as their result.`)) return;
                                const res = await grantExtraAttempt(test.id, r.student.id);
                                if (res.error) setMessage({ type: 'error', text: res.error });
                                else setMessage({ type: 'success', text: `${r.student.full_name} can now retake the test.` });
                                load();
                              }}>
                              + Attempt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewModal({
  test, row, answerKey, latestGrade, onClose, onSave, onRegrade,
}: {
  test: InternalTest;
  row: TestResultRow;
  answerKey: Record<string, string>;
  latestGrade: InternalTestGrade | null;
  onClose: () => void;
  onSave: (marks: Record<string, number>) => Promise<string | null>;
  onRegrade: () => Promise<boolean>;
}) {
  const grade = latestGrade;
  const questions = questionsOf(test, row.latest);
  const [marks, setMarks] = useState<Record<string, number>>(
    () => Object.fromEntries(questions.map((q) => [q.id, grade?.final_marks[q.id] ?? 0]))
  );
  const [busy, setBusy] = useState<'save' | 'ai' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // When a re-grade lands, show the new AI marks.
  useEffect(() => {
    if (grade) setMarks(Object.fromEntries(questions.map((q) => [q.id, grade.final_marks[q.id] ?? 0])));
  }, [grade, questions]);

  const { score, max, percent } = computeScore(questions, marks);
  const answers = row.latest?.answers ?? {};

  return (
    <div className="itest-modal-backdrop" onClick={() => !busy && onClose()}>
      <div className="ledger-card card itest-modal itest-modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <span aria-hidden>🧾</span> {row.student.full_name} {row.student.prn ? `(${row.student.prn})` : ''}
          <span className="shortcut-hint">Attempt {row.latest?.attempt_no}</span>
        </div>
        <div className="card-body itest-review-body">
          {!grade?.ai_graded_at && (
            <div className="itest-note">Not AI-graded yet. Run the AI or enter marks yourself.</div>
          )}
          {questions.map((q, i) => {
            const ai = grade?.ai_marks?.[q.id];
            return (
              <div key={q.id} className="itest-review-q">
                <div className="flex items-center justify-between" style={{ gap: 8 }}>
                  <strong>Q{i + 1}. {q.topic && <span className="itest-topic">{q.topic}</span>} {q.prompt}</strong>
                  <label className="text-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    <input className="auth-input" type="number" min={0} max={q.marks} step={0.5} style={{ width: 72, padding: '4px 8px' }}
                      value={marks[q.id] ?? 0}
                      onChange={(e) => setMarks((m) => ({ ...m, [q.id]: Math.min(Math.max(Number(e.target.value) || 0, 0), q.marks) }))} />
                    / {q.marks}
                  </label>
                </div>
                <div className={test.mode === 'random' ? '' : 'itest-review-cols'}>
                  <div>
                    <div className="text-xs text-muted">Student answer</div>
                    <pre className="itest-code">{(answers[q.id] ?? '').trim() || '— no answer —'}</pre>
                  </div>
                  {test.mode !== 'random' && <div>
                    <div className="text-xs text-muted">Model answer (not used by AI)</div>
                    <pre className="itest-code">{answerKey[q.id]?.trim() || '— none —'}</pre>
                  </div>}
                </div>
                {ai && <p className="text-sm" style={{ margin: '4px 0 0' }}>🤖 AI: <strong>{ai.marks}/{ai.max}</strong> — {ai.feedback}</p>}
              </div>
            );
          })}

          {error && <div className="auth-error" role="alert">{error}</div>}

          <div className="flex items-center justify-between" style={{ gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            <strong>Total: {score} / {max} ({percent}%)</strong>
            <div className="flex gap-8">
              <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy !== null}>Cancel</button>
              <button className="btn btn-ghost btn-sm" disabled={busy !== null}
                onClick={async () => { setBusy('ai'); setError(null); await onRegrade(); setBusy(null); }}>
                {busy === 'ai' ? 'Grading…' : grade?.ai_graded_at ? '🤖 Re-run AI' : '🤖 Grade with AI'}
              </button>
              <button className="btn btn-gold btn-sm" disabled={busy !== null}
                onClick={async () => { setBusy('save'); const err = await onSave(marks); setBusy(null); if (err) setError(err); }}>
                {busy === 'save' ? 'Saving…' : '✓ Approve marks'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const BUNDLE_EXAMPLE = `Topic: Primary Key
1. Create table student with roll_no as primary key and name not null.
2. Add a primary key on course_id to the existing table course.

Topic: Foreign Key
1. Create table marks where roll_no refers to the student table.
2. Add a foreign key from orders(customer_id) to customers.

Topic: CHECK
1. Add a constraint so salary of an employee must be greater than 10000.`;

function BundleEditor({
  pool, setPool, bundleText, setBundleText, message, setMessage,
  count, setCount, marksEach, setMarksEach, sample, setSample,
}: {
  pool: PoolQuestion[];
  setPool: (p: PoolQuestion[]) => void;
  bundleText: string;
  setBundleText: (s: string) => void;
  message: string | null;
  setMessage: (s: string | null) => void;
  count: string;
  setCount: (s: string) => void;
  marksEach: string;
  setMarksEach: (s: string) => void;
  sample: PoolQuestion[] | null;
  setSample: (s: PoolQuestion[] | null) => void;
}) {
  const groups = groupByTopic(pool);
  const cnt = Number(count) || 0;
  const each = Number(marksEach) || 0;

  const read = (append: boolean) => {
    const parsed = parseQuestionBundle(bundleText);
    if (parsed.length === 0) {
      setMessage('No questions found. Put each topic on a line like “Topic: Primary Key” and its questions below it, one per line or numbered.');
      return;
    }
    const next = append ? [...pool, ...parsed] : parsed;
    setPool(next);
    setBundleText('');
    setMessage(`✓ Read ${parsed.length} question(s) in ${groupByTopic(parsed).length} topic(s). Check them below.`);
  };

  const patch = (id: string, prompt: string) => setPool(pool.map((q) => (q.id === id ? { ...q, prompt } : q)));
  const remove = (id: string) => setPool(pool.filter((q) => q.id !== id));
  const renameTopic = (from: string, to: string) => setPool(pool.map((q) => (q.topic === from ? { ...q, topic: to } : q)));

  const rounds = groups.length ? Math.ceil(cnt / groups.length) : 0;

  return (
    <div className="lc-questions">
      <label className="auth-field" style={{ marginTop: 16 }}>
        <span>Paste your topic-wise questions {pool.length > 0 && <span className="text-muted" style={{ fontWeight: 400, textTransform: 'none' }}>(to add more or replace)</span>}</span>
        <textarea
          className="auth-input"
          rows={pool.length ? 5 : 12}
          value={bundleText}
          onChange={(e) => setBundleText(e.target.value)}
          placeholder={BUNDLE_EXAMPLE}
        />
      </label>
      <div className="flex gap-8" style={{ marginTop: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" type="button" disabled={!bundleText.trim()} onClick={() => read(false)}>
          📥 {pool.length ? 'Replace with these questions' : 'Read questions'}
        </button>
        {pool.length > 0 && (
          <button className="btn btn-ghost btn-sm" type="button" disabled={!bundleText.trim()} onClick={() => read(true)}>➕ Add to the bundle</button>
        )}
      </div>
      {message && <div className="itest-note" style={{ marginTop: 8 }}>{message}</div>}

      <div className="lc-grid" style={{ marginTop: 12 }}>
        <label className="auth-field"><span>Questions per student</span>
          <div className="flex gap-8 items-center">
            <input className="auth-input" type="number" min={1} value={count} onChange={(e) => { setCount(e.target.value); setSample(null); }} style={{ maxWidth: 100 }} />
            {[10, 15].map((n) => (
              <button key={n} type="button" className={`btn btn-sm ${cnt === n ? 'btn-gold' : 'btn-ghost'}`} onClick={() => { setCount(String(n)); setSample(null); }}>{n}</button>
            ))}
          </div>
        </label>
        <label className="auth-field"><span>Marks per question</span>
          <input className="auth-input" type="number" min={0.5} step={0.5} value={marksEach} onChange={(e) => setMarksEach(e.target.value)} style={{ maxWidth: 120 }} />
        </label>
      </div>

      {pool.length > 0 && (
        <div className={`itest-note ${cnt > pool.length ? 'itest-note-warn' : ''}`} style={{ marginTop: 12 }}>
          {cnt > pool.length
            ? <>⚠️ The bundle has only <strong>{pool.length}</strong> questions but each student needs <strong>{cnt}</strong>. Add questions or lower the number.</>
            : <>
                Bundle: <strong>{pool.length}</strong> questions in <strong>{groups.length}</strong> topics.
                Each student gets <strong>{cnt}</strong> random questions × {each} marks = <strong>{cnt * each}</strong> marks
                {' — '}{cnt <= groups.length
                  ? `one from ${cnt} different topics.`
                  : `one from every topic, then ${rounds > 2 ? 'more rounds' : 'a second round'} until ${cnt}.`}
              </>}
        </div>
      )}

      {pool.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setSample(pickSampleSet(pool, cnt))} disabled={cnt <= 0}>
            🎲 {sample ? 'Pick another sample' : 'Preview a sample student set'}
          </button>
          {sample && (
            <ol className="itest-sample">
              {sample.map((q) => (
                <li key={q.id}><span className="itest-topic">{q.topic}</span> {q.prompt}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      {groups.map((g) => (
        <div key={g.topic} className="lc-question">
          <div className="flex items-center justify-between" style={{ marginBottom: 6, gap: 8 }}>
            <input
              className="auth-input itest-topic-input"
              defaultValue={g.topic}
              aria-label="Topic name"
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== g.topic) renameTopic(g.topic, v); }}
            />
            <span className="text-xs text-muted">{g.questions.length} question{g.questions.length === 1 ? '' : 's'}</span>
          </div>
          {g.questions.map((q, i) => (
            <div key={q.id} className="itest-pool-row">
              <span className="lc-qnum">{i + 1}</span>
              <textarea className="auth-input" rows={1} value={q.prompt} onChange={(e) => patch(q.id, e.target.value)} />
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => remove(q.id)} aria-label="Remove question">✕</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="ledger-card card mam-stat">
      <div className="card-body">
        <div className="mam-stat-value">{value}</div>
        <div className="mam-stat-label">{label}</div>
      </div>
    </div>
  );
}
