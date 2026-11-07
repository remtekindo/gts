# Changelog

All notable changes to this project are documented in this file and in README.md.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- **Sequential unlocking — simulations, then attempts** (7 Nov 2026): papers and attempts open in order, never all at once. Paper level (Full Simulations only, catalog order): Sim 01 is always open; Sim 02 opens only after Sim 01 has a completed result, Sim 03 only after Sim 02, and so on — a drill completion never unlocks a simulation, and drill packs are always open. Attempt level (within one paper): Attempt 01 is always open; Attempt 02 opens only after Attempt 01 is completed, Attempt 03 only after Attempt 02. Locked simulation cards stay visible with a 🔒 Locked badge, a reason line ("Complete Full Simulation 01 to unlock"), and a disabled Start button; on the paper detail page the locked attempt buttons are disabled with a reason line, and Start Test is disabled while the paper or the selected attempt is locked — the default selection is the first unlocked attempt the user has not finished yet (their next attempt), or Attempt 1 when everything is finished. The rules are enforced server-side, not just in the UI: the take page shows a lock screen instead of the test for a locked paper/attempt, and `POST /api/results/submit` refuses a locked paper with 403 `paper-locked` or a locked attempt with 403 `attempt-locked`, so a direct take URL can never record a result. The attempt number is stored in the new nullable `attempt` column (migration `0008_results_attempt.sql`; submit validates 1–3, anything else is a 400, and an unknown paper id is a 400) — rows written before it count as attempt 1 for the unlock check. `GET /api/results/activity` now also returns `completedAttempts` (finished attempt numbers per paper id); the client rules live in `app/utils/unlock.ts` and the server rules in `server/utils/unlock.ts`, both reading the same catalog order (`server/utils/catalog.ts` `PAPERS_BY_MATERIAL` mirrors `app/data/mock.ts` `PAPERS` — keep in sync). Local fallback in plain `pnpm dev`: the browser's local results (latest result per paper only, so completed attempts are 1..that attempt). Credits note (checked, not changed): the "balance: 12" on the paper detail page is a hardcoded literal in the template and the "LR · 12" topbar chip reads the static `credits` array in `app/data/mock.ts` — no credit ledger, no deduction on submit, no server endpoint, so the balance never moves; demo data until a purchase system exists.
- **Live Test locked banner only on Start press** (7 Nov 2026): a locked user opening the Live Test tab no longer sees the amber "Live Test is locked" banner on load — the Part/Difficulty form shows and the "Start live test" button is enabled. Pressing Start while still locked reveals the same banner (same text, same "Start Test" link to the papers) and disables the button; pressing again changes nothing. Unlocked users are unaffected. The server gate is unchanged: `POST /api/live-test/generate` still refuses locked users with 403 `no-completed-test` (and that response now reveals the banner instead of a red error line), and the dashboard Live Test card keeps its disabled button + reason line. `start()` waits for the activity gate to resolve before deciding, so a fast click before the gate loads still gets the banner, not a 403 error. No new i18n keys, no migration.
- **Performance from real data — no demo 795/990** (7 Nov 2026): the dashboard Performance card and the Performance page now read the user's own attempts from D1 via new `GET /api/performance?material=<slug>` (401 without a session, 400 unknown material, 403 without material access, 503 without D1), falling back to the browser's local results store in plain `pnpm dev` (`app/composables/usePerformance.ts`). Overall score = the BEST Full Simulation in that material only (highest accuracy; a tie goes to the most recent), mapped linearly to the TOEIC LR scale `round5(10 + accuracy × 980)` and labeled "estimasi" (real ETS scoring is not linear); CEFR follows the official ETS total bands (A1 120–220, A2 225–545, B1 550–780, B2 785–940, C1 945–990), below 120 the CEFR shows "—". The journey chart (`app/components/JourneyChart.vue`, shared by card + page) plots one point per completed attempt (simulation + drill), chronological. Radar + skill list (detail page only) show per-part accuracy of the most recent Full Simulation that has per-part data (Listening = avg Parts 1–4, Reading = avg Parts 5–7, Grammar = Part 5, Vocabulary = avg Parts 6–7); the take page tallies each question's part at submit time and `POST /api/results/submit` validates the `parts` payload strictly (400 otherwise) and stores it as JSON in the new nullable `breakdown` column (migration `0007_performance_breakdown.sql`). Rows without a breakdown show an honest empty radar/skills; drills-only users get a journey but no score and no CEFR ("Take a Full Simulation to see your overall score."). The Speed radar axis and the Time Management bar are dropped (no per-part source for either), and the part → skill mapping is TOEIC LR only, so other materials show no skill breakdown rather than a mislabeled number. `app/utils/scoring.ts` now uses the same round-5 + ETS-band formulas, so the result page and the Performance page can never disagree about one attempt.
- **Paper status badges from real results** (6 Nov 2026): paper cards no longer show the hardcoded catalog status (sim-01 was always "In progress", sim-03 always "Completed" — a brand-new user saw both). `GET /api/results/activity` now also returns `completedPaperIds`, and `resolvePaperStatus()` in `app/composables/useActivity.ts` derives each paper's badge from real data: "In progress" when saved answers exist for it, "Completed" when a finished result exists for it (an active attempt beats a finished one), otherwise "Not started" — badge and button ("Start Test" / "Continue" / "View Result") follow the same state on the dashboard and the papers list page (whose "My Papers" tab filters on the derived status); the paper detail page's "attempted" line uses the same real data. The hardcoded `status` is removed from `app/data/mock.ts` entirely (the `Paper` type no longer carries one; `PaperCard` takes `status` as a separate prop). No new D1 migration — the activity endpoint and local results store already cover it.
- **New-user empty states — no demo data for a brand-new user** (6 Nov 2026): a user with no purchases and no finished test now sees honest empty states instead of invented history. "Completed test" = a finished paper (a row in D1 `test_results` for that user, kind `simulation` or `drill`, valid correct/total; the free test and live tests never count). Profile → Purchase is real transactions only — the tab is the empty state ("No purchases yet") and the hardcoded LR 12 / SW 8 credit balances are deleted (no purchase system exists in this build). Profile → Enroll lists real grants only (effective materials from the server session + real grant dates from new `GET /api/profile/enrollments`, "—" where no grant row exists); the three hardcoded enrollment rows and the free-test prepend are deleted. The material dashboard "Continue from where you left off" card renders only for a genuinely in-progress attempt (saved answers in localStorage, resume links to `take?attempt=<n>`) — the hardcoded "Full Simulation 01" fallback is gone. "Your practice playlist" stays visible but muted with its button disabled until the user has started a test in that material. Live Test unlocks only after one completed test anywhere: dashboard button disabled with a reason, the live-test page shows a locked banner with the Start button disabled, and the server refuses generation (403 `no-completed-test` in `POST /api/live-test/generate`) — the client button alone is not the gate. The Performance page and the dashboard Performance card show an honest empty state + "take a test" call to action until the user has a finished paper in that material (the demo 795/990 + journey still show when results exist — not rewired to real data yet). Gates read `GET /api/results/activity?material=<slug>` via new `app/composables/useActivity.ts`, falling back to the browser's local results store when the server store is unreachable; the Continue card reads localStorage answers keys only. The hub "Your scores" chips still show "—" when there is nothing to show.
- **Two-tier leaderboard — global monthly + per-material mastery** (6 Nov 2026): one page (`/leaderboard`, also from the material Leaderboard tab with that material preselected) with a Global tab and one tab per material the user can open. Global: rank by total monthly points (season = UTC `YYYY-MM`) = best-attempt accuracy per paper summed and capped at 500/month + 50 per claimed Weekly Quest + streak (+10/active day, +50 per 7 consecutive days); ties by earliest first point of the month, then user_sub. Per-material: rank by average best-attempt accuracy on full simulations, all-time, ≥1 full simulation to appear. Results reach D1 via `POST /api/results/submit` (one row per attempt; live tests and the free test never earn points); quest completion is derived from D1 results for the current week and claims are recorded server-side (`quest_claims`). Migration `0006_leaderboard_results.sql` adds `user_sub`/`kind`/`correct` to `test_results` + the `quest_claims` table. The hardcoded demo leaderboard rows are deleted — real users only, honest empty states, masked names, no emails. The hub tiles, Weekly Quest card, and "Your scores" chips now read the same endpoints (no hardcoded numbers). The material dashboard Performance card and the Performance page were still demo data at this point — rewired to real results on 7 Nov 2026 (see the "Performance from real data" bullet).
- **Profile dropdown: admin Dashboard link** (5 Nov 2026): the account
  menu (TopBar + MaterialTopBar) shows a "Dashboard" link to `/admin`
  above "Profile" for admins only. The role comes from the server
  session (`GET /api/auth/session`), never from the forgeable
  localStorage copy — a forged admin value shows no link.
