import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getStudentsOverview, getStudentLabCompletions, exportLabCompletionsCSV } from './mamApi';
import type { StudentOverview, StudentLabRecord } from './mamApi';
import { listMyLabs, setLabPublished, deleteLab } from '../labs/labsApi';
import type { LabExperiment } from '../lib/types';
import { LabCreator } from './LabCreator';

export function MamDashboard() {
  const { profile, signOut } = useAuth();
  const [tab, setTab] = useState<'students' | 'submissions' | 'labs'>('students');

  return (
    <>
      <header className="app-header" role="banner">
        <span className="header-logo">SQLQuest<span>ByKP</span></span>
        <div className="header-sep" aria-hidden />
        <span className="header-question-title">Teacher Dashboard · {profile?.full_name}</span>
        <div className="header-right">
          <button className={`btn btn-sm ${tab === 'students' ? 'btn-gold' : 'btn-ghost-inv'}`} onClick={() => setTab('students')}>👥 Students</button>
          <button className={`btn btn-sm ${tab === 'submissions' ? 'btn-gold' : 'btn-ghost-inv'}`} onClick={() => setTab('submissions')}>📊 Lab Submissions</button>
          <button className={`btn btn-sm ${tab === 'labs' ? 'btn-gold' : 'btn-ghost-inv'}`} onClick={() => setTab('labs')}>🧪 Labs</button>
          <button className="btn btn-ghost-inv btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <main className="mam-main" role="main">
        {tab === 'students' ? (
          <StudentsTab />
        ) : tab === 'submissions' ? (
          <LabSubmissionsTab />
        ) : (
          <LabsTab mamId={profile!.id} />
        )}
      </main>
    </>
  );
}

// ── Students tab ───────────────────────────────────────────────────────────

