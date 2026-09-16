import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  getStudentsOverview,
  getStudentLabCompletions,
  exportLabCompletionsCSV,
  getAllStudentsForApproval,
  setStudentApproval,
  bulkApprovePendingStudents,
  resetStudentPassword,
} from './mamApi';
import type { StudentOverview, StudentLabRecord } from './mamApi';
import { listMyLabs, setLabPublished, deleteLab } from '../labs/labsApi';
import type { LabExperiment, StudentApprovalRecord } from '../lib/types';
import { LabCreator } from './LabCreator';

export function MamDashboard() {
  const { profile, signOut } = useAuth();
  const [tab, setTab] = useState<'students' | 'approvals' | 'submissions' | 'labs'>('students');
  const [pendingCount, setPendingCount] = useState<number>(0);

  const checkPendingCount = useCallback(async () => {
    const list = await getAllStudentsForApproval();
    setPendingCount(list.filter((s) => !s.isApproved).length);
  }, []);

  useEffect(() => {
    checkPendingCount();
  }, [checkPendingCount, tab]);

  return (
    <>
      <header className="app-header" role="banner">
        <span className="header-logo">SQLQuest<span>ByKP</span></span>
        <div className="header-sep" aria-hidden />
        <span className="header-question-title">Teacher Dashboard · {profile?.full_name}</span>
        <div className="header-right">
          <button
            className={`btn btn-sm ${tab === 'students' ? 'btn-gold' : 'btn-ghost-inv'}`}
            onClick={() => setTab('students')}
          >
            👥 Class Ledger
          </button>
          <button
            className={`btn btn-sm ${tab === 'approvals' ? 'btn-gold' : 'btn-ghost-inv'}`}
            onClick={() => setTab('approvals')}
          >
            ✅ Accept Students
            {pendingCount > 0 && <span className="badge-counter">{pendingCount}</span>}
          </button>
          <button
            className={`btn btn-sm ${tab === 'submissions' ? 'btn-gold' : 'btn-ghost-inv'}`}
            onClick={() => setTab('submissions')}
          >
            📊 Submissions
          </button>
          <button
            className={`btn btn-sm ${tab === 'labs' ? 'btn-gold' : 'btn-ghost-inv'}`}
            onClick={() => setTab('labs')}
          >
            🧪 Labs
          </button>
          <button className="btn btn-ghost-inv btn-sm" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <main className="mam-main" role="main">
        {tab === 'students' ? (
          <StudentsTab onNavigateApprovals={() => setTab('approvals')} />
        ) : tab === 'approvals' ? (
          <StudentApprovalsTab onStatusChanged={checkPendingCount} />
        ) : tab === 'submissions' ? (
          <LabSubmissionsTab />
        ) : (
          <LabsTab mamId={profile!.id} />
        )}
      </main>
    </>
  );
}

interface ResetStudentInfo {
  id: string;
  fullName: string;
  prn: string | null;
}