- **Audits chat is a real LLM** (5 Nov 2026): `POST /api/admin/audit-chat`
  asks Meta (muse-spark-1.3-contributor) with real audit context
  computed from the live bank; admin-only, 30 chats/hour per IP,
  server key only. Without a key it answers 503 `no-key` and the page
  falls back to the labeled local analysis ("Analisis lokal"), never
  pretending a local answer came from the LLM.
- **AI usage card on Overview** (5 Nov 2026): `migrations/0003_ai_usage.sql`
  logs one row per Meta API call (model, prompt/completion tokens,
  endpoint, UTC timestamp). The card shows a per-model breakdown,
  totals, estimated cost in Rupiah (Contributor $0.10/1M input,
  $0.20/1M output at a fixed Rp16,500/USD, labeled "estimasi"), and a
  0–23 WIB hourly histogram with the peak hour; period selector today
  / 7 days / 30 days (default) / all time. An empty table shows an
  honest empty state; no dummy rows are ever seeded.
- **Two D1 databases documented** (5 Nov 2026): remote `gts-db`
  (production, no dummy data — only real Google sign-ins) vs local
  SQLite (scratch, reconciled 5 Nov: empty files deleted, migrations
  0001–0003 re-applied cleanly). The admin row is never created by
  hand — the first Google sign-in upserts it keyed by `google_sub`,
  and the bootstrap allowlist makes it an admin automatically.