function StudentsTab() {
  const [rows, setRows] = useState<StudentOverview[] | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    setRows(await getStudentsOverview());
  }, []);
  useEffect(() => { load(); }, [load]);

  const totals = rows?.reduce(
    (acc, r) => {
      acc.solved += r.solved;
      acc.labs += r.labsCompleted;
      acc.badges += r.badgeCount;
      return acc;
    },
    { solved: 0, labs: 0, badges: 0 }
  );

  return (
    <div className="mam-wrap">
      <div className="mam-head">
        <h2>Class Progress</h2>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      <div className="mam-stat-row">
        <Stat label="Students" value={rows?.length ?? '—'} />
        <Stat label="Questions solved" value={totals?.solved ?? '—'} />
        <Stat label="Labs completed" value={totals?.labs ?? '—'} />
        <Stat label="Badges earned" value={totals?.badges ?? '—'} />
      </div>

      <div className="ledger-card card">
        <div className="mam-table-wrap">
          {rows === null ? (
            <div style={{ padding: 24 }}><div className="loading-spinner" /></div>
          ) : rows.length === 0 ? (
            <p className="text-muted" style={{ padding: 20 }}>No students have signed up yet.</p>
          ) : (
            <table className="mam-table">
              <thead>
                <tr>
                  <th>Name</th><th>PRN</th><th>Section</th>
                  <th>Solved</th><th>Mastery</th><th>Labs</th><th>Badges</th><th>Last active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="mam-name">{r.fullName}</td>
                    <td className="mono">{r.prn ?? '—'}</td>
                    <td>{r.classSection ?? '—'}</td>
                    <td>{r.solved}<span className="text-muted"> / {r.attempted}</span></td>
                    <td>
                      <div className="mam-mastery">
                        <div className="skill-bar-track" style={{ width: 60 }}>
                          <div className={`skill-bar-fill ${r.mastery >= 0.7 ? 'mastery-high' : r.mastery >= 0.4 ? 'mastery-mid' : 'mastery-low'}`} style={{ width: `${Math.round(r.mastery * 100)}%` }} />
                        </div>
                        <span className="text-xs">{Math.round(r.mastery * 100)}%</span>
                      </div>
                    </td>
                    <td>{r.labsCompleted}<span className="text-muted"> / {r.labsAssigned}</span></td>
                    <td>🏅 {r.badgeCount}</td>
                    <td className="text-xs text-muted">{r.lastActive ? new Date(r.lastActive).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Lab Submissions & CSV Export ──────────────────────────────────────────

function LabSubmissionsTab() {
  const [records, setRecords] = useState<StudentLabRecord[] | null>(null);

  const load = useCallback(async () => {
    setRecords(null);
    setRecords(await getStudentLabCompletions());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    if (records && records.length > 0) {
      exportLabCompletionsCSV(records);
    }
  };

  return (
    <div className="mam-wrap">
      <div className="mam-head">
        <h2>Student Lab Submissions & Completions</h2>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
          <button
            className="btn btn-gold btn-sm"
            onClick={handleExport}
            disabled={!records || records.length === 0}
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      <div className="ledger-card card">
        <div className="mam-table-wrap">
          {records === null ? (
            <div style={{ padding: 24 }}><div className="loading-spinner" /></div>
          ) : records.length === 0 ? (
            <p className="text-muted" style={{ padding: 20 }}>No student lab submissions recorded yet.</p>
          ) : (
            <table className="mam-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>PRN / ID</th>
                  <th>Section</th>
                  <th>Lab Title</th>
                  <th>Status</th>
                  <th>Questions Solved</th>
                  <th>Last Submitted</th>
                  <th>Submitted Query</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={`${r.userId}_${r.labId}_${i}`}>
                    <td className="mam-name">{r.fullName}</td>
                    <td className="mono">{r.prn ?? '—'}</td>
                    <td>{r.classSection ?? '—'}</td>
                    <td><strong>{r.labTitle}</strong></td>
                    <td>
                      <span className={`pill ${r.status === 'Completed' ? 'pill-easy' : 'pill-medium'}`}>
                        {r.status === 'Completed' ? '✓ Completed' : 'In Progress'}
                      </span>
                    </td>
                    <td>{r.solvedCount} / {r.totalQuestions}</td>
                    <td className="text-xs text-muted">
                      {r.lastSubmittedAt ? new Date(r.lastSubmittedAt).toLocaleString() : '—'}
                    </td>
                    <td>
                      {r.latestSql ? (
                        <code className="mono text-xs" style={{ display: 'inline-block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.latestSql}>
                          {r.latestSql}
                        </code>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="ledger-card card mam-stat">
      <div className="card-body">
        <div className="mam-stat-value">{value}</div>
        <div className="mam-stat-label">{label}</div>
      </div>
    </div>
  );
}

// ── Labs tab ───────────────────────────────────────────────────────────────

function LabsTab({ mamId }: { mamId: string }) {
  const [labs, setLabs] = useState<LabExperiment[] | null>(null);
  const [mode, setMode] = useState<{ kind: 'list' } | { kind: 'new' } | { kind: 'edit'; lab: LabExperiment }>({ kind: 'list' });

  const load = useCallback(async () => setLabs(await listMyLabs(mamId)), [mamId]);
  useEffect(() => { load(); }, [load]);

  const afterSave = () => { setMode({ kind: 'list' }); load(); };

  if (mode.kind === 'new') return <div className="mam-wrap"><LabCreator onSaved={afterSave} onCancel={() => setMode({ kind: 'list' })} /></div>;
  if (mode.kind === 'edit') return <div className="mam-wrap"><LabCreator existing={mode.lab} onSaved={afterSave} onCancel={() => setMode({ kind: 'list' })} /></div>;

  return (
    <div className="mam-wrap">
      <div className="mam-head">
        <h2>My Lab Experiments</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setMode({ kind: 'new' })}>+ New Lab</button>
      </div>

      {labs === null && <div className="loading-spinner" />}
      {labs && labs.length === 0 && (
        <div className="ledger-card card"><div className="card-body">
          <p className="text-muted">No labs yet. Click “New Lab” to create your first experiment.</p>
        </div></div>
      )}

      <div className="labs-grid">
        {labs?.map((lab) => (
          <div key={lab.id} className={`ledger-card card ${lab.published ? 'ledger-success' : ''}`}>
            <div className="card-body">
              <div className="lab-card-top">
                <span className={`pill ${lab.published ? 'pill-easy' : 'pill-medium'}`}>{lab.published ? 'Published' : 'Draft'}</span>
                <span className="text-xs text-muted">{lab.questions.length} Qs {lab.schema_sql ? '· Custom Schema' : `· ${lab.domain.replace('_', ' ')}`}</span>
              </div>
              <h3 className="lab-card-title">{lab.title}</h3>
              <p className="lab-card-desc">{lab.description || <span className="text-muted">No description</span>}</p>
              <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
                🏅 {lab.badge_name} · Sections: {lab.target_sections.length ? lab.target_sections.join(', ') : 'All'}
              </p>
              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setMode({ kind: 'edit', lab })}>Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={async () => { await setLabPublished(lab.id, !lab.published); load(); }}>
                  {lab.published ? 'Unpublish' : 'Publish'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  if (confirm(`Delete lab “${lab.title}”?\n\nThis permanently removes the lab AND every student's submissions, the lab badge, and the completion certificate earned for it. This cannot be undone.`)) { await deleteLab(lab.id); load(); }
                }}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
