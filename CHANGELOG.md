# Changelog

All notable changes to this project are documented in this file and in README.md.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed
- **Material dashboard grids**: action cards (Continue, Live Test, Playlist)
  now sit in a full-width 3-column row; Available Papers moved below them
  as a full-width 2-column grid.

### Changed
- **Material dashboard rearranged**: Performance card moved under
  Performance Journey (right column); Continue and Live Test cards moved
  under Weekly Quest (left column); Available Papers moved below them.

### Added
- **Admin → Settings: Meta Model API key in-app**: the key can now be
  pasted once in the admin panel (stored in the admin's browser) and the
  Live Test sends it along automatically — no terminal env var needed.
  The server route still prefers `NITRO_MODEL_API_KEY` from the
  environment and only falls back to the body key (dev/demo mode;
  production must use the server env var).

### Changed
- **Admin layout is now full-width** (max 1600px): the centered
  `max-w-5xl` container was removed, so content starts right at the
  sidebar edge and uses the full monitor width on large screens.

### Fixed
- **Audits composer position**: shortcut cards keep normal spacing above
  the textarea, and the cards + composer block is now pinned to the
  bottom of the viewport (flex column + `mt-auto`) with no wide gap
  below the textarea.

### Changed
- **Audits page refinements**: shortcut cards + composer are now sticky at
  the bottom with no gap below; the history sidebar is fixed flush to the
  right edge of the viewport; the floating AI button and the "New chat"
  button were removed (opening the page always starts a fresh chat;
  previous sessions are resumed from the sidebar).

### Added
- **Audits page, Muse-style layout**: desktop shows a right sidebar with
  **conversation history** (persisted chat sessions in localStorage, with
  New chat / open / delete) plus an **audit reports** section; the
  Chat/History tabs now appear **only in mobile mode**.
- Category cards (Audit volume / Add volume / User analysis) moved below
  the chat thread, above the composer.
- Report detail modal: "View report" in chat (or a report in the
  sidebar) opens the full audit detail.

### Added
- Audits page now has two tabs: **Chat** and **History**.
- "View report" in the audit chat jumps to the History tab and expands
  the report with full details.

### Changed
- All admin modals are now "stay": clicking the backdrop no longer
  closes them (use the X button).
- Picking a card on the Audits page (Audit volume / User analysis)
  auto-fills the textarea and immediately runs the AI analysis.

### Fixed
- Choose-material badges in the Subscriptions table update instantly on
  toggle (first toggle no longer wipes the defaults; no refresh needed).

### Changed
- All admin modals: brighter panel (`dark:bg-slate-800` vs page
  `dark:bg-slate-950`) plus a thin visible border
  (`border-slate-200 dark:border-slate-600`) so the modal boundary is
  always clear; certificate modal also gained `shadow-2xl`.

### Added
- **Audits page redesigned like a fresh Muse chat**: category cards on top
  (Audit volume, Add volume, User analysis), chat thread in the middle,
  auto-growing textarea composer at the bottom (Enter sends,
  Shift+Enter new line). Clicking "Audit volume" opens a volume picker
  modal; picking one pre-fills e.g. "audit volume TOEIC 1". "User
  analysis" opens a user picker and pre-fills "analisa user <name>",
  running a real per-user ability analysis (weakest/strongest part +
  recommendation) saved to audit history. "Add volume" opens the same
  Generate-by-AI modal as Databases. Audit history below the composer.
- **Spider (radar) diagram** on the user detail ability map: SVG radar
  over Parts 1-7 with per-part accuracy labels, above the existing bars.

### Changed
- Audit volume tab removed from Databases (back to 2 tabs: Active /
  Draft volume); auditing lives in the Audits menu.
- All admin modals now use a stronger backdrop (`bg-slate-900/70`) and
  `shadow-2xl` so the foreground is clearly separated.
- `translate()` now replaces every `{param}` occurrence, not just the
  first.

### Added
- **Databases (renamed from Questions)**: banks are organized into named
  **volumes** (e.g. "TOEIC 1", "TOEIC 2") across subjects (English,
  Math/STEM). Stat cards: total data, by category, by volume.
- **Add volume**: "Generate by AI" modal creates a draft volume; the
  **Draft volume** tab lists AI-made volumes pending admin approval
  (per-question approve/reject, approve-all, then Activate -> questions
  enter the bank with continuing numbers).
- **Audit volume tab**: ChatGPT-like chat that re-checks AI-made
  questions ("audit volume TOEIC 1", "cek duplikat", "distribusi kunci
  jawaban"); analyses can be scoped to one volume.
- Volume detail: question table with 15-per-page pagination and
  View/Edit modal.
- **Overview**: "Questions in bank" renamed to **Total questions**;
  new **Test takers / month** card and **user visits per month** bar
  chart.
- **Packages**: per-package subscriber cards; tabs **Subscriptions**
  (table: package type, total questions, choose materials, material
  packages, subscribers) and **Vouchers** (voucher name, discount %,
  max/used users, due date; add/delete vouchers).
- **Users**: Add user button (register-style form), Active/Expired/Trial
  cards, 15-per-page paginated table (18 demo users).
- Reports page merged: **Test results** moved in as a tab (QC reports +
  test results + certificate printing).

### Fixed
- Volume detail no longer shows stale draft state right after
  activation (reactive version counter).
- Overview count and package totals stay in sync with the live bank.

### Removed
- `/admin/questions` route renamed to `/admin/databases`; `/admin/results`
  merged into `/admin/reports` (nav entry removed).

### Added
- **AI assistant in the admin panel**: floating chat button (bottom-right)
  on every admin page. The admin types a prompt ("audit bank soal",
  "cek duplikat", "distribusi kunci jawaban") and the assistant runs a
  real local analysis — duplicates, answer-key distribution, unrated
  questions, missing explanations — then saves the result as a report in
  the new **Audit tab** (`/admin/audits`). Demo mode: algorithmic
  analysis; the same chat box will call the real Meta API once the
  backend exists.
- **Question editing**: the bank question detail modal now has an Edit
  mode — stem, all four options, correct-answer picker, and difficulty
  level. Edits persist in localStorage (`gts_admin_question_overrides`)
  and apply everywhere the live bank is served (admin bank, packages,
  playlists, practice).

### Fixed
- Overview "Questions in bank" now uses the live count (static bank +
  approved AI drafts), matching the Packages page totals.
- Draft template pool expanded to 10 unique templates per part (5/6/7);
  generated drafts no longer repeat the same question. Parts 6-7 carry
  a short passage as context.
- Draft answer keys are shuffled per question (Fisher-Yates) instead of
  always A.

### Added
- Phase 1 masterplan build — AI faces the admin, never the customer live:
  - **Admin question generation** (`/admin/questions` → Generate AI tab):
    form (part, count, target difficulty, topic) creates draft batches;
    Draft QC tab for per-question approve/reject, approve-all, and
    one-click merge of approved items into the bank with continuing
    numbers (difficulty auto-tagged for the adaptive engine).
    In-panel generation is a workflow stub until the backend calls the
    real API — the real LLM path stays `scripts/generate-questions/`.
  - **Subscription packages** (`/admin/packages`): Bulanan Rp75rb (1
    material), Triwulanan Rp199rb (2), Semesteran Rp349rb (all), with a
    per-package material matrix, live question counts, and active
    subscriber counts. Approved questions flow bank → package → customer.
  - **Personal practice playlists** (`/m/:slug/playlist`): behind-the-
    scenes ability analysis per part (accuracy from test results +
    practice attempts, level 1–5, weakness weighting) builds a Spotify-
    style question playlist; compact drill runner at `/m/:slug/practice`
    feeds results back so the next playlist adapts. Dashboard card added.
  - Admin user detail modal now shows the per-user ability map (the same
    analysis the playlist engine sees).
- `app/utils/adaptive.ts`: `analyzeAbility`, `buildPlaylist`,
  `recordPracticeAttempt`, playlist persistence (`gts_playlist_*`).
- `app/utils/admin.ts`: draft CRUD (`gts_admin_drafts`), bank additions
  (`gts_admin_bank_additions`, served via `liveQuestionsForMaterial`),
  package material mapping (`gts_admin_package_materials`).

## [0.12.0] - 2026-11-03

### Added
- `merge-batch.mjs`: one-command merge of a human-reviewed batch into the
  bank — re-validates shape, drops duplicates already in the bank,
  renumbers continuing the bank, and appends to `GENERATED_QUESTIONS` in
  the new `app/data/generated.ts` (wired into `QUESTIONS` automatically,
  so the admin bank and app pick them up with no further changes).


## [0.11.0] - 2026-10-31

### Added
- Per-question timing: the test pages now record seconds spent on each
  question (`timings` on TestResult, persisted per attempt). The clock
  starts when the test starts (not while reading instructions) and banks
  time as the user moves between questions. This feeds the adaptive
  engine's accuracy + speed analysis.

### Fixed
- `/auth` auto-redirect refined: a signed-in non-admin visiting
  `/auth?next=/admin` stays on the form (no redirect loop), while all
  other `?next=` targets (e.g. `/free-test/result`) redirect through as
  before.


## [0.10.0] - 2026-10-31

### Added
- Question-generation pipeline (`scripts/generate-questions/`): CLI that
  generates original TOEIC-style questions via Meta's Model API
  (OpenAI-compatible, `https://api.meta.ai/v1`, model
  `muse-spark-1.3-contributor` by default) using structured JSON output,
  validates each batch (4 options A–D, unique distractors, one correct
  letter, distribution check), dedupes against the committed bank, and
  appends real token costs to `out/cost-log.csv` to validate the
  unit-economics model with data. `--dry-run` tests the plumbing without
  spending; README documents setup, QC workflow (human review required
  before merging), and cost notes. This is the hackathon entry's "real use
  of Meta's models".


## [0.9.1] - 2026-10-31

### Fixed
- Landing pricing now reflects the agreed package scheme: Monthly =
  choose 1 material, Quarterly = choose 2 materials, Semiannual = all
  materials (the material differentiation was missing from the plan
  features).


## [0.9.0] - 2026-10-31

### Fixed
- Landing: form inputs now render white text on dark backgrounds in dark
  mode; brand-panel logo and checkmarks use the same colors in light and
  dark mode (were invisible in light mode); CTA button keeps the same
  white/blue styling in both modes.

### Changed
- Admin: "Dashboard" menu renamed to "Overview".
- Admin: question bank is now organized per material — open a material
  (TOEIC LR / Free Test) to see its questions.
- Admin: question reports link the question ID to the bank entry.
- Admin: user detail modal with plan/status/joined/attempts, editable
  subscription end date, active/inactive toggle, and a "Contact via
  WhatsApp" button (mock numbers until the real backend).
- Admin: test results show the username per attempt; each attempt has a
  Certificate button that renders a printable certificate (Print / Save
  PDF via the browser).
- Test results now record the username at save time (was missing).


## [0.8.1] - 2026-10-31

### Fixed
- Login loop between `/admin` and `/auth`: a signed-in non-admin user
  bounced forever (`/admin` -> `/auth?next=/admin` -> `/admin` …).
  `/admin` now shows an "Access denied" screen with a switch-account
  action instead of redirecting, and `/auth` no longer auto-redirects
  when a `?next=` target is present.


## [0.8.0] - 2026-10-31

### Added
- Minimal admin panel at `/admin` (mock role gate: sign in as `admin`).
  Dashboard (question count, pending QC reports, attempts, demo users),
  question bank browser with difficulty tagging (1–5, persisted — the
  foundation for the adaptive engine), report QC queue (resolve/dismiss),
  demo user list, and per-browser test result overview. Sidebar on
  desktop, scrollable tab bar on mobile; dark mode throughout.


## [0.7.0] - 2026-10-31

### Added
- Mobile tab bar under the material header (Dashboard / Papers /
  Performance / Leaderboard) — the desktop nav was hidden on small
  screens, leaving mobile users with no in-material navigation.

### Fixed
- Mobile audit pass (375px viewport, 11 pages, zero horizontal
  overflow): test header title no longer collides with action buttons
  (hidden on xs), the GTS logo badge is visible again (was white-on-
  white), overview Start Test button stacks full-width on mobile,
  header Sign in / Open dashboard buttons no longer wrap, StatTile
  values no longer wrap.


## [0.6.2] - 2026-10-31

### Fixed
- Landing hero now actually renders dark in dark mode (the 0.6.0 build
  shipped without the dark gradient variants — verified against the
  published commit, not just the working copy).
- Test interface: the sub-header row (progress, Instruction, Notes, timer)
  is now transparent in dark mode so it blends seamlessly with the navy
  header; timer pill and progress track adjusted for contrast on navy.
- Test interface: Instruction and Notes text buttons replaced with
  icon-only circular buttons (tooltips + aria-labels kept).


## [0.6.1] - 2026-10-31

### Fixed
- Free test: answer options shuffled in the question bank (correct answers
  were all option A — now distributed A/B/C/D), so answers can't be guessed.
- Free test: submit button moved from below the questions to the top bar,
  next to the timer.
- Free test result: full answer review — every question shown with the
  correct answer marked green and the user's pick marked red.
- Free test attempts are now recorded in Profile → Enroll History.


## [0.6.0] - 2026-10-30

### Added
- Bilingual UI (English / Indonesian): all template strings moved to
  `app/i18n/en.ts` + `app/i18n/id.ts` via a `useLocale()` composable with
  `{param}` interpolation and English fallback; locale persisted in
  localStorage; EN/ID switcher in topbars, landing, auth, and free-test pages.
- Dark/light theme: Tailwind v4 class-based dark mode, `useTheme()`
  composable persisted in localStorage, sun/moon toggle everywhere, restored
  before first paint.
- Free general-English test at `/free-test` — no login needed to start:
  30 original questions (15 listening, 10 reading, 5 writing), 30-minute
  timer, section-grouped palette. Submitting redirects to
  `/auth?next=/free-test/result`; the result page shows a login gate for
  guests and a per-section + total score breakdown after auth. Auth honors
  `?next=` (local paths only). Landing hero CTA now points to `/free-test`.


## [0.5.0] - 2026-10-30

### Added
- Register mode on the `/auth` page: the login form toggles to a register form
  (full name, email, password, confirm password) via the "Register" / "Sign in"
  links. Includes validation (required fields, email format, min 6-char password,
  password match). Mock register signs the user straight in.

## [0.4.0] - 2026-10-30

### Added
- Public landing page at `/` (hero, materials, how-it-works, pricing with the real
  Rp75rb/Rp199rb/Rp349rb tiers, CTA band). Signed-in visitors see "Open dashboard"
  instead of "Sign in".

### Changed
- Login page moved from `/login` to `/auth` (all internal references updated).

## [0.3.0] - 2026-10-30

### Added
- Multi-material architecture (pattern 3): materials hub at `/materials`; per-material
  section at `/m/:slug` with its own dashboard, papers, performance, and leaderboard.
  Login (and `/`) sends the user straight into their material when they own exactly
  one, otherwise to the hub. Topbar material switcher moves between owned materials.
- Demo materials: TOEIC Listening & Reading (owned), TOEIC Speaking & Writing
  (owned, 6 demo questions across 2 parts), TOEFL iBT and IELTS Academic (coming soon).
- `postLoginPath()` in `utils/navigation.ts`; `layouts/material.vue`;
  `components/MaterialTopBar.vue`; `pages/materials/index.vue`.

### Changed
- All test pages moved under `m/[slug]/`; questions, parts, and papers are now
  scoped per material (`materialSlug`). Profile stays global. Footer links updated.

## [0.2.0] - 2026-10-30

### Added
- Full test-platform UI (23 files): login, dashboard, papers list, paper overview,
  test interface, result page, performance, leaderboard, profile, plus 9 shared
  components, mock data (18 original demo questions, 5 demo papers), and scoring utils.
- `AppFooter` component: dark navy footer with trademark disclaimer.

### Fixed
- `app.vue` now wraps pages in `<NuxtLayout>` — navbar and footer were not rendering
  on any page before this fix.
- Route nesting: `papers/[id].vue` moved to `papers/[id]/index.vue`; without this,
  Nuxt treated `take`/`result` as children of the overview page and they never rendered.
- Dashboard username fallback changed from `'there'` to `'Guest'`.
- All fixes verified with headless screenshots (login, dashboard, overview,
  test interface, answering flow); `vue-tsc` passes with 0 errors.

## [0.1.0] - 2026-10-30

### Added
- Initial scaffold: Nuxt 4 + Vue 3.5 + TypeScript + Tailwind CSS v4, pnpm.
- Branches `main` (stable) and `dev` (active development).
- Placeholder home page.