- **`pnpm run dev:d1`** (5 Nov 2026): one command for local dev with
  a real D1 (`pnpm build && npx wrangler pages dev dist --d1=DB
  --port 8788`). Plain `pnpm dev` has no D1 binding, so admin D1
  endpoints answer 503 there by design — the README now documents
  both modes and the per-endpoint table instead of leaving the 503s
  unexplained.
- **AI usage detail tab** (5 Nov 2026): Reports → "Konsumsi AI"
  (`GET /api/admin/ai-usage?rows=1` adds the newest 50 per-call rows,
  same period as the summary) shows the same summary as the Overview
  card — the card itself links there ("See details" / "Lihat detail",
  `?tab=ai-usage`) — plus a per-call table (time in WIB, endpoint,
  model, prompt / completion / reasoning / total tokens, est. cost)
  and a short explainer for why completion tokens exceed the visible
  reply: the model returns structured JSON (reply + findings + title)
  and reasons first (`reasoning_effort: 'low'`), so hidden reasoning
  tokens count as completion tokens. Both pages share one
  `AiUsagePanel` component, so the numbers can never drift apart.
- **Reasoning tokens recorded** (5 Nov 2026):
  `migrations/0004_ai_usage_reasoning.sql` adds a nullable
  `reasoning_tokens` column to `ai_usage`; both Meta call sites
  (Live Test, audit chat) store
  `usage.completion_tokens_details.reasoning_tokens` when Meta
  reports it. Reasoning is a subset of completion, never extra —
  totals and cost still use prompt + completion only, so nothing is
  double-counted. Rows written before this change show "—" for
  reasoning, never 0. Local D1 files migrated (CLI file via wrangler,
  pages-dev file via sqlite3); remote migration is the owner's step
  (`--remote`).
