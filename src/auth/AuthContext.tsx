import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, prnToEmail, normalizePrn } from '../lib/supabaseClient';
import type { Profile } from '../lib/types';
import { getEffectiveApproval } from '../mam/mamApi';

interface AuthResult { error?: string }

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  initializing: boolean;   // first session/profile load in flight
  busy: boolean;           // an auth action in flight
  signInWithPrn: (prn: string, password: string) => Promise<AuthResult>;
  signUpStudent: (p: { prn: string; password: string; fullName: string; classSection: string }) => Promise<AuthResult>;
  signUpMam: (p: { prn: string; password: string; fullName: string; code: string }) => Promise<AuthResult>;
  upgradeToMam: (p: { prn: string; password: string; code: string }) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(id: string, retries = 4): Promise<Profile | null> {
  for (let i = 0; i < retries; i++) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (data) {
      const prof = data as Profile;
      prof.is_approved = getEffectiveApproval(prof);
      return prof;
    }
    if (error) console.error('fetchProfile:', error.message);
    // Profile is created by a DB trigger right after signup — brief retry.
    await new Promise((r) => setTimeout(r, 350));
  }
  return null;
}

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Incorrect PRN or password.';
  if (m.includes('already registered')) return 'That PRN / login ID is already registered. Use Sign In instead.';
  if (m.includes('password should be')) return 'Password must be at least 6 characters.';
  if (m.includes('email') && m.includes('confirm')) {
    return 'Email confirmation is enabled in Supabase — an admin must disable "Confirm email" for PRN logins to work.';
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        lastUserId.current = data.session.user.id;
        const prof = await fetchProfile(data.session.user.id);
        if (!active) return;
        setProfile(prof);
      }
      setInitializing(false);
    }).catch((err) => {
      console.error('getSession error:', err);
      if (active) setInitializing(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!active) return;
      setSession(s);
      const uid = s?.user?.id ?? null;
      if (uid) {
        lastUserId.current = uid;
        const prof = await fetchProfile(uid);
        if (!active) return;
        setProfile(prof);
      } else {
        lastUserId.current = null;
        setProfile(null);
      }
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const refreshProfile = async () => {
    const uid = session?.user?.id;
    if (uid) setProfile(await fetchProfile(uid, 1));
  };

  const signInWithPrn: AuthContextValue['signInWithPrn'] = async (prn, password) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: prnToEmail(prn), password,
      });
      if (error) return { error: mapAuthError(error.message) };
      if (data.user) setProfile(await fetchProfile(data.user.id));
      return {};
    } finally { setBusy(false); }
  };

  const signUpStudent: AuthContextValue['signUpStudent'] = async ({ prn, password, fullName, classSection }) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: prnToEmail(prn),
        password,
        options: { data: { prn: normalizePrn(prn), full_name: fullName.trim(), class_section: classSection.trim() } },
      });
      if (error) return { error: mapAuthError(error.message) };
      if (!data.session) {
        return { error: 'Account created but no session returned. Disable "Confirm email" in Supabase Auth settings.' };
      }
      if (data.user) setProfile(await fetchProfile(data.user.id));
      return {};
    } finally { setBusy(false); }
  };

  const redeem = async (code: string): Promise<AuthResult> => {
    const { error } = await supabase.rpc('redeem_mam_invite', { p_code: code.trim() });
    if (error) return { error: error.message.replace(/^.*:\s*/, '') };
    await refreshProfile();
    return {};
  };

  const signUpMam: AuthContextValue['signUpMam'] = async ({ prn, password, fullName, code }) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: prnToEmail(prn),
        password,
        options: { data: { prn: normalizePrn(prn), full_name: fullName.trim() } },
      });
      if (error) return { error: mapAuthError(error.message) };
      if (!data.session) {
        return { error: 'Account created but no session returned. Disable "Confirm email" in Supabase Auth settings.' };
      }
      const r = await redeem(code);
      if (r.error) {
        // Leave them signed in as a student; they can retry redemption.
        if (data.user) setProfile(await fetchProfile(data.user.id));
        return {
          error: `Your account was created as a student — the invite code was rejected (${r.error}). `
            + `Each invite code works only once. Switch to "Upgrade Account", sign in with this ID, `
            + `and enter a valid (unused) code to become a teacher.`,
        };
      }
      return {};
    } finally { setBusy(false); }
  };

  const upgradeToMam: AuthContextValue['upgradeToMam'] = async ({ prn, password, code }) => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: prnToEmail(prn), password });
      if (error) return { error: mapAuthError(error.message) };
      const r = await redeem(code);
      if (r.error) return { error: r.error };
      return {};
    } finally { setBusy(false); }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    lastUserId.current = null;
  };

  return (
    <AuthContext.Provider value={{
      session, profile, initializing, busy,
      signInWithPrn, signUpStudent, signUpMam, upgradeToMam, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
