import { jsPDF } from 'jspdf';
import type { LabExperiment, LabSubmission } from '../lib/types';

// Design tokens (RGB) — same palette as certificates/generateCertificate.ts
const INK: [number, number, number] = [31, 27, 22];
const MUTED: [number, number, number] = [107, 101, 88];
const PRIMARY: [number, number, number] = [43, 58, 103];
const GOLD: [number, number, number] = [201, 162, 39];
const SUCCESS: [number, number, number] = [62, 122, 76];
const DANGER: [number, number, number] = [160, 52, 44];
const CODE_BG: [number, number, number] = [244, 240, 232];

// jsPDF's built-in fonts only cover WinAnsi; map common typographic characters
// to ASCII so prompts/queries never render as garbage.
function ascii(s: string): string {
  return s
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/\t/g, '  ')
    .replace(/[^\x0A\x0D\x20-\x7E]/g, '');
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Builds and downloads a PDF report of a student's lab: each question, the
 * student's accepted answer, attempt counts and pass status. Read-only — uses
 * the submissions already recorded in lab_submissions.
 */
export function generateLabReportPdf(params: {
  lab: LabExperiment;
  submissions: LabSubmission[];
  studentName: string;
  prn?: string | null;
  section?: string | null;
}): void {
  const { lab, submissions, studentName, prn, section } = params;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;               // page margin
  const CW = W - M * 2;       // content width
  let y = M;

  const fillC = (c: [number, number, number]) => doc.setFillColor(c[0], c[1], c[2]);
  const drawC = (c: [number, number, number]) => doc.setDrawColor(c[0], c[1], c[2]);
  const textC = (c: [number, number, number]) => doc.setTextColor(c[0], c[1], c[2]);

  const ensure = (needed: number) => {
    if (y + needed > H - M) { doc.addPage(); y = M; }
  };

  // ── Group submissions per question ─────────────────────────
  const byQ = new Map<string, LabSubmission[]>();
  for (const s of submissions) {
    const arr = byQ.get(s.question_id) ?? [];
    arr.push(s);
    byQ.set(s.question_id, arr);
  }
  const rows = lab.questions.map((q) => {
    const subs = (byQ.get(q.id) ?? []).slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
    const passes = subs.filter((s) => s.passed);
    const accepted = passes[passes.length - 1];
    return {
      q,
      attempts: subs.length,
      passed: passes.length > 0,
      firstPassAt: passes[0]?.created_at ?? null,
      answer: accepted?.submitted_sql ?? null,
    };
  });
  const solved = rows.filter((r) => r.passed).length;
  const totalAttempts = rows.reduce((n, r) => n + r.attempts, 0);
  const completedAt = rows.every((r) => r.passed)
    ? rows.map((r) => r.firstPassAt!).sort().pop() ?? null
    : null;

  // ── Header ─────────────────────────────────────────────────
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  textC(PRIMARY);
  doc.text('SQLQuest', M, y + 6);
  const bw = doc.getTextWidth('SQLQuest');
  textC(GOLD);
  doc.text('ByKP', M + bw + 3, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  textC(MUTED);
  doc.text('LAB SUBMISSION REPORT', W - M, y + 6, { align: 'right', charSpace: 1.5 });

  y += 18;
  drawC(GOLD);
  doc.setLineWidth(1.5);
  doc.line(M, y, W - M, y);
  y += 28;

  // ── Lab title + description ────────────────────────────────
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  textC(INK);
  const titleLines = doc.splitTextToSize(ascii(lab.title), CW);
  doc.text(titleLines, M, y);
  y += titleLines.length * 20;

  if (lab.description) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    textC(MUTED);
    const dl = doc.splitTextToSize(ascii(lab.description), CW);
    doc.text(dl, M, y);
    y += dl.length * 13 + 6;
  }

  // ── Student / summary box ──────────────────────────────────
  const info: [string, string][] = [
    ['Student', ascii(studentName || 'Student')],
    ['PRN', prn?.trim() || 'N/A'],
    ['Section', section?.trim() || 'N/A'],
    ['Result', `${solved} / ${lab.questions.length} solved`],
    ['Total attempts', String(totalAttempts)],
    ['Completed on', completedAt ? fmtDate(completedAt) : 'In progress'],
  ];
  const boxH = 3 * 18 + 20;
  fillC(CODE_BG);
  doc.roundedRect(M, y, CW, boxH, 6, 6, 'F');
  const colW = CW / 2;
  info.forEach(([k, v], i) => {
    const cx = M + 14 + (i % 2) * colW;
    const cy = y + 22 + Math.floor(i / 2) * 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    textC(MUTED);
    doc.text(k.toUpperCase(), cx, cy);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    textC(INK);
    doc.text(v, cx + 90, cy);
  });
  y += boxH + 26;

  // ── Questions ──────────────────────────────────────────────
  rows.forEach((r, i) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const promptLines = doc.splitTextToSize(ascii(`Q${i + 1}. ${r.q.prompt}`), CW - 80);
    ensure(promptLines.length * 14 + 60);

    textC(INK);
    doc.text(promptLines, M, y);

    // status pill
    const label = r.passed ? 'PASSED' : 'NOT SOLVED';
    fillC(r.passed ? SUCCESS : DANGER);
    doc.roundedRect(W - M - 70, y - 10, 70, 15, 7, 7, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(label, W - M - 35, y, { align: 'center' });

    y += promptLines.length * 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    textC(MUTED);
    const meta = `Attempts: ${r.attempts}` + (r.firstPassAt ? `   |   First solved: ${fmtDate(r.firstPassAt)}` : '');
    doc.text(meta, M, y + 2);
    y += 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    textC(PRIMARY);
    doc.text(r.passed ? 'Your accepted answer' : 'No accepted answer yet', M, y + 4);
    y += 10;

    if (r.answer) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      const codeLines: string[] = ascii(r.answer.trim())
        .split(/\r?\n/)
        .flatMap((ln) => doc.splitTextToSize(ln || ' ', CW - 20) as string[]);
      const LH = 11;
      // Draw the code block in page-sized chunks so long queries paginate.
      let idx = 0;
      while (idx < codeLines.length) {
        ensure(LH + 16);
        const room = Math.max(1, Math.floor((H - M - y - 12) / LH));
        const chunk = codeLines.slice(idx, idx + room);
        const h = chunk.length * LH + 12;
        fillC(CODE_BG);
        doc.rect(M, y, CW, h, 'F');
        drawC(GOLD);
        doc.setLineWidth(2);
        doc.line(M, y, M, y + h);
        textC(INK);
        doc.setFont('courier', 'normal');
        doc.setFontSize(9);
        doc.text(chunk, M + 10, y + 14);
        y += h;
        idx += chunk.length;
      }
    } else if (r.passed) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      textC(MUTED);
      doc.text('(query text not recorded)', M, y + 8);
      y += 12;
    }
    y += 22;
  });

  // ── Footer on every page ───────────────────────────────────
  const pages = doc.getNumberOfPages();
  const generated = fmtDate(new Date().toISOString());
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    textC(MUTED);
    doc.text(`Generated ${generated}`, M, H - 24);
    doc.text(`Page ${p} of ${pages}`, W - M, H - 24, { align: 'right' });
  }

  const fileSafe = lab.title.replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
  const prnSafe = (prn ?? '').replace(/[^\w]+/g, '');
  doc.save(`SQLQuest_LabReport_${fileSafe}${prnSafe ? `_${prnSafe}` : ''}.pdf`);
}