- **AI usage split: Admin vs User** (6 Nov 2026):
  `migrations/0005_ai_usage_actor.sql` adds a nullable `actor`
  column to `ai_usage` ('admin' = internal team, 'user' = end
  users), backfilled from the endpoint for existing rows
  (audit-chat → admin, live-test → user). The split is by endpoint,
  not by identity — an admin taking a Live Test still counts as
  User, and rows with no actor are shown as "Unknown", never mixed
  into either side. The Reports "Konsumsi AI" tab gains a scope
  filter (All / Admin / User) that scopes the summary, per-model
  table, histogram and rows to one side, plus an Admin-vs-User
  comparison block that always covers the whole period; the per-call
  table gains an Actor column. `GET /api/admin/ai-usage` accepts
  `?actor=admin|user` (invalid values ignored) and always returns a
  period-wide `byActor` breakdown. The Overview card is unchanged
  (overall totals). Local D1 files migrated; remote migration is the
  owner's step (`--remote`).
- **Audits chat processing state** (5 Nov 2026): while the LLM
  answers (~6 s for a Meta call) the chat shows an "AI sedang
  memproses…" bubble with animated dots and the composer is disabled
  — the wait reads as working, not frozen.
- **New chat button on Audits** (5 Nov 2026): "+ New chat" in the
  sidebar (desktop) and the History tab (mobile) starts a fresh
  session; past sessions stay in the history list.
- **Plain-language audit conclusion ("Kesimpulan")** (6 Nov 2026):
  every audit answer now carries a `summary` field — 2-4 sentences
  in plain everyday language (what is good, what needs doing, the
  single most important next step), written by the model in the UI's
  current locale (Indonesian when unknown) via a new `summary` field
  in the audit JSON schema. It renders as a highlighted "Kesimpulan"
  / "Conclusion" block above the technical reply in the chat and at
  the top of the report detail modal; the technical reply + findings
  are unchanged below it. The local fallback composes the same
  conclusion deterministically from the bank numbers, and reports /
  messages stored before this change show no empty block. The
  summary adds ~50-100 completion tokens per audit call, recorded in
  `ai_usage` as usual.
- **Question worthiness check ("Cek kelayakan soal")** (6 Nov 2026):
  a fourth Audits card opens a question picker — the admin picks
  which questions get judged (max 20 per assessment, enforced in
  the UI) instead of auditing the whole bank at once. The model
  judges each picked question against five explicit criteria (clear
  stem, exactly one correct key, plausible distractors, appropriate
  difficulty, no factual/grammar/typo errors) and returns one
  verdict per question — 'layak' / 'perlu-perbaikan' /
  'tidak-layak' with one short reason — shown as green / amber /
  red badges in the chat message and the report modal, under the
  same plain-language conclusion. Without the LLM the fallback
  states only known facts and never invents verdicts. Verdicts are
  computed live per assessment and stored only in the chat
  session/report (localStorage) — no D1 migration.
- **Dashboard reorder: Weekly Quest ↔ Performance** (6 Nov 2026): on
  the per-material dashboard, Performance moved to the left column
  under the Points/Streak/Rank tiles and Weekly Quest moved to the
  right column; the three action cards (Continue, Live Test with AI,
  Your practice playlist) moved below Weekly Quest in the right
  column, stacked vertically. Available Papers is now a 3-column
  grid (was 2). Verified with a headless screenshot
  (card positions measured).