function ResetPasswordModal({
  student,
  onClose,
  onSuccess,
}: {
  student: ResetStudentInfo;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let pass = 'Pass#';
    for (let i = 0; i < 5; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
    setShowPassword(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setBusy(true);
    setError(null);

    const res = await resetStudentPassword(student.id, newPassword);
    setBusy(false);

    if (res.success) {
      onSuccess(`Password for "${student.fullName}" ${student.prn ? `(${student.prn})` : ''} successfully reset to: ${newPassword}`);
      onClose();
    } else {
      setError(res.error || 'Failed to reset password.');
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        className="card ledger-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 24,
          background: 'var(--card-bg, #1e293b)',
          borderColor: 'var(--border-color, rgba(255,255,255,0.1))',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>🔑 Reset Student Password</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '2px 8px' }}>✕</button>
        </div>

        <p className="text-xs text-muted" style={{ marginBottom: 16, lineHeight: 1.4 }}>
          Set a new password for student <strong>{student.fullName}</strong>
          {student.prn ? <code className="mono" style={{ marginLeft: 6 }}>({student.prn})</code> : ''}. The student will log in with this new password.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-12">
          <label className="auth-field" style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: 6 }}>New Password</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                style={{ flex: 1, padding: '8px 12px' }}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </label>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={generatePassword}
              style={{ fontSize: '0.8rem', color: 'var(--gold, #d4af37)' }}
            >
              🎲 Auto-Generate Password
            </button>
          </div>

          {error && (
            <div className="auth-error" style={{ padding: '8px 12px', fontSize: '0.82rem', marginBottom: 12 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-gold btn-sm" disabled={busy || !newPassword}>
              {busy ? 'Resetting…' : 'Save New Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Student Approvals tab ───────────────────────────────────────────────────

function StudentApprovalsTab({ onStatusChanged }: { onStatusChanged?: () => void }) {
  const [students, setStudents] = useState<StudentApprovalRecord[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<ResetStudentInfo | null>(null);

  const load = useCallback(async () => {
    setStudents(null);
    const data = await getAllStudentsForApproval();
    setStudents(data);
    if (onStatusChanged) onStatusChanged();
  }, [onStatusChanged]);

  useEffect(() => { load(); }, [load]);

  const handleSetApproval = async (student: StudentApprovalRecord, isApproved: boolean) => {
    setBusyId(student.id);
    setMessage(null);
    const res = await setStudentApproval(student.id, isApproved);
    setBusyId(null);
    if (res.success) {
      setMessage({
        type: 'success',
        text: `Student "${student.fullName}" has been ${isApproved ? 'accepted/approved' : 'rejected'}.`,
      });
      load();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update approval status.' });
    }
  };

  const handleApproveAllPending = async () => {
    if (!students) return;
    const pendingList = students.filter((s) => !s.isApproved);
    if (pendingList.length === 0) return;

    if (!confirm(`Are you sure you want to approve all ${pendingList.length} pending student accounts?`)) return;

    setBusyId('bulk');
    setMessage(null);
    const res = await bulkApprovePendingStudents(pendingList.map((s) => s.id));
    setBusyId(null);

    if (res.success) {
      setMessage({ type: 'success', text: `Successfully approved ${res.count} pending students.` });
      load();
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to bulk approve students.' });
    }
  };

  const pendingCount = students?.filter((s) => !s.isApproved).length ?? 0;
  const approvedCount = students?.filter((s) => s.isApproved).length ?? 0;
  const totalCount = students?.length ?? 0;

  const filtered = students?.filter((s) => {
    if (filter === 'pending' && s.isApproved) return false;
    if (filter === 'approved' && !s.isApproved) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.fullName.toLowerCase().includes(q);
      const matchPrn = (s.prn ?? '').toLowerCase().includes(q);
      const matchSec = (s.classSection ?? '').toLowerCase().includes(q);
      return matchName || matchPrn || matchSec;
    }
    return true;
  });

  return (
    <div className="mam-wrap">
      {resetTarget && (
        <ResetPasswordModal
          student={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={(msg) => setMessage({ type: 'success', text: msg })}
        />
      )}

      <div className="mam-head">
        <div>
          <h2>Student Registration Approvals</h2>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>
            Review, accept, or reject student access to SQLQuest labs and problem sets.
          </p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
          {pendingCount > 0 && (
            <button
              className="btn btn-gold btn-sm"
              onClick={handleApproveAllPending}
              disabled={busyId === 'bulk'}
            >
              {busyId === 'bulk' ? 'Approving…' : `✓ Accept All Pending (${pendingCount})`}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`ledger-card card ${message.type === 'success' ? 'ledger-success' : ''}`}
          style={{
            padding: '10px 16px',
            marginBottom: 16,
            background: message.type === 'success' ? 'rgba(62, 122, 76, 0.1)' : 'rgba(214, 90, 74, 0.1)',
            borderColor: message.type === 'success' ? 'var(--success)' : 'var(--error)',
            color: message.type === 'success' ? '#2b5735' : '#9e3629',
            fontSize: '0.88rem',
            fontWeight: 500,
          }}
        >
          {message.type === 'success' ? '✓ ' : '⚠️ '}
          {message.text}
        </div>
      )}

      <div className="mam-stat-row">
        <Stat label="Total Registered" value={totalCount} />
        <Stat label="Approved Students" value={approvedCount} />
        <Stat label="Pending Approval" value={pendingCount} />
      </div>

      <div className="approvals-filter-bar flex gap-12 align-center justify-between" style={{ marginBottom: 14 }}>
        <div className="flex gap-8">
          <button
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('all')}
          >
            All Students ({totalCount})
          </button>
          <button
            className={`btn btn-sm ${filter === 'pending' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => setFilter('pending')}
          >
            ⏳ Pending ({pendingCount})
          </button>
          <button
            className={`btn btn-sm ${filter === 'approved' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('approved')}
          >
            ✓ Approved ({approvedCount})
          </button>
        </div>

        <input
          type="text"
          className="approval-search-input"
          placeholder="🔍 Search name, PRN, section…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="ledger-card card">
        <div className="mam-table-wrap">
          {students === null ? (
            <div style={{ padding: 24 }}><div className="loading-spinner" /></div>
          ) : filtered?.length === 0 ? (
            <p className="text-muted" style={{ padding: 20 }}>No student records found matching filter.</p>
          ) : (
            <table className="mam-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>PRN / ID</th>
                  <th>Section</th>
                  <th>Registered Date</th>
                  <th>Approval Status</th>
                  <th>Action / Accept</th>
                </tr>
              </thead>
              <tbody>
                {filtered?.map((s) => (
                  <tr key={s.id}>
                    <td className="mam-name">{s.fullName}</td>
                    <td className="mono">{s.prn ?? '—'}</td>
                    <td>{s.classSection ?? '—'}</td>
                    <td className="text-xs text-muted">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <span className={`pill ${s.isApproved ? 'pill-approved' : 'pill-pending'}`}>
                        {s.isApproved ? '✓ Approved Student' : '⏳ Pending Approval'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-8">
                        {!s.isApproved ? (
                          <button
                            className="btn btn-sm btn-gold"
                            style={{ padding: '3px 10px', fontSize: '0.78rem' }}
                            disabled={busyId === s.id}
                            onClick={() => handleSetApproval(s, true)}
                          >
                            {busyId === s.id ? 'Saving…' : '✓ Accept as Student'}
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-ghost"
                            style={{ padding: '3px 10px', fontSize: '0.78rem', color: 'var(--error)' }}
                            disabled={busyId === s.id}
                            onClick={() => handleSetApproval(s, false)}
                          >
                            {busyId === s.id ? 'Saving…' : '✕ Reject Access'}
                          </button>
                        )}

                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ padding: '3px 10px', fontSize: '0.78rem' }}
                          onClick={() => setResetTarget({ id: s.id, fullName: s.fullName, prn: s.prn })}
                          title="Reset password manually for this student"
                        >
                          🔑 Reset Pass
                        </button>
                      </div>
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

// ── Students tab ───────────────────────────────────────────────────────────

function StudentsTab({ onNavigateApprovals }: { onNavigateApprovals?: () => void }) {
  const [rows, setRows] = useState<StudentOverview[] | null>(null);
  const [resetTarget, setResetTarget] = useState<ResetStudentInfo | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const pendingCount = rows?.filter((r) => !r.isApproved).length ?? 0;

  return (
    <div className="mam-wrap">
      {resetTarget && (
        <ResetPasswordModal
          student={resetTarget}
          onClose={() => setResetTarget(null)}
          onSuccess={(msg) => setMessage({ type: 'success', text: msg })}
        />
      )}

      <div className="mam-head">
        <h2>Class Progress Ledger</h2>
        <div className="flex gap-8">
          {pendingCount > 0 && onNavigateApprovals && (
            <button className="btn btn-gold btn-sm" onClick={onNavigateApprovals}>
              ⏳ {pendingCount} Student{pendingCount > 1 ? 's' : ''} Pending Approval
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {message && (
        <div
          className={`ledger-card card ${message.type === 'success' ? 'ledger-success' : ''}`}
          style={{
            padding: '10px 16px',
            marginBottom: 16,
            background: message.type === 'success' ? 'rgba(62, 122, 76, 0.1)' : 'rgba(214, 90, 74, 0.1)',
            borderColor: message.type === 'success' ? 'var(--success)' : 'var(--error)',
            color: message.type === 'success' ? '#2b5735' : '#9e3629',
            fontSize: '0.88rem',
            fontWeight: 500,
          }}
        >
          {message.type === 'success' ? '✓ ' : '⚠️ '}
          {message.text}
        </div>
      )}

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
                  <th>Status</th><th>Name</th><th>PRN</th><th>Section</th>
                  <th>Solved</th><th>Mastery</th><th>Labs</th><th>Badges</th><th>Last active</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className={`pill ${r.isApproved ? 'pill-approved' : 'pill-pending'}`}>
                        {r.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
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
                    <td>
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ padding: '3px 10px', fontSize: '0.78rem' }}
                        onClick={() => setResetTarget({ id: r.id, fullName: r.fullName, prn: r.prn })}
                        title="Reset password manually for this student"
                      >
                        🔑 Reset Pass
                      </button>
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


// ── Lab Submissions & CSV Export ──────────────────────────────────────────

function LabSubmissionsTab() {
  const [records, setRecords] = useState<StudentLabRecord[] | null>(null);
  const [selectedLabId, setSelectedLabId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'in_progress' | 'all'>('active');
  const [search, setSearch] = useState<string>('');

  const load = useCallback(async () => {
    setRecords(null);
    setRecords(await getStudentLabCompletions());
  }, []);

  useEffect(() => { load(); }, [load]);

  // Unique list of labs present in records
  const labsList = useMemo(() => {
    if (!records) return [];
    const map = new Map<string, string>();
    for (const r of records) {
      if (r.labId && r.labTitle) {
        map.set(r.labId, r.labTitle);
      }
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [records]);

  // Filter records based on selected experiment, status filter, and search text
  const filteredRecords = useMemo(() => {
    if (!records) return [];
    return records.filter((r) => {
      // 1. Filter by experiment / lab
      if (selectedLabId !== 'all' && r.labId !== selectedLabId) {
        return false;
      }
      // 2. Filter by completion status
      if (statusFilter === 'active' && r.status === 'Not Started') {
        return false;
      }
      if (statusFilter === 'completed' && r.status !== 'Completed') {
        return false;
      }
      if (statusFilter === 'in_progress' && r.status !== 'In Progress') {
        return false;
      }
      // 3. Filter by search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = r.fullName.toLowerCase().includes(q);
        const matchPrn = (r.prn ?? '').toLowerCase().includes(q);
        const matchSec = (r.classSection ?? '').toLowerCase().includes(q);
        const matchLab = r.labTitle.toLowerCase().includes(q);
        return matchName || matchPrn || matchSec || matchLab;
      }
      return true;
    });
  }, [records, selectedLabId, statusFilter, search]);

  // Calculated metrics for selected experiment
  const stats = useMemo(() => {
    const labRecords = records?.filter((r) => selectedLabId === 'all' || r.labId === selectedLabId) ?? [];
    const completed = labRecords.filter((r) => r.status === 'Completed').length;
    const inProgress = labRecords.filter((r) => r.status === 'In Progress').length;
    const active = completed + inProgress;
    const notStarted = labRecords.filter((r) => r.status === 'Not Started').length;
    const total = labRecords.length;
    const rate = active > 0 ? Math.round((completed / active) * 100) : 0;
    return { completed, inProgress, active, notStarted, total, rate };
  }, [records, selectedLabId]);

  const selectedLabObj = labsList.find((l) => l.id === selectedLabId);
  const selectedLabTitle = selectedLabObj ? selectedLabObj.title : 'All Experiments';

  const handleExport = () => {
    if (filteredRecords && filteredRecords.length > 0) {
      const sanitizedTitle = selectedLabTitle.replace(/[^a-zA-Z0-9_-]+/g, '_');
      const filename = `SQLQuest_${sanitizedTitle}_Submissions.csv`;
      exportLabCompletionsCSV(filteredRecords, filename);
    }
  };

  return (
    <div className="mam-wrap">
      <div className="mam-head">
        <div>
          <h2>Student Submissions & Experiment Analytics</h2>
          <p className="text-xs text-muted" style={{ marginTop: 2 }}>
            Filter by specific lab experiment to track students attempting or completed, and export custom reports.
          </p>
        </div>
        <div className="flex gap-8 align-center">
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
          <button
            className="btn btn-gold btn-sm"
            onClick={handleExport}
            disabled={!filteredRecords || filteredRecords.length === 0}
            title={`Export ${filteredRecords.length} filtered record(s) to CSV`}
          >
            📥 Export CSV ({filteredRecords.length})
          </button>
        </div>
      </div>

      {/* Summary metrics row for selected experiment */}
      <div className="mam-stat-row">
        <Stat label="Selected Experiment" value={selectedLabId === 'all' ? 'All Experiments' : selectedLabTitle} />
        <Stat label="Attempted / Active" value={records === null ? '—' : stats.active} />
        <Stat label="Completed Students" value={records === null ? '—' : stats.completed} />
        <Stat label="In Progress" value={records === null ? '—' : stats.inProgress} />
        <Stat label="Completion Rate" value={records === null ? '—' : `${stats.rate}%`} />
      </div>

      {/* Filter and Experiment Sorting Controls */}
      <div
        className="approvals-filter-bar flex gap-12 align-center justify-between"
        style={{ marginBottom: 14, flexWrap: 'wrap', gap: 12 }}
      >
        <div className="flex gap-12 align-center" style={{ flexWrap: 'wrap' }}>
          {/* Experiment Select Dropdown */}
          <div className="flex align-center gap-6">
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--gold, #c9a227)' }}>
              🧪 Experiment:
            </span>
            <select
              className="approval-search-input"
              style={{ padding: '6px 12px', minWidth: 200, cursor: 'pointer', background: 'var(--panel, #fff)' }}
              value={selectedLabId}
              onChange={(e) => setSelectedLabId(e.target.value)}
            >
              <option value="all">🌐 All Experiments ({labsList.length})</option>
              {labsList.map((lab) => (
                <option key={lab.id} value={lab.id}>
                  🧪 {lab.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Pills */}
          <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${statusFilter === 'active' ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => setStatusFilter('active')}
              title="Show students who are attempting or completed"
            >
              ⚡ Active ({stats.active})
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'completed' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter('completed')}
            >
              ✓ Completed ({stats.completed})
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'in_progress' ? 'btn-gold' : 'btn-ghost'}`}
              onClick={() => setStatusFilter('in_progress')}
            >
              ⏳ In Progress ({stats.inProgress})
            </button>
            <button
              className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setStatusFilter('all')}
              title="Show all records including not started"
            >
              All Records ({stats.total})
            </button>
          </div>
        </div>

        {/* Search input */}
        <input
          type="text"
          className="approval-search-input"
          placeholder="🔍 Search name, PRN, section..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 220 }}
        />
      </div>

      {/* Submissions Table */}
      <div className="ledger-card card">
        <div className="mam-table-wrap">
          {records === null ? (
            <div style={{ padding: 24 }}><div className="loading-spinner" /></div>
          ) : filteredRecords.length === 0 ? (
            <p className="text-muted" style={{ padding: 24, textAlign: 'center' }}>
              No student records found matching experiment <strong>"{selectedLabTitle}"</strong> and current status filters.
            </p>
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
                {filteredRecords.map((r, i) => (
                  <tr key={`${r.userId}_${r.labId}_${i}`}>
                    <td className="mam-name">{r.fullName}</td>
                    <td className="mono">{r.prn ?? '—'}</td>
                    <td>{r.classSection ?? '—'}</td>
                    <td><strong>{r.labTitle}</strong></td>
                    <td>
                      <span className={`pill ${r.status === 'Completed' ? 'pill-easy' : r.status === 'In Progress' ? 'pill-medium' : 'pill-basic'}`}>
                        {r.status === 'Completed' ? '✓ Completed' : r.status === 'In Progress' ? 'In Progress' : 'Not Started'}
                      </span>
                    </td>
                    <td>{r.solvedCount} / {r.totalQuestions}</td>
                    <td className="text-xs text-muted">
                      {r.lastSubmittedAt ? new Date(r.lastSubmittedAt).toLocaleString() : '—'}
                    </td>
                    <td>
                      {r.latestSql ? (
                        <code
                          className="mono text-xs"
                          style={{ display: 'inline-block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={r.latestSql}
                        >
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
