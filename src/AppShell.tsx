import { useEffect, useState } from 'react';
import './index.css';
import { useAuth } from './auth/AuthContext';
import { LoginView } from './auth/LoginView';
import { MamDashboard } from './mam/MamDashboard';
import { StudentApp } from './App';

function FullLoader({ label, onEscape }: { label: string; onEscape?: () => void }) {
  return (
    <div className="welcome-screen" style={{ flexDirection: 'column', gap: 16 }}>
      <div className="loading-spinner" />
      <p className="text-muted">{label}</p>
      {onEscape && (
        <button className="btn btn-ghost btn-sm" onClick={onEscape} style={{ marginTop: 12 }}>
          Taking too long? Reset Session / Sign Out
        </button>
      )}
    </div>
  );
}

function PendingApprovalView({
  fullName,
  prn,
  onRefresh,
  onSignOut,
}: {
  fullName: string;
  prn: string | null;
  onRefresh: () => void;
  onSignOut: () => void;
}) {
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    await onRefresh();
    setTimeout(() => setChecking(false), 500);
  };

  return (
    <div className="welcome-screen" style={{ flexDirection: 'column', padding: 20 }}>
      <div className="ledger-card card pending-approval-card">
        <div className="pending-approval-icon">🚫</div>
        <h2>Access Restricted by Instructor</h2>
        <p style={{ marginTop: 12, fontSize: '0.95rem', color: 'var(--ink)' }}>
          Student: <strong>{fullName}</strong> {prn ? `(${prn})` : ''}
        </p>
        <p className="text-muted text-sm" style={{ marginTop: 10, lineHeight: 1.5 }}>
          Your student access is currently <strong>not accepted/approved</strong> by your teacher (Mam).
          <br /><br />
          <strong>What this means:</strong> You cannot view or attempt any SQL labs, exercises, certificates, or badges until your instructor accepts your account.
        </p>
        <div className="flex gap-12 justify-center" style={{ marginTop: 24 }}>
          <button
            className="btn btn-gold"
            onClick={handleRefresh}
            disabled={checking}
          >
            {checking ? 'Checking Status…' : '↻ Check Approval Status'}
          </button>
          <button className="btn btn-ghost" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { session, profile, initializing, signOut, refreshProfile } = useAuth();
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    if (initializing || (session && !profile)) {
      const timer = setTimeout(() => setTimeoutReached(true), 4000);
      return () => clearTimeout(timer);
    } else {
      setTimeoutReached(false);
    }
  }, [initializing, session, profile]);

  if (initializing) {
    return (
      <FullLoader
        label="Loading SQLQuestByKP…"
        onEscape={timeoutReached ? signOut : undefined}
      />
    );
  }

  if (!session) return <LoginView />;

  if (!profile) {
    return (
      <FullLoader
        label="Loading your profile…"
        onEscape={signOut}
      />
    );
  }

  if (profile.role === 'mam') {
    return <MamDashboard />;
  }

  if (profile.is_approved === false) {
    return (
      <PendingApprovalView
        fullName={profile.full_name || 'Student'}
        prn={profile.prn}
        onRefresh={refreshProfile}
        onSignOut={signOut}
      />
    );
  }

  return <StudentApp />;
}