### Changed
- **The materials hub is the home — global analytics moved out of the
  per-material dashboard** (6 Nov 2026): after login the user always
  lands on `/materials`, even with exactly one accessible material
  (the old single-material auto-enter in `postLoginPath()` is gone).
  The hub now carries the greeting banner, Points/Streak/Rank tiles,
  Weekly Quest, and a compact per-material score summary above the
  material cards. The per-material dashboard keeps only
  material-specific content: its Performance card, the three action
  cards (Continue / Live Test / Playlist), and Available Papers.
  Layout move only — the points/streak/rank/quest numbers and the
  795/990 score are still the same demo values as before.
- **Google Sign-In replaces the password login — for everyone**
  (5 Nov 2026): one "Sign in with Google" button for admin and
  learners; the password admin login built earlier the same day was
  replaced before it ever deployed, so no password ever shipped.
  `POST /api/auth/google` verifies the Google ID token server-side
  (JWKS signature, audience, issuer, expiry, verified email) and
  mints the same httpOnly `gts_session` cookie. Bad token → 401
  `bad-token`; sign-in unconfigured or Google unreachable → 503
  (fail closed). Env vars changed: new `NUXT_PUBLIC_GOOGLE_CLIENT_ID`
  (public variable), `NITRO_ADMIN_EMAILS` (comma-separated allowlist,
  default `remtekindo@gmail.com`); `NITRO_ADMIN_USERNAME` /
  `NITRO_ADMIN_PASSWORD_HASH` are obsolete and must be deleted from
  Pages secrets. Requires a NEW "Glots" OAuth client (see README
  § Auth) — the Kinov client is not reused.
- **D1 user store + grants** (5 Nov 2026): first Google sign-in
  creates a user row keyed by Google `sub`
  (`migrations/0002_users_google.sql`); Admin → Users lists real
  accounts and grants roles (promote/demote admin) and material/package
  access without paying — server-enforced, effective immediately.
- **Audit report detail is full height** (5 Nov 2026): the report
  modal now stretches to the bottom of the viewport (header fixed,
  body scrolls) instead of a short `max-h-[85vh]` box, so long
  reports need as little inner scrolling as possible.
- **Audits category cards match the composer width** (5 Nov 2026):
  the three cards (Audit volume / Add volume / User analysis) share
  the composer's `max-w-3xl` wrapper, so the cards row and the
  textarea are exactly the same width on desktop and mobile.
  The 18 seed demo users were removed 5 Nov 2026 (see Removed below);
  the Users page is real accounts only. Question bank and test results
  are still localStorage — only identity/privilege moved to D1.
- **Overview + Packages + Audits now read real users** (5 Nov 2026):
  the Overview users tile counts real D1 accounts ("Registered users");
  Packages subscriber counts count explicit D1 package grants; the
  Audits user picker lists real D1 users by email and user analysis
  matches by email. No demo user is referenced anywhere.
- **"Generate by AI" labels corrected** (5 Nov 2026): the in-panel
  volume generator uses 30 hardcoded templates, not the LLM — the modal
  title is now "Generate draft volume" and the Audits card says
  "Generate a new draft volume from templates". The stub note was
  already honest; the headings now match it.
- **Materials locked without access**: the hub shows a lock on
  materials the user cannot open; the material layout shows a locked
  panel instead of the dashboard. The access verdict comes from the
  server session; full server-side content gating waits for the D1
  question-bank migration.
- **Verified locally** (5 Nov 2026): typecheck 0 errors; unit tests
  13/13 (token verification incl. wrong aud/iss, expired, unverified
  email, tampered signature, unreachable JWKS); Playwright 25/25 on
  `pnpm dev` (no D1) and 28/28 on `wrangler pages dev` with real
  local D1 (user row created on first login, promote/demote re-locks
  `/admin`, material/package grants change what the user can open,
  grant UI end-to-end). No real Meta credits used; the one real Google
  sign-in click remains the owner's step.
