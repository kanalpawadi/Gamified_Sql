# SQLQuest — Supabase Backend Setup & Deploy

This build adds a Supabase (Postgres + Auth) backend to SQLQuest while keeping it
a **static frontend** (no serverless functions). All calls run client-side with
the anon key; **Row Level Security is the security boundary.**

---

## ⚠️ 1. One required dashboard step (do this first)

Auth uses **synthetic emails** (`<prn>@sqlquest.local`) that can't receive mail,
so Supabase's default "confirm your email" flow will block every login.

**Turn on auto-confirm:**

> Supabase Dashboard → **Authentication** → **Sign In / Providers** → **Email** →
> turn **OFF** “Confirm email” (equivalently, enable auto-confirm) → **Save**.

Until you do this, sign-up returns *“Account created but no session returned…”*
and sign-in fails. (Verified against your project: `mailer_autoconfirm` is
currently `false`.)

Nothing else in the dashboard needs changing — signups are enabled and the Email
provider is on.

---

## 2. What's already done

- **Schema + RLS applied** to your database (`db.vgbpqdnwrlfuzhmtaqij…`) via the
  migrations in [`supabase/migrations/`](supabase/migrations/):
  - `0001_init.sql` — tables, `is_mam()`, signup trigger, `redeem_mam_invite()`, RLS, seed invite codes.
  - `0002_prevent_role_change.sql` — blocks students from self-promoting to teacher.
  - `0003_grants.sql` — explicit table/sequence grants for `anon` / `authenticated`.
- **`.env`** is filled in with your project URL + anon key (git-ignored). See
  `.env.example` for the shape. On a fresh checkout, copy and fill it.
- **Dependencies** `@supabase/supabase-js` and `jspdf` are installed.

Verified live (in a rolled-back transaction — no test data persisted): signup
trigger → profile, invite-code redemption → `mam`, `is_mam()`, per-student RLS
isolation (a student sees only their own rows; Mam sees all), and the
self-promotion block.

---

## 3. Teacher (Mam) invite codes

Two one-time codes are seeded (single use each):

```
MAM-KP-7Q2F9X
MAM-KP-3H8LM2
```

Create a teacher account: **Teacher (Mam)** tab → full name, a login ID
(e.g. `mam.kpatil`), password, and one code. Add more codes anytime:

```sql
insert into public.mam_invite_codes (code) values ('MAM-KP-NEWCODE1');
```

A student who already has a login can be upgraded via **Teacher (Mam) →
“Already have a login? Upgrade it with an invite code.”**

---

## 4. Roles & flows

- **Students** sign up with **PRN** (e.g. `24uad025`) + password + full name +
  class/section. They land in the Quest app, plus **Labs** and **Certificates** tabs.
- **Mam** lands in the **Teacher Dashboard**: a class-progress table (name, PRN,
  section, solved/attempted, mastery %, labs completed vs assigned, badges, last
  active) and a **Lab Experiment** creator/manager.
- PRN and login IDs are normalised to lowercase and mapped to
  `<value>@sqlquest.local` internally.

---

## 5. Local development

```bash
npm install
npm run dev      # http://localhost:3001
```

`npm run build` type-checks (`tsc`) and produces the static `dist/`.

---

## 6. Deploy on Vercel (static)

1. Import the repo. **Set the Vercel “Root Directory” to `Gamified_Sql`** (the
   Vite project + `vercel.json` live in this subfolder).
2. Framework preset: **Vite** (auto). Build `npm run build`, output `dist`
   (already in `vercel.json`).
3. Add environment variables (Project → Settings → Environment Variables):
   - `VITE_SUPABASE_URL = https://YOUR_PROJECT_REF.supabase.co`
   - `VITE_SUPABASE_ANON_KEY = <your anon public key>`
4. Deploy. No serverless functions are used.

> The anon key is meant to be public (shipped in the client). Security comes from
> RLS, which is why the policies matter.

---

## 7. Trust model & caveats (inherent to zero-backend grading)

- **Lab reference SQL is delivered to the client.** Grading runs in the browser
  (`sql.js`) by executing the student's query *and* the reference query and
  diffing them with the existing `computeDiff` comparator — so the reference SQL
  must reach the client. This is identical to how the existing question bank
  already ships every `solutionSQL`. If you ever need hidden answers, that would
  require server-side grading (an edge function), which this design intentionally
  avoids.
- **Badges & certificates are client-asserted.** The browser detects lab
  completion / milestones and inserts the rows (RLS restricts them to the
  student's own `user_id`; unique constraints make issuance idempotent). A
  determined student could forge these client-side. Preventing that also requires
  server-side grading. Milestone certificate thresholds: **40** basic, **20**
  intermediate, **12** advanced questions solved.

---

## 8. Progress model (what lives where)

- **Supabase = source of truth** for graded progress: every attempt →
  `question_attempts`; `completedIds`, per-tag mastery, and an XP baseline are
  **derived from it on load** (cross-device, teacher-visible).
- **localStorage (per user)** keeps device-local gamification only — XP running
  total, streaks, query drafts, weak-tag/stuck hints — and is cleared when a
  different account logs in on the same browser.
