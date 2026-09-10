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

export default function AppShell() {
  const { session, profile, initializing, signOut } = useAuth();
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

  return profile.role === 'mam' ? <MamDashboard /> : <StudentApp />;
}