- **Verified locally — revisions 1–4** (5 Nov 2026): typecheck 0 errors
  (a root `tsconfig.json` was missing — see Fixed); `pnpm build` 0
  errors; unit tests 23/23 (ai-usage recording/math); Playwright
  18/18 on `pnpm dev` (dropdown admin/learner/forged, audit-chat
  401/503/400/429, ai-usage 503 without D1, local-fallback UI),
  24/24 on `wrangler pages dev` with real local D1 (user upsert,
  ai-usage endpoint math Rp10,923 / peak 13 WIB, Overview card,
  dummy-key audit-chat 502, promote/demote re-lock), and 25/25 for
  the dummy removal (Overview 57/0/0/1 tiles, no demo users/vouchers/
  reports, Audits real-user picker + SW scope 6 / bank 57). All test
  rows deleted afterwards; no real Meta credits used.

### Removed
- **All demo/seed data in the admin panel** (5 Nov 2026): the 18 demo
  users (`MOCK_ADMIN_USERS`) and the whole demo-users section in
  Admin → Users (status cards, demo table, Add user modal, detail
  modal with ability map and WhatsApp link); the 2 seed QC reports
  (`r-1`, `r-2` from `demo-learner`); the 2 seed vouchers (`LAUNCH20`
  47/200, `STUDENT15` 132/500); the seed monthly series (visits
  820–3120, test takers 96–402) and the 480 fallback in
  `testTakersThisMonth()` — test takers are now the real local count
  (0 when nothing was taken in this browser). Stored copies of the
  seed reports/vouchers in a browser's localStorage are dropped on
  read. The Overview visits chart is gone, replaced by an honest
  "not connected" note (visits are not tracked anywhere).
- **Demo-only i18n keys** removed from `app/i18n/en.ts` + `id.ts`
  (demo users, Add user form, status cards, ability map, voucher
  seeds); en/id parity re-verified (620 keys each, no misses).
- **Spider diagram + skill scores off the dashboard Performance card**
  (6 Nov 2026): the radar SVG and the Listening/Reading/Grammar/
  Vocabulary score list are gone from the per-material dashboard —
  the card now shows only the journey chart, overall score, and CEFR
  badge. The diagram stays on the Performance detail page
  (`/m/:slug/performance`), which is its home.

### Fixed
- **Auth-guard redirect loop** (5 Nov 2026, found by Playwright):
  the default layout, the materials hub, the material layout, and the
  take page redirected to `/auth` whenever the localStorage mirror
  was missing — even with a valid server session — while `/auth`
  auto-redirects a valid session straight back, so the app bounced
  between the two pages ~25–50 times/second and the TopBar kept
  unmounting (the account-menu button could never be clicked). All
  four guards are now server-first: redirect only when the server
  session has no user. TopBar/MaterialTopBar and the materials hub
  also fall back to the server identity for display instead of
  showing "Guest" when the mirror is missing.
- **SW/LR question-id collision** (5 Nov 2026): the audit bank used
  `lr-N` for every material, so TOEIC SW questions collided with LR
  ones in duplicate detection and volume scoping ("TOEIC SW 1"
  audited the wrong ids). New shared helper `bankViewId()`:
  `lr-N` (LR), `sw-N` (SW), `free-N` (free test); used by the audit
  assistant, audit scope, volume lookup, difficulty overrides, and
  the adaptive playlist. Verified: SW volume audit totals 6,
  whole bank 57.
- **Audit-chat validation order** (5 Nov 2026): an empty prompt now
  returns 400 `bad-prompt` before the API-key check (was 503
  `no-key`, hiding the real reason).
