import { useState } from 'react';
import type { FormEvent, InputHTMLAttributes } from 'react';
import { useAuth } from './AuthContext';
import { CLASS_SECTIONS } from '../data/sections';

type Mode = 'login' | 'signup' | 'mam';

export function LoginView() {
  const { signInWithPrn, signUpStudent, signUpMam, upgradeToMam, busy } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [mamAction, setMamAction] = useState<'login' | 'signup' | 'upgrade'>('login');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // form fields
  const [prn, setPrn] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [classSection, setClassSection] = useState('');
  const [code, setCode] = useState('');

  const reset = () => { setError(null); setNotice(null); };

  const switchMode = (m: Mode) => { setMode(m); setMamAction('login'); reset(); };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    reset();
    let res;
    if (mode === 'login' || (mode === 'mam' && mamAction === 'login')) {
      res = await signInWithPrn(prn, password);
    } else if (mode === 'signup') {
      if (!fullName.trim()) { setError('Please enter your full name.'); return; }
      res = await signUpStudent({ prn, password, fullName, classSection });
    } else if (mode === 'mam' && mamAction === 'upgrade') {
      res = await upgradeToMam({ prn, password, code });
    } else {
      if (!fullName.trim()) { setError('Please enter your full name.'); return; }
      res = await signUpMam({ prn, password, fullName, code });
    }
    if (res?.error) setError(res.error);
    // On success, AppShell re-routes automatically via auth state change.
  };

  const tab = (m: Mode, label: string) => (
    <button
      type="button"
      className={`auth-tab ${mode === m ? 'active' : ''}`}
      onClick={() => switchMode(m)}
      aria-pressed={mode === m}
    >
      {label}
    </button>
  );

  const field = (
    label: string,
    value: string,
    setter: (v: string) => void,
    props: InputHTMLAttributes<HTMLInputElement> = {}
  ) => (
    <label className="auth-field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(e) => setter(e.target.value)}
        className="auth-input"
        {...props}
      />
    </label>
  );

  return (
    <div className="auth-screen">
      <div className="ledger-card card auth-card">
        <div className="auth-brand">
          <span className="auth-logo">SQLQuest<span>ByKP</span></span>
          <p className="auth-tagline">Master SQL, one query at a time.</p>
        </div>

        <div className="auth-tabs" role="tablist">
          {tab('login', 'Student Login')}
          {tab('signup', 'Student Sign Up')}
          {tab('mam', 'Teacher (Mam)')}
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          {mode === 'mam' && (
            <div className="flex gap-8" style={{ marginBottom: 12, justifyContent: 'center' }}>
              <button
                type="button"
                className={`btn btn-sm ${mamAction === 'login' ? 'btn-gold' : 'btn-ghost'}`}
                onClick={() => { setMamAction('login'); reset(); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`btn btn-sm ${mamAction === 'signup' ? 'btn-gold' : 'btn-ghost'}`}
                onClick={() => { setMamAction('signup'); reset(); }}
              >
                Register New Teacher
              </button>
              <button
                type="button"
                className={`btn btn-sm ${mamAction === 'upgrade' ? 'btn-gold' : 'btn-ghost'}`}
                onClick={() => { setMamAction('upgrade'); reset(); }}
              >
                Upgrade Account
              </button>
            </div>
          )}

          {mode === 'signup' && field('Full name', fullName, setFullName, { placeholder: 'e.g. Aditi Sharma', autoComplete: 'name' })}
          {mode === 'mam' && mamAction === 'signup' && field('Full name', fullName, setFullName, { placeholder: 'e.g. Prof. K. Patil', autoComplete: 'name' })}

          {field(
            mode === 'mam' ? 'Teacher Login ID' : 'PRN',
            prn, setPrn,
            { placeholder: mode === 'mam' ? 'e.g. mam.kpatil' : 'e.g. 24uad025', autoComplete: 'username', required: true }
          )}

          {mode === 'signup' && (
            <label className="auth-field">
              <span>Class / Section</span>
              <select
                className="auth-input"
                value={classSection}
                onChange={(e) => setClassSection(e.target.value)}
                required
              >
                <option value="">Select your section…</option>
                {CLASS_SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          )}

          {field('Password', password, setPassword, {
            type: 'password',
            placeholder: (mode === 'login' || (mode === 'mam' && mamAction === 'login')) ? 'Your password' : 'At least 6 characters',
            autoComplete: (mode === 'login' || (mode === 'mam' && mamAction === 'login')) ? 'current-password' : 'new-password',
            required: true,
          })}

          {mode === 'mam' && mamAction !== 'login' && field('Invite code', code, setCode, { placeholder: 'Provided by admin', required: true })}

          {error && <div className="auth-error" role="alert">{error}</div>}
          {notice && <div className="auth-notice">{notice}</div>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
            {busy ? 'Please wait…' :
              mode === 'login' ? 'Sign In' :
              mode === 'signup' ? 'Create Student Account' :
              mode === 'mam' && mamAction === 'login' ? 'Teacher Sign In' :
              mamAction === 'upgrade' ? 'Upgrade to Teacher' : 'Create Teacher Account'}
          </button>
        </form>

        <p className="auth-foot">
          {mode === 'login' ? (
            <>
              New student? Use the Sign Up tab.
              <br />
              <span className="text-muted" style={{ fontSize: '0.78rem', display: 'inline-block', marginTop: 4 }}>
                💡 Forgot password? Please ask Mam (your instructor) to reset your password.
              </span>
            </>
          ) : mode === 'mam' && mamAction === 'login' ? (
            'Once registered, teachers do not need an invite code to log in.'
          ) : (
            'Progress, badges & certificates sync to your account.'
          )}
        </p>
      </div>
    </div>
  );
}
