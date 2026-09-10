import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://vgbpqdnwrlfuzhmtaqij.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnYnBxZG53cmxmdXpobXRhcWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjM5MzYsImV4cCI6MjEwNDUzOTkzNn0.s0HceDJZ43gdUIbGw9xmmBrHVYtTvW-qtuGIe7nLHI0';

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey, {
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
