# SQLQuest — Gamified In-Browser SQL Learning Platform

> **Duolingo for SQL**, powered by an ephemeral in-browser SQLite WASM engine (`sql.js`) that knows what you're actually stuck on.

---

## 🌟 Overview & Key Features

SQLQuest is a static, single-page, gamified SQL learning platform. It runs client-side SQL queries directly in the browser with **zero backend servers**, **zero database persistence between attempts**, and **no login required**.

- **Ephemeral WASM Query Execution**: Every question load and query run spins up a fresh, isolated in-memory SQLite database instance via `sql.js`.
- **Locked Editorial Design System**: Warm Cream background (`#FAF6EF`), Deep Indigo (`#2B3A67`), Muted Gold (`#C9A227`), Coral (`#D65A4A`), and Positive Green (`#3E7A4C`) with typography by **Fraunces**, **Inter**, and **JetBrains Mono**.
- **Signature "Ledger" Motif**: Index-card tab-divider edge details on schema and query log cards.
- **Adaptive Progression Engine**:
  - Per-tag skill profile stored in `localStorage` (`{ solved, failed, mastery }`).
  - Stuck detection (3+ failed attempts, full hint revealed + failing, or 90s+ idle).
  - Step-down reroute & weak tag marking.
  - Micro-lesson injection on repeated stuck events.
  - Spaced repetition decay-aware review queue (~1-in-6 picks).
  - Confidence-gated progressive hints.
- **Error Classifier & Diagnostics**: Categorizes errors into specific gaps (missing WHERE, wrong JOIN, missing GROUP BY, wrong aggregate, off-by-one LIMIT, NULL handling, syntax typo) instead of generic failure messages.
- **Gamification**: XP, level thresholds, daily solve streaks, session streaks, and 10+ unlockable badges.
- **Rich Question Bank**: 215+ questions across 3 domain schemas (`company_hr`, `retail`, `campus`) spanning Basic (150+), Intermediate (40+), and Advanced (25+).

---

## 🚀 Static & Vercel Compatibility Note

> [!NOTE]
> **Static / Vercel-Free Compatible**: SQLQuest compiles to pure static HTML/CSS/JS artifacts in the `/dist` directory with zero backend dependencies, environment variables, or serverless functions required. It can be deployed directly for free on Vercel, Netlify, or GitHub Pages with plain static importing.

---

## 💻 Local Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Dev Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Build Static Production Distribution**:
   ```bash
   npm run build
   ```
   The static build output will be generated in `dist/`.

4. **Preview Production Build**:
   ```bash
   npm run preview
   ```

---

## 📁 Architecture Directory Structure

```
Gamified_Sql/
├── public/
│   └── sql-wasm.wasm            # Bundled SQLite WASM file
├── src/
│   ├── data/
│   │   ├── domains.ts           # Base schemas & seed SQL for company_hr, retail, campus
│   │   ├── microLessons.ts      # Concept cards for repeated stuck events
│   │   ├── questions/
│   │   │   ├── basic.ts         # 150+ basic questions
│   │   │   ├── intermediate.ts  # 40+ intermediate questions
│   │   │   └── advanced.ts      # 25+ advanced questions
│   │   └── index.ts             # Question bank aggregator
│   ├── engine/
│   │   ├── sqlEngine.ts         # Ephemeral WASM sql.js runner & multiset diffing
│   │   ├── classifier.ts        # Error classifier & post-mortem tip analyzer
│   │   └── adaptiveEngine.ts    # Skill profile, stuck detection, spaced repetition & badges
│   ├── App.tsx                  # Main application UI layout & state orchestration
│   ├── index.css                # Locked CSS design system & Ledger motif
│   ├── main.tsx                 # React entry point
│   └── vite-env.d.ts            # Vite TypeScript declarations
├── index.html                   # HTML entry point with WebFonts
├── package.json                 # Project dependencies & build scripts
├── tsconfig.json                # TypeScript configuration
└── vite.config.ts               # Vite build configuration
```

---

## 🎯 Design Tokens & Color Palette

| Token | Hex Value | Usage |
|-------|-----------|-------|
| `--bg` | `#FAF6EF` | Warm cream background |
| `--panel` | `#FFFFFF` | Panel background |
| `--ink` | `#1F1B16` | Primary body text |
| `--muted` | `#6B6558` | Muted secondary text |
| `--primary` | `#2B3A67` | Deep indigo header, nav, primary CTA |
| `--gold` | `#C9A227` | Muted gold XP, levels, streaks |
| `--error` | `#D65A4A` | Coral error banner & alerts |
| `--success` | `#3E7A4C` | Positive pass green |

---

## 📄 License

MIT License — Feel free to use and extend for SQL learning!
