import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
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

export async function generateCertificatePdf(params: {
  recipientName: string;
  prn?: string | null;
  title: string;
  certType: CertType;
  issuedAt: string; // ISO date
}): Promise<void> {
  const { recipientName, prn, title, certType, issuedAt } = params;

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
  doc.text('CERTIFICATE OF ACHIEVEMENT', cx, 96, { align: 'center' });

  // ── Brand (SQLQuestByKP centered together) ──────────────────
  doc.setFont('times', 'bold');
  doc.setFontSize(30);
  const brand1 = 'SQLQuest';
  const brand2 = 'ByKP';
  const w1 = doc.getTextWidth(brand1);
  const w2 = doc.getTextWidth(brand2);
  const gap = 4;
  const totalBrandW = w1 + gap + w2;
  const brandStartX = cx - totalBrandW / 2;

  textC(PRIMARY);
  doc.text(brand1, brandStartX, 138);
  textC(GOLD);
  doc.text(brand2, brandStartX + w1 + gap, 138);

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
  doc.text(title, cx, 365, { align: 'center', maxWidth: W - 160 });

  // ── Bottom section: QR Code with Student details ────────────
  const studentNameStr = recipientName || 'Student';
  const prnStr = prn ? prn.trim() : 'N/A';
  const qrContent = `Name: ${studentNameStr}\nPRN: ${prnStr}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(qrContent, {
      margin: 1,
      width: 250,
      color: {
        dark: '#1F1B16',
        light: '#FAF6EF',
      },
    });

    const qrSize = 85;
    const qrX = cx - qrSize / 2;
    const qrY = H - 150;

    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // Label under QR
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    textC(MUTED);
    doc.text('Scan for Student Details', cx, qrY + qrSize + 14, { align: 'center' });
  } catch (err) {
    console.error('Failed to generate QR code for certificate:', err);
  }

  // Issue date string at bottom center
  const dateStr = new Date(issuedAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  textC(MUTED);
  doc.text(`Issued: ${dateStr}`, cx, H - 38, { align: 'center' });

  const fileSafe = title.replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
  doc.save(`SQLQuest_${fileSafe}.pdf`);
}