- **Missing root `tsconfig.json`** (5 Nov 2026): the repo never had
  one, so `pnpm typecheck` / `pnpm exec vue-tsc --noEmit` could not
  run anywhere (they printed the tsc help and exited 1). Added the
  standard one-line file (`{"extends": "./.nuxt/tsconfig.json"}`);
  typecheck now exits 0 (only the known non-fatal vue-router/volar
  warning remains).
- **Audits chat refused free-form prompts** (5 Nov 2026): the system
  prompt told the model to answer "No audit was requested" for any
  prompt without an audit scope, so typing "testing" got a refusal
  plus a dump of raw context numbers — and the context only sent
  10-item samples without totals, so the model reported the sample
  as the total ("10 unrated"). The prompt now answers every prompt
  as the audit assistant, never repeats itself, and the context
  carries totals (`totalDuplicates`, `totalUnrated`, `freeQuestions`)
  next to the samples. The local fallback also answers unknown
  prompts with a labeled bank summary instead of a bare "unknown"
  line. Duplication was reproduction-checked, not assumed: "testing"
  and "TEST" each produce exactly one reply (Playwright).
- **Meta key errors were indistinguishable** (5 Nov 2026): a rejected
  key answered 502 with no code, so the page fell back with the
  generic "Meta AI is unavailable" note and gave no hint the key
  itself was the problem. The 502 now carries `data: { code:
  'meta-error' }` and the page shows "Meta API rejected the request
  — the API key may be invalid or revoked. Check
  NITRO_MODEL_API_KEY, then restart the dev server." Verified with a
  dummy key only (Meta takes ~6 s to reject it, zero real credits);
  a real-key success path is still the owner's step.
- **Fresh local D1 file failed with a bare 500** (5 Nov 2026): a new
  pages-dev SQLite file starts with no tables, and `admin/users` /
  `ai-usage` threw an uncaught "no such table" error. Both endpoints
  now catch it and answer 503 "D1 tables are missing for this
  database — apply the migrations", pointing at the sqlite3 fix in
  the README. Verified by moving the bound file aside and starting
  from a fresh one, then applying the three migrations.
- **Verified locally — D1 503s + Audits** (5 Nov 2026): typecheck 0
  errors; `pnpm build` 0 errors; Playwright 29/29 on plain `pnpm
  dev` (per-endpoint 503 table, honest D1 notes + `dev:d1` hints,
  no-duplication reproduction, local-fallback badges) and 21/21 on
  `wrangler pages dev` (all D1 endpoints 200, fresh-file 503s +
  sqlite3 recovery, dummy-key 502 `meta-error`); restart demo proved
  `.env` edits need a server restart (503 `no-key` before and after
  the edit, 502 after restart). No real Meta credits used.
- **AI usage card did not say calls go unrecorded** (5 Nov 2026):
  the unavailable note said D1 wasn't connected but not that AI
  calls made in plain `pnpm dev` are never recorded — the owner ran
  a real LLM audit that worked (Meta AI badge) while the card still
  showed "not available", because `recordAiUsage` silently drops the
  row when there is no database. The note now says so explicitly
  (EN + ID): "…so AI calls made in this mode are not recorded."
  The recording rule is documented in README § Local D1 check.
