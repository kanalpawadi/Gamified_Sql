import { useState } from 'react';
import { runEphemeralQuery } from '../engine/sqlEngine';
import { domainSchemas } from '../data/domains';
import type { Domain } from '../data/domains';
import type { LabExperiment, LabQuestion } from '../lib/types';
import { createLab, updateLab } from '../labs/labsApi';
import type { LabDraft } from '../labs/labsApi';
import { SchemaBlock } from '../components/SchemaBlock';
import { CLASS_SECTIONS } from '../data/sections';

const DOMAINS: { value: Domain; label: string }[] = [
  { value: 'company_hr', label: 'Company / HR' },
  { value: 'retail', label: 'Retail' },
  { value: 'campus', label: 'Campus' },
];

const DEFAULT_CUSTOM_SCHEMA = `-- Define your custom table(s) and sample data below:
CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  marks INTEGER
);

INSERT INTO students (id, name, marks) VALUES (1, 'Alice', 85);
INSERT INTO students (id, name, marks) VALUES (2, 'Bob', 92);
INSERT INTO students (id, name, marks) VALUES (3, 'Charlie', 78);
`;

function domainTables(domain: Domain, customSql?: string, useCustom?: boolean): string[] {
  const sql = useCustom && customSql ? customSql : domainSchemas[domain].schemaSQL;
  return [...sql.matchAll(/CREATE TABLE\s+(\w+)/gi)].map((m) => m[1]);
}

function blankQuestion(): LabQuestion {
  return { id: crypto.randomUUID(), prompt: '', hint: '', reference_sql: '', grading_mode: 'output' };
}

