import { jsPDF } from 'jspdf';
import type { CertType } from '../lib/types';

// Design tokens (RGB) — mirrors src/index.css :root
const INK: [number, number, number] = [31, 27, 22];
const MUTED: [number, number, number] = [107, 101, 88];
const PRIMARY: [number, number, number] = [43, 58, 103];
const GOLD: [number, number, number] = [201, 162, 39];
const SUCCESS: [number, number, number] = [62, 122, 76];
const BG: [number, number, number] = [250, 246, 239];

// NOTE: jsPDF ships only Helvetica / Times / Courier. We approximate Fraunces
// (a serif display face) with Times to avoid embedding a large TTF in the
// bundle. Colours and layout match the design system exactly.

function subtitleFor(certType: CertType, title: string): string {
  switch (certType) {
    case 'basic_sql':
      return 'has demonstrated proficiency in Basic SQL by solving 40 or more foundational problems.';
    case 'intermediate_sql':
      return 'has demonstrated proficiency in Intermediate SQL by solving 20 or more problems.';
    case 'advanced_sql':
      return 'has demonstrated mastery of Advanced SQL by solving 12 or more challenging problems.';
    case 'lab_completion':
      return `has successfully completed every challenge in the "${title.replace(/ — Completion Certificate$/, '')}" lab experiment.`;
    default:
      return 'has successfully met all requirements.';
  }
}

export function generateCertificatePdf(params: {
  recipientName: string;
  title: string;
  certType: CertType;
  issuedAt: string; // ISO date
}): void {
  const { recipientName, title, certType, issuedAt } = params;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const cx = W / 2;

  const fillC = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const drawC = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
  const textC = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

  // ── Background ──────────────────────────────────────────────
  fillC(BG);
  doc.rect(0, 0, W, H, 'F');

  // ── Landmark border (double, in gold) ──────────────────────
  drawC(GOLD);
  doc.setLineWidth(6);
  doc.rect(24, 24, W - 48, H - 48);
  doc.setLineWidth(1.5);
  doc.rect(36, 36, W - 72, H - 72);

  // ── Eyebrow ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  textC(MUTED);
  doc.text('CERTIFICATE OF ACHIEVEMENT', cx, 96, { align: 'center', charSpace: 3 });

  // ── Brand ───────────────────────────────────────────────────
  doc.setFont('times', 'bold');
  doc.setFontSize(30);
  textC(PRIMARY);
  doc.text('SQLQuest', cx, 138, { align: 'center' });
  textC(GOLD);
  const brandW = doc.getTextWidth('SQLQuest');
  doc.text('ByKP', cx + brandW / 2 + 6, 138, { align: 'left' });

  // ── "This certifies that" ──────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  textC(INK);
  doc.text('This certifies that', cx, 196, { align: 'center' });

  // ── Recipient name ─────────────────────────────────────────
  doc.setFont('times', 'bolditalic');
  doc.setFontSize(46);
  textC(PRIMARY);
  doc.text(recipientName || 'Student', cx, 250, { align: 'center' });

  // underline flourish
  const nameW = Math.min(doc.getTextWidth(recipientName || 'Student') + 40, W - 160);
  drawC(GOLD);
  doc.setLineWidth(1.5);
  doc.line(cx - nameW / 2, 264, cx + nameW / 2, 264);

  // ── Subtitle ────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  textC(MUTED);
  const subtitle = subtitleFor(certType, title);
  const lines = doc.splitTextToSize(subtitle, W - 220);
  doc.text(lines, cx, 298, { align: 'center' });

  // ── Certificate title (in success green) ───────────────────
  doc.setFont('times', 'bold');
  doc.setFontSize(30);
  textC(SUCCESS);
  doc.text(title, cx, 372, { align: 'center', maxWidth: W - 160 });

  // ── Footer: issue date + seal line ─────────────────────────
  const dateStr = new Date(issuedAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  drawC(MUTED);
  doc.setLineWidth(0.75);
  doc.line(cx - 150, H - 96, cx - 30, H - 96);
  doc.line(cx + 30, H - 96, cx + 150, H - 96);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  textC(MUTED);
  doc.text(`Issued ${dateStr}`, cx - 90, H - 82, { align: 'center' });
  doc.text('SQLQuestByKP', cx + 90, H - 82, { align: 'center' });

  const fileSafe = title.replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
  doc.save(`SQLQuest_${fileSafe}.pdf`);
}
