import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { CertificateRow } from '../lib/types';
import { MILESTONE_CERTS } from '../progress/progressApi';
import { generateCertificatePdf } from './generateCertificate';

export function CertificatesSection({
  fullName,
  completedByCategory,
}: {
  fullName: string;
  completedByCategory: { basic: number; intermediate: number; advanced: number };
}) {
  const [certs, setCerts] = useState<CertificateRow[] | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .order('issued_at', { ascending: false });
    if (error) { console.error('load certs:', error.message); setCerts([]); return; }
    setCerts(data as CertificateRow[]);
  };

  useEffect(() => { load(); }, []);

  const issuedTitles = new Set((certs ?? []).map((c) => c.title));

  return (
    <div className="certs-wrap">
      <div className="labs-head">
        <h2>📜 Certificates</h2>
        <p className="text-muted">Earn certificates by hitting solving milestones and completing labs. Download a PDF for each.</p>
      </div>

      {certs === null && <div className="loading-spinner" />}

      {certs && certs.length > 0 && (
        <div className="certs-grid">
          {certs.map((c) => (
            <div key={c.id} className="ledger-card card ledger-gold cert-card">
              <div className="card-body">
                <div className="cert-seal" aria-hidden>🏆</div>
                <h3 className="cert-title">{c.title}</h3>
                <p className="cert-meta">Issued {new Date(c.issued_at).toLocaleDateString()}</p>
                <button
                  className="btn btn-gold btn-sm"
                  onClick={() => generateCertificatePdf({
                    recipientName: fullName,
                    title: c.title,
                    certType: c.cert_type,
                    issuedAt: c.issued_at,
                  })}
                >
                  ⬇ Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Milestone progress toward not-yet-earned certificates */}
      <div className="labs-head" style={{ marginTop: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-head)' }}>Milestone progress</h3>
      </div>
      <div className="certs-progress">
        {MILESTONE_CERTS.map((m) => {
          const have = completedByCategory[m.category as keyof typeof completedByCategory];
          const pct = Math.min(100, Math.round((have / m.threshold) * 100));
          const earned = issuedTitles.has(m.title) || have >= m.threshold;
          return (
            <div key={m.cert_type} className="ledger-card card">
              <div className="card-body">
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <strong>{m.title}</strong>
                  <span className={earned ? 'diff-matched' : 'text-muted'} style={{ fontSize: '0.82rem' }}>
                    {earned ? '✓ Earned' : `${have}/${m.threshold}`}
                  </span>
                </div>
                <div className="skill-bar-track">
                  <div className={`skill-bar-fill ${earned ? 'mastery-high' : 'mastery-mid'}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-muted text-xs" style={{ marginTop: 6 }}>
                  Solve {m.threshold} {m.category} questions to earn this certificate.
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