export function LabCreator({
  existing,
  onSaved,
  onCancel,
}: {
  existing?: LabExperiment;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [domain, setDomain] = useState<Domain>(existing?.domain ?? 'company_hr');
  const [useCustomSchema, setUseCustomSchema] = useState<boolean>(Boolean(existing?.schema_sql));
  const [customSchemaSql, setCustomSchemaSql] = useState<string>(existing?.schema_sql ?? DEFAULT_CUSTOM_SCHEMA);
  const [badgeName, setBadgeName] = useState(existing?.badge_name ?? '');
  const [sections, setSections] = useState((existing?.target_sections ?? []).join(', '));
  const [questions, setQuestions] = useState<LabQuestion[]>(
    existing?.questions?.length ? existing.questions : [blankQuestion()]
  );
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSchema, setShowSchema] = useState(false);

  const tables = domainTables(domain, customSchemaSql, useCustomSchema);

  // Target sections stored as a comma-joined string (save() splits it); the UI
  // is a checkbox group over the canonical CLASS_SECTIONS list.
  const selectedSections = sections.split(',').map((s) => s.trim()).filter(Boolean);
  const toggleSection = (val: string) => {
    const set = new Set(selectedSections);
    if (set.has(val)) set.delete(val); else set.add(val);
    setSections([...set].join(', '));
  };

  const patchQ = (id: string, patch: Partial<LabQuestion>) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const addQ = () => setQuestions((qs) => [...qs, blankQuestion()]);
  const removeQ = (id: string) => setQuestions((qs) => qs.filter((q) => q.id !== id));

  const getActiveSchema = () => {
    if (useCustomSchema) {
      return { schemaSQL: customSchemaSql, seedSQL: '' };
    }
    return domainSchemas[domain];
  };

  const validateReferences = async () => {
    setError(null);
    const schema = getActiveSchema();
    const next: Record<string, string> = {};
    for (const q of questions) {
      if (!q.reference_sql.trim()) { next[q.id] = 'empty'; continue; }
      // Statement-match questions are never executed (they're for DDL SQLite
      // can't run) — we only need a non-empty reference.
      if ((q.grading_mode ?? 'output') === 'statement') { next[q.id] = 'textok'; continue; }
      next[q.id] = 'pending';
      setValidation({ ...next });
      const res = await runEphemeralQuery(schema.schemaSQL, schema.seedSQL, q.reference_sql);
      next[q.id] = res.success ? 'ok' : `err:${res.error ?? 'failed'}`;
    }
    setValidation({ ...next });
  };

  const save = async (publish: boolean) => {
    setError(null);
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!badgeName.trim()) { setError('Badge name is required.'); return; }
    if (useCustomSchema && !customSchemaSql.trim()) { setError('Custom schema SQL cannot be empty.'); return; }

    const cleanQs = questions
      .map((q) => ({ ...q, prompt: q.prompt.trim(), hint: (q.hint ?? '').trim(), reference_sql: q.reference_sql.trim() }))
      .filter((q) => q.prompt && q.reference_sql);
    if (cleanQs.length === 0) { setError('Add at least one question with a prompt and reference SQL.'); return; }

    // Reference queries must be valid SQL before saving/publishing — except
    // statement-match questions, which are graded by text and never executed.
    const schema = getActiveSchema();
    for (const q of cleanQs) {
      if ((q.grading_mode ?? 'output') === 'statement') continue;
      const res = await runEphemeralQuery(schema.schemaSQL, schema.seedSQL, q.reference_sql);
      if (!res.success) {
        setError(`Reference SQL for "${q.prompt.slice(0, 40)}…" is invalid: ${res.error}`);
        setValidation((v) => ({ ...v, [q.id]: `err:${res.error}` }));
        return;
      }
    }

    const draft: LabDraft = {
      title: title.trim(),
      description: description.trim(),
      domain,
      schema_sql: useCustomSchema ? customSchemaSql.trim() : undefined,
      badge_name: badgeName.trim(),
      target_sections: sections.split(',').map((s) => s.trim()).filter(Boolean),
      questions: cleanQs,
      published: publish,
    };

    setSaving(true);
    try {
      const res = existing
        ? await updateLab(existing.id, draft)
        : await createLab(draft);
      if ((res as { error?: string }).error) { setError((res as { error?: string }).error!); return; }
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <div className="ledger-card card lab-creator">
      <div className="card-header"><span aria-hidden>🧪</span> {existing ? 'Edit Lab Experiment' : 'Create Lab Experiment'}</div>
      <div className="card-body">
        <div className="lc-grid">
          <label className="auth-field"><span>Title</span>
            <input className="auth-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Joins Bootcamp" />
          </label>
          <label className="auth-field"><span>Badge name (awarded on completion)</span>
            <input className="auth-input" value={badgeName} onChange={(e) => setBadgeName(e.target.value)} placeholder="e.g. Join Ninja" />
          </label>

          <label className="auth-field"><span>Schema Source</span>
            <select
              className="auth-input"
              value={useCustomSchema ? 'custom' : 'preset'}
              onChange={(e) => setUseCustomSchema(e.target.value === 'custom')}
            >
              <option value="preset">Preset Domain Schema</option>
              <option value="custom">Provide Custom Schema (CREATE TABLE + INSERT)</option>
            </select>
          </label>

          {!useCustomSchema && (
            <label className="auth-field"><span>Domain schema</span>
              <select className="auth-input" value={domain} onChange={(e) => setDomain(e.target.value as Domain)}>
                {DOMAINS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </label>
          )}
        </div>

        <div className="auth-field" style={{ marginTop: 12 }}>
          <span>Target sections <span className="text-muted" style={{ fontWeight: 400, textTransform: 'none' }}>(tick all that apply; none = all sections)</span></span>
          <div className="lc-section-chips">
            {CLASS_SECTIONS.map((sec) => {
              const on = selectedSections.some((s) => s.toLowerCase() === sec.toLowerCase());
              return (
                <label key={sec} className={`lc-section-chip ${on ? 'on' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleSection(sec)} />
                  {sec}
                </label>
              );
            })}
          </div>
        </div>

        {useCustomSchema && (
          <label className="auth-field" style={{ marginTop: 12 }}>
            <span>Custom Schema SQL (CREATE TABLE & INSERT statements)</span>
            <textarea
              className="auth-input mono"
              style={{ fontFamily: 'var(--font-code)', fontSize: '0.85rem' }}
              rows={6}
              value={customSchemaSql}
              onChange={(e) => setCustomSchemaSql(e.target.value)}
              placeholder="e.g. CREATE TABLE employees (id INT, name TEXT); INSERT INTO employees VALUES (1, 'Alice');"
            />
          </label>
        )}

        <label className="auth-field" style={{ marginTop: 12 }}><span>Description</span>
          <textarea className="auth-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this lab covers…" />
        </label>

        {/* Schema reference */}
        <div className="lc-schema-ref">
          <div className="flex items-center justify-between" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <span className="text-sm">
              <strong>Tables:</strong>{' '}
              {tables.length > 0
                ? tables.map((t) => <code key={t} className="lc-table-chip">{t}</code>)
                : <span className="text-muted">No tables detected yet</span>}
            </span>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowSchema((s) => !s)}>
              {showSchema ? 'Hide columns' : 'Show columns'}
            </button>
          </div>
          {showSchema && <SchemaBlock sql={useCustomSchema ? customSchemaSql : domainSchemas[domain].schemaSQL} />}
        </div>

        <div className="lc-questions">
          <div className="flex items-center justify-between" style={{ margin: '16px 0 8px' }}>
            <strong>Questions ({questions.length})</strong>
            <button className="btn btn-ghost btn-sm" onClick={validateReferences} type="button">✓ Validate reference queries</button>
          </div>

          {questions.map((q, i) => {
            const v = validation[q.id];
            return (
              <div key={q.id} className="lc-question">
                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                  <span className="lc-qnum">Q{i + 1}</span>
                  {questions.length > 1 && (
                    <button className="btn btn-ghost btn-sm" onClick={() => removeQ(q.id)} type="button" aria-label={`Remove question ${i + 1}`}>✕ Remove</button>
                  )}
                </div>
                <textarea className="auth-input" rows={2} value={q.prompt} onChange={(e) => patchQ(q.id, { prompt: e.target.value })} placeholder="Prompt shown to students" />
                <input className="auth-input" style={{ marginTop: 6 }} value={q.hint ?? ''} onChange={(e) => patchQ(q.id, { hint: e.target.value })} placeholder="Optional hint" />
                <textarea className="auth-input mono" style={{ marginTop: 6, fontFamily: 'var(--font-code)' }} rows={3} value={q.reference_sql} onChange={(e) => patchQ(q.id, { reference_sql: e.target.value })} placeholder="Reference / correct SQL" />
                <div className="flex items-center gap-8" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                  <span className="text-xs text-muted">Grading:</span>
                  <select
                    className="auth-input"
                    style={{ maxWidth: 320, padding: '4px 8px', fontSize: '0.82rem' }}
                    value={q.grading_mode ?? 'output'}
                    onChange={(e) => patchQ(q.id, { grading_mode: e.target.value as 'output' | 'statement' })}
                  >
                    <option value="output">Output match — run &amp; compare results (SELECT)</option>
                    <option value="statement">Statement match — text compare (DDL like ALTER…MODIFY)</option>
                  </select>
                </div>
                {v === 'ok' && <div className="lc-valid ok">✓ Valid query</div>}
                {v === 'textok' && <div className="lc-valid ok">✓ Statement-match question (text, not executed)</div>}
                {v === 'pending' && <div className="lc-valid">Checking…</div>}
                {v === 'empty' && <div className="lc-valid err">Reference SQL is empty</div>}
                {v?.startsWith('err:') && <div className="lc-valid err">✗ {v.slice(4)}</div>}
              </div>
            );
          })}
          <button className="btn btn-ghost btn-sm" onClick={addQ} type="button" style={{ marginTop: 8 }}>+ Add question</button>
        </div>

        {error && <div className="auth-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}

        <div className="flex gap-8" style={{ marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => save(false)} disabled={saving} type="button">
            {saving ? 'Saving…' : existing ? 'Save changes (keep draft)' : 'Save as draft'}
          </button>
          <button className="btn btn-gold" onClick={() => save(true)} disabled={saving} type="button">
            {saving ? 'Saving…' : 'Save & Publish'}
          </button>
          {onCancel && <button className="btn btn-ghost" onClick={onCancel} type="button">Cancel</button>}
        </div>
      </div>
    </div>
  );
}
