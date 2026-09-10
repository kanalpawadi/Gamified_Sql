import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Surfaced early so a missing .env is obvious in dev / on Vercel.
  console.error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    '(see .env.example).'
  );
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// PRN → synthetic email. Supabase Auth is keyed on email, so we derive a stable
// internal address from the PRN. PRNs are normalised (trimmed + lower-cased).
export const PRN_EMAIL_DOMAIN = 'sqlquest.local';

export function prnToEmail(prn: string): string {
  return `${normalizePrn(prn)}@${PRN_EMAIL_DOMAIN}`;
}

export function normalizePrn(prn: string): string {
  return prn.trim().toLowerCase();
}