- **503 evidence confirmed from the owner's machine** (5 Nov 2026,
  23:04): the two local 503s are the intentional fail-closed
  `createError`s at `server/api/admin/ai-usage.get.ts:31` ("Usage
  store is not available on this server.") and
  `server/api/admin/users.get.ts:22` ("User store is not available
  on this server."), both thrown when `getDb(event)` returns null
  in plain dev — not a broken binding.
- **Verified locally — AI usage recording** (5 Nov 2026): unit
  14/14 on the real `recordAiUsage` (INSERT statement + bound
  values, token clamping, null-db silent no-op, throwing-db never
  throws, `summarizeAiUsage` totals/cost/WIB peak math); pages-dev
  card test 16/16 (3 seeded rows in `recordAiUsage`'s exact shape →
  endpoint totals prompt 4,721 / completion 2,799, Rp17, peak
  current WIB hour; Overview card shows CALLS 3, 7.520 tokens,
  Rp17, 23:00–0:00 WIB + histogram; rows deleted after). Both Meta
  endpoints call `recordAiUsage` after every successful `callMeta`
  (Live Test once per retry attempt, audit chat once per answer);
  failed calls log nothing. A real successful Meta call's
  end-to-end write is still the owner's step (his key).

### Security
- **Server-side auth via Google ID token**: `POST /api/auth/google`
  verifies the token (JWKS signature, audience = Client ID, issuer,
  expiry, verified email) and mints an httpOnly `gts_session` cookie
  (HMAC-signed, 24 h, or 30 days with Remember me). Bad token → 401
  `bad-token`; sign-in unconfigured or Google unreachable → 503
  (fail closed). Roles and material access are resolved server-side
  per request (D1 user row + grants, bootstrap allowlist
  `NITRO_ADMIN_EMAILS`), never from browser claims. New env vars:
  `NUXT_PUBLIC_GOOGLE_CLIENT_ID`, `NITRO_ADMIN_EMAILS`,
  `NITRO_SESSION_SECRET` (see README § Auth and `.env.example`).
  The mock login and the password login (built the same day, never
  deployed) are gone.
- **`/admin` guarded server-side**: `server/middleware/01-admin-guard.ts`
  redirects unauthenticated page requests to `/auth?next=<path>` before
  HTML is served; the admin layout also verifies the session on mount.
  A forged localStorage admin role is bounced.
- **Live Test endpoint hardened** (`POST /api/live-test/generate`):
  requires a session (401 otherwise) and is rate-limited per client IP
  — 12 batches/hour anonymous, 60/hour admin (429 + `Retry-After`).
  A request-body Meta API key is honored only for a signed-in admin;
  anonymous callers always use the server env key. No key configured
  → 503. Verified locally with Playwright: 13/13 checks pass (wrong
  password rejected, correct login works, unauthenticated POST → 401,
  12 anonymous batches then 429, forged localStorage bounced, logout
  re-locks `/admin`); admin generation with a dummy key reaches Meta
  and fails cleanly with 502 (no real credits used).
- **Fixed (pre-existing type error)**: `server/utils/d1.ts` `getDb`
  now takes the H3 event directly instead of a narrow custom event
  type, so `pnpm typecheck` passes again.

### Added
- **Meta Global AI Developer Hackathon 2026 entry**: GTS submitted
  5 Nov 2026 (late window, before 15:00 WIB) — Indie Developer Track,
  "Build for Your World", solo team Remtekindo. Demo video (1:57), public
  repository, live deployment. Historical note: the repo predates the entry
  (created 30 Oct 2026 as a real test-prep business); the entry decision was
  made 31 Oct 2026.
- **Live on Cloudflare Pages**: https://gts-7ac.pages.dev (project `gts`).
  Remote D1 `gts-db` bound, schema applied, Meta API key set as a Pages
  secret — the Live Test now generates real questions in production.
  Repository made public at https://github.com/remtekindo/gts.
- **Cloudflare Pages + D1 groundwork**: Nitro preset `cloudflare-pages`,
  `wrangler.jsonc` (D1 binding `DB`), `migrations/0001_init.sql`
  (`questions`, `test_results`, `users`), `server/utils/d1.ts`, and
  `GET /api/health/d1` probe. Verified locally: build + pages dev serve
  the app, D1 binding live, schema applied, write/read proven through the
  health endpoint. Remote D1 creation + deploy still needs the owner's
  Cloudflare login.

### Changed
- **Material dashboard: Performance merged into one section**: the
  Performance Journey and Performance cards are now a single card —
  journey chart + overall score on top, radar + skill scores below.

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
  environment. Since the 5 Nov 2026 auth hardening, a body key is
  honored only for a signed-in admin session; anonymous callers always
  use the server env key.

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
