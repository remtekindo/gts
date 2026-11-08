# GTS — Global Testing System

Multi-subject online testing platform. English first, more subjects later.

**Live:** https://gts-7ac.pages.dev (Cloudflare Pages, project `gts` — the
`gts.pages.dev` subdomain was already taken, so Cloudflare assigned
`gts-7ac.pages.dev`). **Repository:** public at
https://github.com/remtekindo/gts.

**What this is:** an assessment-first testing platform — users pay for tests and an instant predicted score/level, NOT theory lessons.
**What this is NOT:** a course app, a chatbot tutor, or an official TOEIC/TOEFL/IELTS product. Not affiliated with or endorsed by ETS.

## What this product does

A user signs in, picks a material they own (e.g. TOEIC Listening & Reading), and inside that material takes timed test papers, gets a predicted score with CEFR level plus per-part breakdown. Progress, streaks, and weak areas are tracked per material. New papers ship monthly for subscribers.

**What was pre-existing:** nothing — this repo was created 30 Oct 2026 for the GTS project.

## Meta Global AI Developer Hackathon 2026

GTS was submitted to the Meta Global AI Developer Hackathon 2026
(26 Oct–4 Nov 2026; late-submission window 5 Nov, submitted 5 Nov 2026
before 15:00 WIB). Track: **Indie Developer Track**; problem statement:
**"Build for Your World"**. Team: Remtekindo, solo (refa).
Demo video (1:57), public repository, live deployment at
https://gts-7ac.pages.dev.

For the historical record: this repo predates the hackathon entry — it was
created 30 Oct 2026 as a real test-prep business, and the decision to enter
it into the hackathon was made 31 Oct 2026. The Live Test feature (real-time
question generation via the Meta Model API) was built for the demo. The app
is a genuine product, not a hackathon-only prototype.
**What was built on 30 Oct 2026:** the full UI below (page structure inspired by SmartPrep's UX; all code, branding, and question content are original).

## What was built (30 Oct 2026)

- Initial scaffold: Nuxt 4 + Vue + TypeScript + Tailwind CSS v4, pnpm. Branches `main` (stable) and `dev` (active development).
- **Multi-material architecture (pattern 3):** after login the user always lands on the materials hub (`/materials`) — the hub is the home and carries the global learner analytics (greeting banner, Points/Streak/Rank tiles, Weekly Quest, compact per-material score summary) above the material cards. Inside a material (`/m/:slug`) only material-specific content lives: its Performance card, papers, playlist, leaderboard — all scoped to that material. A switcher in the topbar moves between owned materials; coming-soon materials are shown as upsell.
- Materials in the demo: TOEIC Listening & Reading (owned), TOEIC Speaking & Writing (owned), TOEFL iBT (coming soon), IELTS Academic (coming soon).
- Full test-platform UI on `dev`, visually verified page by page with headless screenshots:
  - Login (split-screen, mock auth via localStorage — any non-empty credentials work)
  - Materials hub (greeting, Points/Streak/Rank, Weekly Quest, per-material score summary, owned cards with paper/credit counts, coming-soon section)
  - Per-material dashboard (Performance, stacked Continue / Live Test / Playlist cards, Available Papers)
  - Papers list (hero, My/Available tabs, filter chips, search, paper cards)
  - Paper overview (navy hero, Exit, attempt selector, skill cards, TOEIC Score / CEFR toggle)
  - Test interface (instructions modal per part, navy header with Save & Exit + Submit Quiz, progress bar, countdown timer, Notes drawer, question card with radio options, fixed bottom question palette grouped by part, submit confirmation with answered count)
  - Result page (predicted score + CEFR + marks pills, part tabs, per-question review with Correct/Wrong highlighting, color-coded palette)
  - Performance (Quick Insights + Full Analytics), Leaderboard (sticky "Your Ranking" card), Profile (4 tabs, global)
- Fixes after visual QA: `app.vue` now wraps pages in `<NuxtLayout>` (navbar/footer were not rendering); footer component added; route nesting fixed (`papers/[id].vue` → `papers/[id]/index.vue` so take/result pages resolve); username fallback fixed.
- Mock data only: original demo questions per material (18 LR across Parts 1–7, 6 SW across 2 parts), 7 demo papers, TOEIC-style scoring utils. Audio is a labeled placeholder.
- **i18n (EN/ID):** all UI strings live in `app/i18n/en.ts` / `app/i18n/id.ts`, reached via the `useLocale()` composable (`t('key')` with `{param}` interpolation and English fallback). Locale persists in localStorage (`gts_locale`); an EN/ID switcher sits in every topbar, the landing header, the auth card, and the free-test header. Test content (questions) stays in English by design.
- **Dark/light theme:** Tailwind v4 class-based dark mode (`@custom-variant dark` in `app/assets/css/main.css`); `useTheme()` composable persists `gts_theme` and toggles the `.dark` class on `<html>`. A sun/moon toggle sits next to the locale switcher. Restored pre-paint by `app/plugins/init.client.ts`.
- **Free test without login (`/free-test`):** 30 original general-English questions — 15 listening (read-and-respond), 10 reading, 5 writing (best-sentence choice, auto-gradable). Timer, palette grouped by section, submit confirmation. Submitting saves answers to localStorage and redirects to `/auth?next=/free-test/result`; the result page shows a login gate for guests and a per-section + total score breakdown after auth, then clears the pending answers. Answer options are pre-shuffled in the bank (fixed seed, no runtime randomness); the submit button sits in the top bar next to the timer; the result includes a full per-question review with correct answers marked; each attempt is recorded in Profile → Enroll History. The auth page honors `?next=` (local paths only) after sign-in.

## What was built (7 Nov 2026) — v2 redesign (branch `v2`)

A total rebuild of the user-facing information architecture, after a
read-only UX audit measured the old one: 23 routes, 5 material tabs +
11 topbar controls, a fresh dashboard with 21 visible actions, a
result page with 44 actions and a dead end (no next-test call to
action), 5 taps from landing to the first question, 5 taps from a
score back to the next test, and 20 jargon terms (Papers, Full
Simulation, Drill Pack, Attempt, Playlist, Quest, CEFR, …). The app
had grown feature by feature and nothing had ever been removed. The
rebuild keeps every server endpoint and every rule (sequential
unlock, live-test gate, leaderboard, performance) exactly as it was —
it is a navigation/presentation rebuild, not a backend change. No new
D1 migration.

- **New IA — 3 primary destinations, the same on the desktop top bar
  and the mobile bottom tab bar:** **Tes** (home after login),
  **Skor Saya**, **Profil**. The admin panel is unchanged (7-item
  sidebar, admin-only).
- **Tes home:** greeting with the user's real name; last score + CEFR
  if any; ONE big primary card — the next test in sequence (paper
  name + the REAL question count from the paper data) — with "Lihat
  semua tes" and "Ganti materi" links. The Live Test card renders
  ONLY when unlocked, otherwise one small hint line, never a big dead
  card. The Latihan Saya card renders ONLY when unlocked. No
  points/streak/rank/quest widgets here — they live under Skor Saya.
- **Skor Saya** (`/m/:slug/skor`): the Performance content (journey,
  overall score + CEFR, radar/bars, attempt history) + a Peringkat
  (leaderboard) section inside the same page (Global monthly +
  per-material tabs) + Misi Mingguan + Beruntun display. One page
  with sections, not separate top-level tabs.
- **Profil:** real Google name + email from the server session (the
  old page showed "Your Name" with a blank email for Google users);
  "Riwayat Materi" (real grants — rename of Enroll History); settings
  (language ID/EN, theme, sign out); admin link for admins only. The
  **Purchase History tab is deleted entirely** — no purchase system
  exists in this build; it returns only when payments exist.
- **Material switching:** ONE active material at a time. The picker
  stays at `/materials`, reached via "Ganti materi" on the Tes home
  and from Profil. No material-switcher dropdown in the top nav. The
  top bar shows the active material name in full, never truncated on
  mobile. After login the user lands on their last material
  (`gts_last_material` in localStorage), or the picker when there is
  none yet.
- **Free test (`/free-test`): the score is visible IMMEDIATELY after
  finishing — no sign-in wall.** Under the score, guests see "Simpan
  skormu — login dengan Google"; signing in only saves the score.
  This supersedes the 30 Oct bullet above, which described the old
  flow (submit → `/auth?next=/free-test/result` → login gate).
- **Result page:** directly under the score, TWO primary calls to
  action — "Tes Berikutnya" (next unlocked test in sequence; "Lihat
  Semua Tes" when none is unlocked) and "Latihan Kelemahan Saya"
  (playlist — hidden while locked, never a disabled button). The
  per-question review, part tabs, and palette stay, but the calls to
  action sit above them, unmissable. The score/CEFR toggle lives here
  now (it moved off the paper detail page).
- **Take page:** the instructions modal is gone — the take page starts
  directly at Q1. Instructions are shown inline on the paper detail
  page instead. The detail page has ONE Start button; attempt
  selection defaults to the next unlocked attempt (the 3 attempt
  buttons + sequential locks are unchanged).
- **Language: the default locale is now Indonesian (`id`).** The EN/ID
  toggle stays. All new labels are written in Indonesian first,
  English second.
- **Plain words, applied consistently in `id.ts` + `en.ts`:**

  | Before | Indonesian | English |
  |---|---|---|
  | Papers | Tes | Test |
  | Full Simulation | Simulasi | Simulation |
  | Drill Pack | Latihan | Practice |
  | Attempt | Percobaan | Attempt |
  | Predicted Score | Skor | Score |
  | Playlist | Latihan Saya | My Practice |
  | Quest | Misi Mingguan | Weekly Mission |
  | Streak | Beruntun | Streak |
  | Leaderboard | Peringkat | Rankings |
  | Material | Materi | Material |
  | Enroll | Terdaftar | Enrolled |

  "My Papers" and "Available Papers" cease to exist. CEFR stays as a
  secondary label ("Level CEFR") with a plain explanation.
- **Fake numbers deleted, not hidden:** the topbar "LR · 12" chip is
  gone entirely (no credit system exists) along with the "This attempt
  costs 2 LR credits (balance: 12)" line on the paper detail page;
  the "1,284 enrolled" counts are gone (no source); paper cards show
  the REAL question count from the paper data (21 for TOEIC LR, 6 for
  TOEIC SW) with the real timer — never the old "200 questions /
  120 min" catalog claim. The "Demo build." footer line is gone.
  Where a limitation is real it is labeled plainly instead
  (free-test listening: "tanpa audio"); TTS is still not built
  (backlog).
- **Redirect map (no dead links):**

  | Old route | New destination |
  |---|---|
  | `/m/:slug` | Tes home |
  | `/m/:slug/papers` | "Semua Tes" list |
  | `/m/:slug/performance` | Skor Saya |
  | `/m/:slug/leaderboard` | Skor Saya (`?section=peringkat`) |
  | `/leaderboard` | active material's Skor Saya (`?section=peringkat`), else `/materials` |
  | `/m/:slug/live-test` | reachable from the Tes home Live Test card (not in top nav) |
  | `/m/:slug/playlist` | reachable from the Tes home / result CTA (not in top nav) |

- **Files:** new `app/components/MainNav.vue` (single nav for both
  layouts; desktop top bar + mobile bottom tab bar); deleted
  `app/components/TopBar.vue` + `app/components/MaterialTopBar.vue`;
  new `app/pages/m/[slug]/skor.vue`; rewritten Tes home, Semua Tes
  list, paper detail, take (modal removed), result, materials picker
  (stats/quest/score chips removed), profile, and free-test result;
  `app/data/mock.ts` no longer carries `credits` / `creditsRequired` /
  `enrolled` / `totalQuestions`; default locale `id` in
  `app/composables/useLocale.ts` + `app/plugins/init.client.ts`;
  i18n parity EN/ID 657/657 (line-start key extraction).
- **Verified:** `vue-tsc` exit 0 (0 errors); `pnpm build` exit 0;
  Playwright against `wrangler pages dev` on a real local D1
  (migrations 0001–0008, dummy Meta key): **68/68 checks passed** —
  fresh guest takes the free test and sees the score without login;
  fresh user sees ONE "Mulai Tes" CTA and reaches Q1 in 2 taps;
  completer's result page shows both CTAs and both work; mobile
  390px bottom tab bar with all 3 destinations, no horizontal
  overflow; desktop top bar with exactly the 3 destinations +
  material name + language/theme/avatar. Test users deleted
  afterwards; local D1 back to 0 rows.

## What was built (8 Nov 2026) — package → checkout → login-gated orders (branch `v2`)

The hole this closes: until now a new user was handed materials from
the start (admin grants) and the landing pricing cards led nowhere —
the package was never chosen by the buyer. Now the flow is: the user
picks a package first, goes to a checkout page as a guest, and ONLY
the Checkout button asks them to sign in. Materials are determined
by the chosen package, never handed out up front.

- **Packages — one shared price table** (`app/utils/pricing.ts`,
  imported by the landing page, the checkout page, AND the server):
  Bulanan Rp75.000 → 1 material, 1 bulan; Triwulanan Rp199.000 → 2
  materials, 3 bulan; Semesteran Rp349.000 → all materials, 6 bulan.
  The old strikethrough "anchor" prices on the landing cards are
  gone — they were invented discounts, not real prices.
- **Checkout page** (`app/pages/checkout.vue`, top-level route,
  guest-accessible — it does NOT use the default layout, which
  redirects guests to /auth): order summary (package, duration,
  price, materials), material picker (Bulanan picks exactly 1,
  Triwulanan exactly 2, Semesteran shows all materials with no
  picker; only owned materials are pickable), draft in localStorage
  `gts_checkout_draft` AND in the URL query so it survives the login
  round-trip. With no/invalid `?package=` the page shows all 3
  packages to pick first instead of redirecting away.
- **The login gate is only the Checkout button — and it is a modal,
  not a redirect.** Pressing it opens "Masuk untuk melanjutkan"
  with one "Masuk dengan Google" button (the existing GIS popup
  flow; Google is only used to save the order). On success the modal
  closes and the order is created automatically from the preserved
  draft. Closing the modal leaves the user on the checkout page with
  the draft intact — no login is forced.
- **QRIS payment (no gateway — static merchant QR + manual proof).**
  After the order exists the page shows the QRIS screen: the amount,
  a live 1-hour countdown (`expires_at` = created + 3600s, stored
  as ISO UTC so the countdown parses correctly), the order id, and
  the merchant QR image. The QR comes from the admin's QRIS setting
  (`settings` table, key `qris_image`, served by public
  `GET /api/settings/qris` — a merchant QR is public by nature);
  when none is configured the page shows an honest placeholder
  ("Kode QRIS belum diatur — hubungi admin"), never a fake QR.
  Below it: "Unggah bukti bayar" (a normal file dialog,
  `accept="image/*"`, compressed client-side to max 1200px JPEG 0.8
  before upload) and a "Batalkan pesanan" link. Uploading the proof
  (`POST /api/orders/:id/proof`, owner only, order must be
  `pending_payment` and not expired, proof ≤ ~500 KB after
  compression) stores it base64 in `orders.proof_image` +
  `proof_uploaded_at` and flips the order to `proof_uploaded`;
  the page then shows Rey's words verbatim: "Terima kasih sudah
  melakukan pembayaran, akan segera diverifikasi admin." Re-upload
  is allowed (replaces the proof) until the admin verifies.
- **Orders (D1, migration `0009_orders.sql`):** `orders` table
  (`id`, `user_sub`, `package`, `materials` JSON, `price`,
  `currency`, `duration_months`, `status` pending_payment/
  proof_uploaded/active/cancelled, `created_at`, `expires_at`,
  `activated_at`, `proof_image`, `proof_uploaded_at`; indexes on
  `user_sub` and `status`) plus a `settings` table (`key`, `value`)
  for the merchant QRIS image. Endpoints: `POST /api/orders`
  (auth; validates package + material count + slugs; price computed
  server-side from the shared table — any client-sent price is
  ignored; creates `pending_payment` with a 1-hour window),
  `GET /api/orders/mine` (own orders, newest first),
  `POST /api/orders/:id/proof` (owner only; proof upload),
  `POST /api/orders/:id/cancel` (owner only),
  `GET /api/admin/orders` (admin-only, all orders with user
  email/name + proof), `POST /api/admin/orders/approve`
  (admin-only, pending/proof → active + `activated_at` + material
  grants via `grantMaterials` — existing grants are kept, never
  duplicated), `POST /api/admin/orders/cancel` (admin-only,
  pending/proof → cancelled, no grants),
  `GET /api/settings/qris` (public QRIS image) and
  `POST /api/admin/settings/qris` (admin-only, set/clear it).
  Access rule unchanged: materials unlock via grants only, so an
  order's materials stay Locked until approved.
- **Profil → "Pesanan Saya":** the user's real orders from
  `GET /api/orders/mine` (package, materials, price, status, date)
  with an honest empty state ("Belum ada pesanan."); pending and
  proof-uploaded rows link back to `/checkout?order=<id>` to
  continue paying. The v2 "no purchase system exists" note is
  superseded — one now exists.
- **Order statuses:** `pending_payment` → `proof_uploaded` →
  `active` | `cancelled`, plus `expired` — COMPUTED on read (a
  `pending_payment` order past `expires_at`), never stored, no cron.
  Proof upload to an expired order is refused 400 ("Waktu
  pembayaran habis"). An expired order stays in history; the buyer
  starts a new order from checkout (Profil rows for pending orders
  link back to `/checkout?order=<id>` to continue paying).
- **Admin → "Finance"** (`app/pages/admin/finance.vue` + sidebar
  item, admin-only, server-enforced) replaces the earlier
  `/admin/orders` page, with exactly two tabs: "Pembayaran
  Terpending" (orders `pending_payment` / `proof_uploaded` /
  `expired`, badged "Menunggu bayar" / "Bukti diunggah" /
  "Kedaluwarsa"; each row shows user, package, materials, price,
  order time, live countdown or "Kedaluwarsa", and the proof
  thumbnail — click for the full-size view) and "Pembayaran Lunas"
  (`active` orders with activation date). "Verifikasi & Aktifkan"
  flips the order to `active` and creates the material grants
  (server-side, deduped; when the order has no proof yet the admin
  is asked to `confirm()` first); "Batalkan" cancels a
  pending/proof order with no grants. The page also has a
  "Pengaturan QRIS" section where the admin uploads the merchant
  QRIS image (stored base64, `POST /api/admin/settings/qris`).
- **Explicitly NOT built:** payment gateway integration
  (Midtrans/Xendit/Stripe/Play Billing — undecided) is the NEXT
  step, not built; grant-expiry enforcement is backlog
  (`duration_months` is recorded but grants do not expire yet).
- **Verified:** `vue-tsc` exit 0 (0 errors); `pnpm build` exit 0;
  Playwright against `wrangler pages dev` on a real local D1
  (migrations 0001–0009, dummy Meta key): guest lands on pricing →
  "Pilih Paket" opens `/checkout` with no login wall; the Checkout
  button opens the LOGIN MODAL (no redirect to /auth) with the
  Google button, and closing it keeps the draft on the checkout
  page; after login the QRIS screen shows the amount, a running
  countdown, and the real merchant QR image (configured via Admin →
  Finance first); uploading a proof shows the thank-you message and
  D1 status `proof_uploaded`; Admin → Finance Terpending shows the
  order with its proof thumbnail, Lunas is empty; verifying creates
  the grants in D1 and moves the order to the Lunas tab; an expired
  order (past `expires_at` set directly in D1) refuses proof upload
  with 400; with no QRIS configured the checkout shows the honest
  placeholder; a tampered client price (Rp1.000) is stored at the
  real server price; a wrong material count is rejected 400;
  unauthenticated POST is 401; non-admin approve is 403; Profil
  "Pesanan Saya" shows the real order (empty state for a user with
  none). i18n parity EN/ID (line-start key extraction). Test users
  deleted afterwards; local D1 back to 0 rows.

## What was built (8 Nov 2026) — TOEFL/IELTS structure activated, questions pending (branch `v2`)

TOEFL iBT and IELTS Academic now exist as real, openable materials —
structure only. Both were `status: 'coming-soon'` in the hub; they are
now `owned`, with paper sets modeled on the real tests (formats
verified against the official sources on 8 Nov 2026: ETS TOEFL iBT
test content page, ielts.org Guide for Test Takers). The bank has
**zero questions** for either material, and nothing in the app
pretends otherwise.

- **Paper sets** (`app/data/mock.ts` PAPERS, mirrored exactly in
  `server/utils/catalog.ts` PAPERS_BY_MATERIAL — the two must stay in
  sync or sequential unlock breaks server-side):
  - `toefl-ibt`: `toefl-ibt-sim-01` (Full Simulation, Reading +
    Listening MCQ, 59 min), `toefl-reading-drill` (30 min),
    `toefl-listening-drill` (29 min), `toefl-writing-paper`
    (Drill Pack, prompt + sample + rubric v1, 23 min),
    `toefl-speaking-paper` (Drill Pack, prompt + sample + rubric
    v1, 8 min). Official format from 21 Jan 2026: Reading 50 items
    ~30 min, Listening 47 ~29 min, Writing 12 ~23 min, Speaking 11
    ~8 min; Reading/Listening adaptive; scores 1–6 in 0.5 steps.
  - `ielts-academic`: `ielts-academic-sim-01` (Full Simulation,
    Listening + Reading MCQ, 90 min), `ielts-listening-drill`
    (30 min), `ielts-reading-drill` (60 min), `ielts-writing-paper`
    (Drill Pack, prompt + sample + rubric v1, 60 min),
    `ielts-speaking-paper` (Drill Pack, prompt + sample + rubric
    v1, 14 min). Official format: Listening 40 questions ~30 min,
    Reading 40 questions 60 min, Writing 2 tasks 60 min, Speaking
    3 parts 11–14 min; total ~2h 45m; bands 1–9, half bands.
- **Hub:** the "Segera hadir" section now renders only when a
  coming-soon material exists (`v-if="comingSoon.length"` in
  `app/pages/materials/index.vue`) — the heading rendered
  unconditionally before, which would have left a dangling empty
  heading once both materials were owned. The hub now shows 4
  material cards and no coming-soon section at all.
- **Checkout and empty materials — REVERSED 8 Nov 2026 (see the
  section below).** This build originally refused to sell
  question-less materials (picker filtered by `hasQuestions`,
  server 400 `not-purchasable`). On Rey's instruction
  ("materi pada halaman checkout juga perlu ditambah kalau begitu")
  the picker now offers all 4 owned materials, and a question-less
  one carries an explicit warning instead of a refusal — see "What
  was built (8 Nov 2026) — checkout offers all owned materials".
- **Honest empty states, no fake counts.** A 0-question paper card
  shows "Soal untuk tes ini sedang disiapkan." with a "Lihat Detail"
  link instead of a count; the paper detail page disables Start
  with the same reason; the take page refuses a 0-question paper
  with "Belum ada soal" (the take guard also protects the
  `current` computed, which is undefined on an empty bank); the Tes
  home "Mulai Tes" card skips question-less papers and shows
  "Soal untuk materi ini sedang disiapkan — cek lagi nanti." when
  no paper in the material has questions. Server submit already
  refused empty totals with 400 — verified for these papers.
- **Performance is scoped to TOEIC.** The round5(10 + accuracy ×
  980) mapping and ETS CEFR bands apply ONLY to `toeic-lr`
  (`server/utils/performance.ts` + `app/utils/performance.ts`
  `buildPerformance`): other materials get no overall score and no
  CEFR (`bestSim` null), and their journey points carry accuracy %
  (0–100) instead of a TOEIC number. `JourneyChart` takes a `mode`
  prop (`'toeic'` | `'accuracy'`, accuracy plots on a 0–100 axis);
  Skor Saya passes `'accuracy'` for non-TOEIC materials, shows a
  `%` suffix on history scores, and uses the
  `dashboard.journeySubAccuracy` subtitle. The skills mapping
  already returned null for non-TOEIC-LR — unchanged.
- **Generation specs** (`scripts/generate-questions/TOEFL-IELTS-SPECS.md`):
  the handover for the content step — official format per material
  with source links + check date, what the MCQ-only bank model
  supports vs. what needs a model extension (IELTS
  True/False/Not Given, matching headings, sentence completion;
  TOEFL table/prose-summary items; Speaking/Writing are prompt +
  sample + rubric in v1), the exact `generate.mjs` changes needed
  first (per-material part descriptions, material-aware prompt —
  the script is TOEIC-only today and would write TOEIC-style items
  for these slugs), CLI invocations per material, the QC checklist,
  and the starter-bank cost: TOEFL 97 MCQ questions ≈ Rp155,
  IELTS 80 ≈ Rp128, both ≈ Rp283 at ~Rp1.6/question.
- **Explicitly NOT built:** any questions for either material
  (pending the generation pipeline — see the specs doc); Full
  Simulations with real content; per-material scoring scales
  (TOEFL 1–6, IELTS 1–9); Listening audio; non-MCQ question types;
  per-material live-test prompts.
- **Verified:** `vue-tsc` exit 0 (0 errors); `pnpm build` exit 0;
  Playwright against `wrangler pages dev` on a real local D1
  (migrations 0001–0009, dummy Meta key): hub shows 4 materials;
  TOEFL + IELTS open with honest "soal sedang disiapkan" states,
  no fake counts, no crash; checkout picker offers only toeic-lr +
  toeic-sw; direct `POST /api/orders` with a toefl-ibt material is
  400; a 0-question paper's Start is disabled with the reason and
  the take page refuses it; regression — TOEIC fresh user home →
  Q1 in 2 taps, result CTAs work, guest checkout → login modal
  still opens. i18n parity EN/ID (line-start key extraction).
  Test users deleted afterwards; local D1 back to 0 rows.

## What was built (8 Nov 2026) — checkout offers all owned materials, with a warning on empty ones (branch `v2`)

Per Rey's instruction ("materi pada halaman checkout juga perlu
ditambah kalau begitu"), TOEFL iBT and IELTS Academic now appear in
the checkout material picker — reversing the exclusion built earlier
the same day, which had refused to sell question-less materials.
A buyer must never pay for an empty material WITHOUT KNOWING, so
the protection is now a visible warning, not a refusal.

- **Picker (`app/pages/checkout.vue`):** lists ALL owned materials
  (4: toeic-lr, toeic-sw, toefl-ibt, ielts-academic) — the
  `hasQuestions` filter is gone from the list. A question-less
  material's card carries an amber warning badge before it can be
  picked: "Soal sedang disiapkan — materi aktif segera setelah soal
  tersedia." (`checkout.noQuestionsWarning`, EN + ID.) `hasQuestions`
  is kept and repurposed for exactly this warning logic.
- **Order summary:** the same warning badge appears next to every
  selected question-less material in the summary, and again on the
  QRIS screen's material list — the buyer sees it twice before
  paying, and again when returning to pay via Profil "Lanjutkan
  bayar".
- **Server:** `POST /api/orders` no longer refuses question-less
  materials — the 400 `not-purchasable` check is removed, and
  `PURCHASABLE_MATERIAL_SLUGS` / `isPurchasableMaterial()` are
  deleted from `server/utils/catalog.ts` (no remaining references).
  The other validations stay: known package, known material slugs
  (`isKnownMaterial`), material count matches the package (Bulanan
  1, Triwulanan 2, Semesteran all 4 owned — the count is now
  computed from `OWNED_MATERIAL_SLUGS.length`), price computed
  server-side from the shared table.
- **Explicitly NOT built:** the questions themselves (bank still 0
  for TOEFL/IELTS — see the generation specs doc); no payment
  gateway (unchanged).

## What is NOT built yet

- Real backend (auth, database, API) — Cloudflare groundwork done 5 Nov 2026 (Pages + D1 binding + schema); **Google Sign-In for everyone + D1 user store with admin/grants done 5 Nov 2026** (see [Auth](#auth)); question bank + results migration pending
- Real question bank (AI-generated, human-reviewed) — planned Nov 2026
- Real TTS audio for listening — planned Nov 2026
- Payment gateway integration (Midtrans/Xendit/Stripe/Play Billing — undecided) — the NEXT step after the orders flow (8 Nov 2026); orders exist and wait in `pending_payment` until an admin approves them, but no online payment is wired up yet
- Grant-expiry enforcement — `duration_months` is recorded on every order, but grants do not expire yet (backlog)
- TOEFL / IELTS questions — structure activated 8 Nov 2026 (branch `v2`): materials are owned, paper sets defined after the official formats, checkout gating + honest empty states + TOEIC-only performance scoping built; the bank has 0 questions for both, pending the generation pipeline (`scripts/generate-questions/TOEFL-IELTS-SPECS.md`); Full Simulations with real content, per-material scoring scales (TOEFL 1–6, IELTS 1–9), and non-MCQ question types are future work
- AI writing grading — v2

## Stack

- Nuxt 4, Vue 3.5, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`)
- pnpm 10 (use pnpm, not npm)
- Cloudflare Pages (Nitro preset `cloudflare-pages`) + D1 (`DB` binding, see `wrangler.jsonc` + `migrations/`)
- App data still mock state in localStorage — migration to D1 pending

## Branches

- `main` — stable
- `dev` — active development; all work lands here first
- `v2` — the v2 redesign (7 Nov 2026); merges to `dev` after verification

## Run locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 — the public landing page. Sign in at http://localhost:3000/auth with Google (one button for everyone — admin or learner; the role is decided server-side). For local sign-in, copy `.env.example` to `.env` and set `NUXT_PUBLIC_GOOGLE_CLIENT_ID` (a Glots OAuth client with http://localhost:3000 as an authorized JavaScript origin) — see [Auth](#auth).

Two local modes — pick the right one:

- `pnpm dev` (plain): no D1 binding exists in this mode, so every
  endpoint that needs D1 answers **503 by design** (fail closed):
  `GET /api/health/d1`, `GET /api/admin/users`, `GET /api/admin/ai-usage`,
  `POST /api/admin/users/role`, `POST /api/admin/users/grants`.
  Login, session, and the audit-chat fallback still work — the admin
  pages show an honest "D1 store is not connected" note with the
  `pnpm run dev:d1` hint instead of failing silently. If the admin
  panel returns 503s locally, this is almost certainly the cause —
  it is not a broken binding. **One real consequence: AI calls made
  in this mode are never recorded.** The audit chat and Live Test
  call Meta directly and work fine without D1, but their usage rows
  go nowhere — `recordAiUsage` silently drops them when there is no
  database — so the Overview AI card has nothing to show for those
  calls, and the stats are lost for good. The card says so
  explicitly. Any session whose stats must be kept has to run under
  `pnpm run dev:d1`.
- `pnpm run dev:d1`: builds, then serves with a real local D1
  (`wrangler pages dev dist --d1=DB --port 8788`). All D1 endpoints
  answer 200. See [Local D1 check](#local-d1-check) for the fresh-file
  quirk (a new pages-dev file starts with no tables).

**`.env` changes need a dev-server restart.** Nuxt reads `.env` once
at startup: filling in `NITRO_MODEL_API_KEY` while the server is
running changes nothing — audit-chat keeps answering 503 `no-key`
until the server is restarted, after which the key is read and the
call reaches Meta (a bad key then answers 502 `meta-error`, see the
Audits chat notes in Admin panel audit below).

```bash
pnpm typecheck   # vue-tsc, must pass with 0 errors
```

## Auth

Sign-in is Google-only since 5 Nov 2026 — one "Sign in with Google"
button for everyone, admin or learner. Before that it was mock (any
credentials worked) and the Live Test endpoint was open to anyone.
There is no password anywhere in the app anymore (the password admin
login was built the same day and replaced before it ever deployed).

- **Google Sign-In** (`POST /api/auth/google`): the browser gets an ID
  token from Google Identity Services and POSTs it to the server. The
  server verifies the token — signature against Google's JWKS,
  audience = our Client ID, issuer, expiry, verified email — and only
  then trusts the identity. A bad token → 401 `bad-token`; Google
  sign-in unconfigured or Google's keys unreachable → 503 `unavailable`
  (fail closed). Success mints an httpOnly cookie `gts_session`
  (signed HMAC token, 24 h, or 30 days with "Remember me").
  `GET /api/auth/config` serves the Client ID to the browser (it is
  public by design, so it can be set or rotated without a rebuild);
  `GET /api/auth/session` reports the signed-in user
  (`{ admin, email, name, picture, role, materials, packages }`);
  `POST /api/auth/logout` clears the cookie.
- **Setup (owner's steps — needs your Google account):**
  1. In Google Cloud Console, create a project named "Glots" (do NOT
     reuse the Kinov OAuth client — its consent screen says "Kinov").
  2. OAuth consent screen: app name "Glots", External, scopes
     openid/email/profile only.
  3. Create a Web application OAuth client with authorized JavaScript
     origins `http://localhost:3000` and `https://gts-7ac.pages.dev`
     (add the custom domain later, when it exists). No redirect URIs
     are needed — this flow uses only the Client ID, no client secret.
  4. Set `NUXT_PUBLIC_GOOGLE_CLIENT_ID` as a Cloudflare Pages
     **variable** (not a secret) and in local `.env`, then redeploy.
  5. Apply migrations 0002–0009 to the remote D1
     (`npx wrangler d1 migrations apply gts-db --remote`).
  6. Set `NITRO_ADMIN_EMAILS` (comma-separated, default
     `remtekindo@gmail.com`) and `NITRO_SESSION_SECRET` (generate with
     `openssl rand -hex 32`) as Pages secrets and redeploy.
  7. Sign in once with Google on the live site to confirm.
  Locally, copy `.env.example` to `.env` and fill the same values.
  `NITRO_ADMIN_USERNAME` / `NITRO_ADMIN_PASSWORD_HASH` are obsolete —
  delete them if they exist as Pages secrets.
- **User store (D1)** (`migrations/0002_users_google.sql`): the first
  Google sign-in creates a user row keyed by Google `sub` (stable
  account id); later sign-ins refresh name/picture/last login. The
  `grants` table holds material grants (open one material) and package
  grants (open the materials that package covers: Monthly 1, Quarterly
  2, Semester all). The question bank is still in localStorage —
  only identity/privilege moved to D1. Test results are dual-written
  since migration 0006: the browser keeps its localStorage copy, and
  each completed paper also POSTs a row to D1 (`test_results`) — that
  server copy is what the leaderboard reads.
  **The admin row is never created by hand.** `google_sub` is issued
  by Google at first sign-in and must not be invented: the first
  Google sign-in upserts the row (matched by `google_sub`, with the
  email kept in sync), and the bootstrap allowlist
  (`NITRO_ADMIN_EMAILS`, default `remtekindo@gmail.com`) makes that
  account an admin automatically — no manual insert, no seed row.
  The remote database must therefore hold no dummy users at all:
  only real Google sign-ins, starting with the admin's first login.
- **Roles & access — decided server-side, never by the browser:** the
  session cookie carries only the verified identity; the role and
  material access are resolved per request from the D1 user row +
  grants and the env allowlist (`NITRO_ADMIN_EMAILS`, the bootstrap
  admin — always an admin, even if D1 is unreachable). Promoting,
  demoting, or changing a grant in Admin → Users takes effect on the
  user's next request, with no re-login. Admins open every material.
  Everyone else opens free materials (none yet — the free entry point
  is the free test) plus granted materials/packages.
- **`/admin` is guarded server-side** (`server/middleware/01-admin-guard.ts`):
  any `/admin*` page request without a valid admin session redirects
  (302) to `/auth?next=<path>` before HTML is served. The admin layout
  also re-checks the session on mount. A forged `gts_auth` value in
  localStorage no longer opens the panel — localStorage roles are
  UI-only everywhere now.
- **Materials are locked without access** (server verdict, client
  render): the materials hub shows a lock on materials the user cannot
  open, and the material layout shows a locked panel instead of the
  dashboard. The content itself still lives in the browser
  (localStorage bank), so this is the access verdict enforced by the
  server, not yet server-side content gating — that waits for the D1
  question-bank migration.
- **Audit chat is a real LLM** (`POST /api/admin/audit-chat`): the
  Audits page sends the admin's prompt plus real audit context
  (bank totals, key distribution, duplicates, unrated items, user
  per-part lines — all computed locally from the live bank) to the
  server, which asks Meta (muse-spark-1.3-contributor) and returns a
  structured answer that is saved as an audit report. Admin-only
  (401 otherwise), rate-limited to 30 chats/hour per IP (429 +
  `Retry-After`), key is server-side only (`NITRO_MODEL_API_KEY` —
  no body key is accepted here). Without a key the endpoint answers
  503 `no-key` and the page falls back to the local algorithmic
  analysis, labeled "Analisis lokal" with the reason shown — it
  never pretends a local answer came from the LLM. Meta errors
  surface as 502. Every answer also carries a plain-language
  conclusion ("Kesimpulan" / "Conclusion"): the model writes 2-4
  sentences in everyday language — what is good, what still needs
  doing, the single most important next step — in the UI's current
  locale (Indonesian when unknown), shown above the technical reply
  in the chat and at the top of the report modal. The local fallback
  composes the same conclusion deterministically from the bank
  numbers (duplicates, unrated, key balance; free-test items missing
  an explanation are never presented as a problem). The summary adds
  ~50-100 completion tokens per audit call, recorded in `ai_usage`
  as usual. Reports stored before this change have no conclusion and
  render no empty block.
- **Question worthiness check ("Cek kelayakan soal")** (6 Nov 2026):
  a fourth Audits card opens a question picker — the admin picks
  which questions get judged (max 20 per assessment, enforced in
  the UI; bounds the token cost) instead of auditing the whole bank
  at once. The picked questions are sent in full (id, part, stem,
  options, key, explanation) and the model judges EACH one against
  five explicit criteria: (1) stem clear and unambiguous, (2)
  exactly one correct key, (3) distractors plausible — not obviously
  wrong and not duplicated, (4) difficulty appropriate for the
  part/level, (5) no factual, grammar, or typo errors. Verdict per
  question: 'tidak-layak' when the key is wrong or ambiguous, or
  the stem is broken; 'perlu-perbaikan' for fixable issues (typo,
  weak distractor, unclear wording); 'layak' otherwise — one short
  reason sentence each, shown as green / amber / red badges in the
  chat message and the report modal, under the same plain-language
  conclusion (verdict counts + most important fix). Without the LLM
  the fallback states only known facts (count, paid items without
  an explanation) and never invents verdicts. Verdicts are computed
  live per assessment and stored only in the chat session/report
  (localStorage) — no D1 migration.
- **AI usage is logged, not estimated from thin air**
  (`migrations/0003_ai_usage.sql`, `migrations/0004_ai_usage_reasoning.sql`,
  `migrations/0005_ai_usage_actor.sql`,
  `server/utils/ai-usage.ts`): every Meta call (Live Test batches +
  audit chats) writes one row to the `ai_usage` table — model,
  prompt/completion tokens (from Meta's `usage` field), endpoint, UTC
  timestamp. Since migration 0004 the row also carries
  `reasoning_tokens` when Meta reports it
  (`usage.completion_tokens_details.reasoning_tokens`): hidden
  reasoning tokens are a SUBSET of completion tokens, never extra —
  totals and cost still use prompt + completion only. NULL means "not
  recorded" and is shown as "—", never as 0. Since migration 0005
  the row also carries `actor` — 'admin' for internal-team usage,
  'user' for end-user usage — split by endpoint, not by identity:
  the audit chat is admin-only, so every audit-chat row is Admin;
  Live Test is the user-facing feature, so its rows are User. An
  admin who takes a Live Test still counts as User; no per-user
  identity is tracked. Existing rows were backfilled from their
  endpoint when the migration ran; NULL actor is "unknown" and is
  shown separately, never folded into either side. The Overview card
  "Aktivitas Penggunaan AI" reads it via `GET /api/admin/ai-usage`
  (admin-only; 503 when D1 is not connected) with a period selector
  (today / 7 days / 30 days, default / all time): per-model
  breakdown, totals, estimated cost in Rupiah, and a 0–23 WIB hourly
  histogram with the peak hour. Rates: Contributor $0.10 / 1M input
  tokens, $0.20 / 1M output tokens, converted at a fixed
  Rp16,500/USD — both shown in the UI and labeled "estimasi", never
  presented as a bill. An empty table shows an honest empty state
  (0 calls, 0 tokens, Rp0, "belum ada data"); no dummy rows are
  ever seeded. The card links to a detail tab — Reports → "Konsumsi
  AI" (`GET /api/admin/ai-usage?rows=1` adds the newest 50 per-call
  rows) — with the same summary plus a per-call table (time in WIB,
  endpoint, actor, model, prompt / completion / reasoning / total
  tokens, est. cost), a scope filter (All / Admin / User) that
  scopes the summary and the rows to one side, an Admin-vs-User
  comparison block that always covers the whole period, and a short
  explainer for why completion tokens exceed the visible reply: the
  model returns structured JSON (reply + findings + title) and
  reasons first (`reasoning_effort: 'low'`), so hidden reasoning
  tokens count as completion tokens.
- **Live Test endpoint is session-gated + rate-limited**
  (`POST /api/live-test/generate`): no session → 401; anonymous
  visitors get 12 batches/hour, signed-in admins 60/hour (per client
  IP; 429 + `Retry-After` header when exceeded). A request-body Meta
  API key is honored **only** for a valid admin session — anonymous
  callers always use the server env key (`NITRO_MODEL_API_KEY`), and
  the endpoint returns 503 when no key is configured at all. An
  anonymous visitor id (`gts_sid` cookie, minted by the session
  endpoint) exists only so the limiter can tell repeat visitors apart;
  it is not an identity. Completed-test gate (6 Nov 2026): generation
  is refused (403 `no-completed-test`) unless the signed-in user has
  completed at least one finished paper — see the empty-states bullet
  below for the exact definition. Anonymous visitors are refused too
  (they can never have completed a test). When the server has no D1
  binding the gate is skipped (plain `pnpm dev` only); production
  always has D1.
- **Leaderboard — two tiers, real users only**
  (`migrations/0006_leaderboard_results.sql`,
  `server/utils/leaderboard.ts`, `app/components/LeaderboardBoard.vue`):
  one page (`/leaderboard`, also reachable from the material
  Leaderboard tab with that material preselected) with a Global tab
  and one tab per material the user can open. **Global (monthly
  competition):** rank by TOTAL monthly points, season = UTC month
  `YYYY-MM`. Points = (a) test points — per paper, best-attempt
  accuracy % (correct/total × 100, rounded whole), summed across
  papers, capped at 500/month; (b) quest points — 50 per completed
  Weekly Quest, counted only after the user claims it (`POST
  /api/quests/claim` records the claim in `quest_claims`; one claim
  per quest per week); (c) streak points — +10 per active day (≥1
  submitted result that day), +50 bonus each time a run of
  consecutive active days reaches a multiple of 7 (the bonus counts
  in the month its 7th/14th/… day falls in). Ties: points desc, then
  whoever earned their first point of the month earliest, then
  user_sub — ranks are unique positions, never shared. **Per-material
  (mastery, self-measurement):** rank by AVERAGE best-attempt
  accuracy on FULL SIMULATIONS in that material (0–100%); a user
  appears only after completing ≥1 full simulation there. This board
  is ALL-TIME (accuracy is a level, not an accumulation — no monthly
  reset). Ties: accuracy desc, then more simulations, then user_sub.
  Results reach D1 via `POST /api/results/submit` (signed-in users
  only, material access enforced; one row per attempt — retakes are
  separate rows, the board takes the best accuracy per paper). Live
  tests are never submitted (AI-generated questions, not the curated
  bank) and the free test needs no login, so neither earns points.
  Quest completion is derived from D1 results for the current week
  (Monday 00:00 UTC): sim = ≥1 full simulation; score700 = any paper
  with predicted score ≥ 700; drills = ≥3 distinct drill packs. The
  hub tiles (points / streak / rank), the Weekly Quest card, and the
  "Your scores" chips (best accuracy % per material) all read the
  same endpoints — no hardcoded numbers anywhere on the hub. The
  board shows real users only: the old hardcoded demo rows are gone;
  when the current user is the only participant the page says so
  honestly instead of inventing competitors. Names are masked
  (first letter + `***` + last letter); emails are never exposed.
  The material dashboard Performance card and the Performance page
  are wired to the same real results since 7 Nov 2026 (see the
  "Performance from real data" bullet below) — no demo 795/990
  anywhere.
- **New-user empty states — no demo data for a brand-new user**
  (6 Nov 2026): a user with no purchases and no finished test sees
  honest empty states instead of invented history. Exact definition —
  a "completed test" is a finished paper: a row in D1 `test_results`
  for that user with kind `simulation` or `drill` and a valid
  correct/total. The free test and live tests are never submitted to
  D1, so they never count. "Started" is any attempt in the material
  (a completed result, or saved answers for a paper of that material);
  "in progress" is saved answers (`gts_answers_<paperId>_<attempt>`)
  with at least one answer — answers are cleared on submit, so a saved
  key is a genuinely unfinished attempt.
  - Profile → Purchase: real transactions only. There is no purchase
    system in this build (no checkout, no credit ledger), so the tab
    is the empty state ("No purchases yet") until a user has actually
    bought something. The hardcoded LR 12 / SW 8 credit balances are
    deleted.
  - Profile → Enroll: real grants only. Rows are the effective
    materials from the server session (`GET /api/auth/session`) with
    the real grant date from `GET /api/profile/enrollments` (grants
    table, `granted_at`; a package grant's date applies to the
    materials it covers) — "—" where no grant row exists (role-based
    admin access is not a grant). No grants → the empty state. The
    three hardcoded enrollment rows and the free-test prepend are
    deleted.
  - Material dashboard "Continue from where you left off": renders
    only for a genuinely in-progress attempt in that material
    (localStorage answers keys); the hardcoded "Full Simulation 01 ·
    pick up your test" fallback is gone. Resume links to
    `take?attempt=<n>` with the attempt number found.
  - "Your practice playlist": active only after the user started a
    test in that material; otherwise the card stays visible but muted,
    with its button disabled and one line explaining why.
  - Live Test: the dashboard button is enabled only after one
    completed test anywhere; on the live-test page itself the locked
    banner appears as soon as the page is opened (the Live Test
    menu/tab press — corrected 8 Nov 2026; it previously appeared
    only after pressing "Start live test", which was the wrong
    trigger), and the Start button is disabled while the banner
    shows. The server refuses generation (403 `no-completed-test`,
    see above) — the client button alone is not the gate.
  - Performance page + dashboard Performance card: empty (no journey,
    no score, no radar) until the user has a finished paper in that
    material — an honest empty state with a "take a test" call to
    action. With results, both read the user's real attempts (see the
    "Performance from real data" bullet below). The hub "Your scores"
    chips still show "—" when there is nothing to show.
  - Paper status badges are derived from the user's real results, never
    the catalog: `GET /api/results/activity` now also returns
    `completedPaperIds`, and `resolvePaperStatus()` in
    `app/composables/useActivity.ts` maps each paper to "Not started"
    (nothing), "In progress" (saved answers for it), or "Completed"
    (a finished result for it) — an active attempt beats a finished
    one, so a user re-taking a completed paper sees "In progress" /
    "Continue". The badge and the card button ("Start Test" /
    "Continue" / "View Result") follow the same state on the dashboard
    and on the papers list page (whose "My Papers" tab now filters on
    the derived status); the paper detail page's "attempted" line uses
    the same real data. The hardcoded `status` is removed from
    `app/data/mock.ts` entirely (the `Paper` type no longer carries
    one; `PaperCard` takes `status` as a separate prop), so no catalog
    value can leak into the UI again. The id arrays are seeded from the
    browser's local snapshot at setup, so badges are right on first
    paint; the server fetch refines the completed ids.
- **Performance from real data — no demo 795/990** (7 Nov 2026):
  the dashboard Performance card and the Performance page now read
  the user's own attempts from D1 via new `GET /api/performance
  ?material=<slug>` (401 without a session, 400 unknown material,
  403 without material access, 503 without D1), falling back to the
  browser's local results store in plain `pnpm dev` via
  `app/composables/usePerformance.ts`. Rules, all from real data:
  - Overall score = the BEST Full Simulation in that material only
    (highest accuracy; a tie goes to the most recent). Accuracy maps
    linearly to the TOEIC LR scale, `round5(10 + accuracy × 980)`,
    and is labeled "estimasi" in the UI — real ETS scoring is not
    linear. CEFR follows the official ETS total bands (A1 120–220,
    A2 225–545, B1 550–780, B2 785–940, C1 945–990); below 120 the
    CEFR shows "—" (below A1, never an invented level).
  - Journey chart = one point per completed attempt (simulation +
    drill), chronological, each point the attempt's accuracy mapped
    with the same formula; one attempt is one dot. Shared component
    `app/components/JourneyChart.vue` (card + page).
  - Radar + skill list (detail page only) = per-part accuracy of the
    MOST RECENT Full Simulation that has per-part data: Listening =
    avg(Parts 1–4), Reading = avg(Parts 5–7), Grammar = Part 5,
    Vocabulary = avg(Parts 6–7), each as accuracy %. The take page
    tallies each question's part at submit time and sends it as
    `parts`; `POST /api/results/submit` validates it strictly
    (integer part keys 1–20, 0 ≤ correct ≤ total, parts add up to the
    paper total — anything else is a 400) and stores it as JSON in
    the new nullable `breakdown` column (migration
    `0007_performance_breakdown.sql`). Rows submitted before it have
    NULL there and show an honest empty radar/skills, never demo
    values. The part → skill mapping is the TOEIC LR one, so other
    materials (e.g. TOEIC SW) show no skill breakdown rather than a
    mislabeled number; the Speed radar axis and the Time Management
    bar are dropped — there is no per-part source for either.
  - Drills only: the journey shows the drill points, but the overall
    score area says "Take a Full Simulation to see your overall
    score." with no CEFR — the same rule as the per-material
    leaderboard board. Free tests and live tests are never submitted,
    so they never count. The score/CEFR mapping lives in
    `server/utils/performance.ts` (single source of truth;
    `app/utils/performance.ts` mirrors it for the local fallback and
    `app/utils/scoring.ts` uses the same formulas, so the result page
    and the Performance page can never disagree about one attempt).
  Data sources per gate: `GET /api/results/activity?material=<slug>`
  (D1 `test_results` counts; 401 without a session, 503 without D1)
  via `app/composables/useActivity.ts`, which falls back to the
  browser's local results store when the server store is unreachable
  (plain `pnpm dev` or D1 down). The Continue card reads localStorage
  answers keys only — D1 never sees an unfinished attempt. The Enroll
  tab reads the server session + `GET /api/profile/enrollments`.
- **Sequential unlocking — simulations, then attempts** (7 Nov 2026):
  papers and attempts open in order, never all at once. Paper level
  (Full Simulations only, catalog order): Sim 01 is always open; Sim
  02 opens only after Sim 01 has a completed result, Sim 03 only
  after Sim 02, and so on — a drill completion never unlocks a
  simulation, and drill packs are always open. Attempt level (within
  one paper): Attempt 01 is always open; Attempt 02 opens only after
  Attempt 01 is completed, Attempt 03 only after Attempt 02. Locked
  simulation cards stay visible with a 🔒 Locked badge, a reason
  line ("Complete Full Simulation 01 to unlock"), and a disabled
  Start button; on the paper detail page the locked attempt buttons
  are disabled with a reason line, and Start Test is disabled while
  the paper or the selected attempt is locked — the default selection
  is the first unlocked attempt the user has not finished yet (their
  next attempt), or Attempt 1 when everything is finished. The rules
  are enforced server-side, not just in the UI: the take page shows
  a lock screen instead of the test for a locked paper/attempt, and
  `POST /api/results/submit` refuses a locked paper with 403
  `paper-locked` or a locked attempt with 403 `attempt-locked`, so a
  direct take URL can never record a result. "Completed" is the same
  definition everywhere: a finished row in D1 `test_results` (kind
  `simulation` or `drill`, valid correct/total). The attempt number
  is stored in the new nullable `attempt` column (migration
  `0008_results_attempt.sql`; `POST /api/results/submit` validates
  1–3, anything else is a 400, and an unknown paper id is a 400) —
  rows written before it count as attempt 1 for the unlock check.
  `GET /api/results/activity` now also returns `completedAttempts`
  (finished attempt numbers per paper id); the client rules live in
  `app/utils/unlock.ts` and the server rules in
  `server/utils/unlock.ts`, both reading the same catalog order
  (`server/utils/catalog.ts` `PAPERS_BY_MATERIAL` mirrors
  `app/data/mock.ts` `PAPERS` — keep in sync). Local fallback in
  plain `pnpm dev`: the browser's local results (latest result per
  paper only, so completed attempts are 1..that attempt). Credits
  note (checked 7 Nov 2026, not changed): the "balance: 12" on the
  paper detail page is a hardcoded literal in the template, and the
  "LR · 12" topbar chip reads the static `credits` array in
  `app/data/mock.ts` — there is no credit ledger, no deduction on
  submit, and no server endpoint, so the balance never moves; it is
  demo data until a purchase system exists.

Known limitations: the rate limiter keeps its counters in memory, so on
Cloudflare Pages each isolate has its own budget (correct on the local
dev server, which is one process). A D1-backed limiter is the planned
upgrade if abuse shows up. The package → materials mapping on the
server uses the default (Monthly 1, Quarterly 2, Semester all); the
admin panel's manual per-package material picks live in the browser
and are not reflected server-side. Crypto is Web Crypto only (works in
Node and in Workers, no `node:crypto`).

## Cloudflare Pages + D1

Deploy target is Cloudflare Pages (static + Pages Functions) with D1 as the
database. **Live since 5 Nov 2026:** https://gts-7ac.pages.dev (project
`gts`), D1 database `gts-db` (`df450308-8a55-45e5-a992-4547646055c7`, APAC)
bound as `DB`, migrations applied, `GET /api/health/d1` returns the live
tables (`questions`, `test_results`, `users`). The Meta API key is set as a
Pages secret (`NITRO_MODEL_API_KEY`), so the Live Test generates for real.
Local verification: `pnpm build` (cloudflare-pages preset) +
`wrangler pages dev --d1=DB` serves the app, and the health endpoint reports
the bound tables with a live row count.

### Deploy (from your own machine — needs your Cloudflare login)

```bash
pnpm build
npx wrangler pages deploy dist
```

First-time setup (already done 5 Nov 2026, kept here for reference):

```bash
npx wrangler login
npx wrangler d1 create gts-db        # copy the database_id it prints
npx wrangler d1 migrations apply gts-db --remote
npx wrangler pages secret put NITRO_MODEL_API_KEY
npx wrangler pages secret put NITRO_ADMIN_EMAILS
npx wrangler pages secret put NITRO_SESSION_SECRET
```

`NUXT_PUBLIC_GOOGLE_CLIENT_ID` is set in the Pages dashboard (Settings
→ Environment variables) — it is a public variable, not a secret. The
old `NITRO_ADMIN_USERNAME` / `NITRO_ADMIN_PASSWORD_HASH` secrets are
obsolete (password login removed 5 Nov 2026) and must be deleted if
they exist.

Note the project name is `gts` — `gts-7ac` is only the assigned
`pages.dev` subdomain, not the project name. Secrets only take effect on
the next deployment, so redeploy after setting one.

### Local D1 check

```bash
pnpm build
npx wrangler pages dev dist --d1=DB --port 8788
curl http://localhost:8788/api/health/d1
```

There are two D1 databases, and they must not be confused:

- **Remote** — `gts-db` (`df450308-8a55-45e5-a992-4547646055c7`, APAC),
  the production database. Target it with `--remote` (needs a Cloudflare
  login). It holds **no dummy data**: only real Google sign-ins, and
  the admin row appears on the admin's first Google sign-in (see
  [Auth](#auth) — never insert it by hand). To inspect it:
  ```bash
  npx wrangler d1 migrations list gts-db --remote
  npx wrangler d1 execute gts-db --remote --command "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM ai_usage; SELECT COUNT(*) FROM questions;"
  ```
  If a dummy row ever appears, delete it by key (never wipe the tables
  blindly), e.g. `DELETE FROM users WHERE google_sub IS NULL;`.
- **Local** — SQLite files under
  `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/`, managed by
  wrangler on this machine. Target it with `--local` (no login needed).
  Locally wrangler keeps the CLI-managed D1 and the pages-dev D1 as two
  separate files; both must carry the same migrations. On 5 Nov 2026
  the local files were reconciled: the two empty files were deleted
  and `npx wrangler d1 migrations apply gts-db --local` re-applied
  0001–0003 cleanly (all tables empty, zero dummy rows). If the two
  files drift again, delete the empty ones and re-apply — never hand-edit
  a live file's schema without recording the migration. Test rows created
  during local verification are deleted right after the test; the local
  DB is scratch, the remote DB is not. Note: a fresh pages-dev file
  starts with NO tables (wrangler does not apply migrations to it), so
  login upserts and the ai-usage endpoint fail with "no such table"
  until the migrations are applied to that file — apply the seven
  `migrations/*.sql` files to it with sqlite3 and record them in its
  `d1_migrations` table (same names as wrangler records: `0001_init.sql`,
  `0002_users_google.sql`, `0003_ai_usage.sql`, `0004_ai_usage_reasoning.sql`,
  `0005_ai_usage_actor.sql`, `0006_leaderboard_results.sql`,
  `0007_performance_breakdown.sql`).

Remote has no such split — one database, one `migrations apply --remote`.

Per-endpoint behavior, verified 5 Nov 2026 (Playwright, local):

| Endpoint | Plain `pnpm dev` (no D1) | `pnpm run dev:d1` (D1 bound) |
|---|---|---|
| `GET /api/health/d1` | 503 `unavailable` | 200, tables listed |
| `GET /api/admin/users` | 503 | 200, real users |
| `GET /api/admin/ai-usage` | 503 | 200, totals (0 on a clean DB) |
| `POST /api/admin/users/role` | 503 | 200/400 (400 for the bootstrap admin) |
| `POST /api/admin/users/grants` | 503 | 200 |
| `POST /api/auth/google` | 200 (role from the allowlist) | 200, user row upserted in D1 |
| `GET /api/auth/session` | 200 | 200 |
| `POST /api/admin/audit-chat` | 401 without a session; 503 `no-key` without a Meta key | 502 `meta-error` with a dummy key (Meta rejects it, zero real credits) |
| `GET /api/leaderboard` | 503 | 200, global/material boards (401 without session; 403 without material access) |
| `GET /api/performance` | 503 | 200, best sim + journey + skills for the material (401 without session; 400 unknown material; 403 without material access) |
| `POST /api/results/submit` | 503 | 200 (401 without session; 403 without material access; 400 on invalid input) |
| `GET /api/quests/status` | 503 | 200, this week's quest progress |
| `POST /api/quests/claim` | 503 | 200 claimed; 409 `not-complete` / `already-claimed` |

A fresh pages-dev file (no tables yet) no longer fails with a bare
500: `admin/users` and `ai-usage` answer 503 "D1 tables are missing
for this database — apply the migrations" until the seven
`migrations/*.sql` files are applied to that file with sqlite3 (see
above). The live site is unaffected — its D1 is bound by the Pages
project and already carries all tables including `ai_usage` and
`grants` (verified via `GET /api/health/d1` on 5 Nov 2026).

The two 503s are intentional fail-closed errors, confirmed from the
owner's machine (5 Nov 2026, 23:04, plain `pnpm dev`):
`GET /api/admin/ai-usage?period=30d` → 503 "Usage store is not
available on this server." (`server/api/admin/ai-usage.get.ts:31`)
and `GET /api/admin/users` → 503 "User store is not available on
this server." (`server/api/admin/users.get.ts:22`). Both are `h3`
`createError` throws when `getDb(event)` returns null — the binding
simply does not exist in plain dev. They are not a broken binding.

**Recording rule: every successful Meta call writes one row.**
`server/utils/ai-usage.ts` (`recordAiUsage`, best-effort, never
throws) inserts one `ai_usage` row per call — endpoint, model,
prompt/completion tokens from Meta's `usage` field, UTC timestamp.
Both Meta endpoints call it after every successful `callMeta`:
Live Test once per attempt in its retry loop (up to 3 calls per
batch — each attempt that reaches Meta is a row), audit chat once
per answer. Failed calls (502 from Meta, 503 no-key) log nothing —
no tokens were spent. With no D1 the row is silently dropped (see
Run locally above) — the Overview card can only show what D1 holds.

## Project structure

```
app/
  assets/css/main.css      # Tailwind v4 entry (+ no-scrollbar utility)
  components/              # TopBar (global), MaterialTopBar (material switcher + scoped nav),
                           # AppFooter, QuestionPalette, AudioPlayer, CountdownTimer,
                           # StatTile, PaperCard, ScorePills, ConfirmModal, NotesDrawer
  data/mock.ts             # MATERIALS, papers, questions, parts (all original demo content)
  layouts/
    default.vue            # Global topbar + footer, with auth guard (hub, profile)
    material.vue           # Material topbar + footer, with auth guard
  pages/
    index.vue              # Public landing page (hero, materials, how-it-works, pricing)
    auth.vue               # layout: false — split-screen Google Sign-In (route: /auth)
    materials/index.vue    # "My Materials" hub: accessible cards, locked ones marked
    m/[slug]/index.vue     # Material dashboard (keep pages under m/[slug]/ as siblings:
    m/[slug]/papers/index.vue          #  a [slug].vue file would swallow them as children
    m/[slug]/papers/[id]/index.vue     #  and they would never render)
    m/[slug]/papers/[id]/take.vue      # layout: false — own navy test chrome
    m/[slug]/papers/[id]/result.vue    # Score report
    m/[slug]/performance.vue
    m/[slug]/leaderboard.vue
    profile.vue            # Global (not per material)
    admin/                 # Admin panel pages: index (Overview), databases,
                           # packages, audits, reports, users, settings
  utils/
    storage.ts             # Typed localStorage helpers (auth, answers, results, notes)
    scoring.ts             # TOEIC-style predicted score + CEFR mapping
    navigation.ts          # postLoginPath(): always the materials hub (home)
    server-auth.ts         # fetchSessionState / loginWithGoogle / logoutServer / admin user APIs
    admin.ts               # Admin-panel helpers: bank, volumes, reports, vouchers, bankViewId
    ai-assistant.ts        # Audits chat: local analysis + LLM context builder
    adaptive.ts            # Adaptive engine (plain algorithms, playlist builder)
server/
  middleware/01-admin-guard.ts  # redirects /admin* without a valid admin session
  utils/auth.ts                 # HMAC session tokens, anon visitor ids, admin allowlist
  utils/google-auth.ts          # Google ID-token verification (JWKS, claims)
  utils/user-store.ts           # D1 users + grants, access resolution
  utils/ai-usage.ts             # ai_usage log: record/summarize (WIB hours, IDR estimate, reasoning split, actor split)
  utils/catalog.ts              # server-side material/package catalog (grant targets)
  utils/rate-limit.ts           # in-memory fixed-window limiter
  utils/d1.ts                   # getDb(event) for the D1 binding
  api/auth/google.post.ts       # Google Sign-In (verifies token, sets gts_session cookie)
  api/auth/config.get.ts        # public Google Client ID for the browser
  api/auth/logout.post.ts       # clears the session cookie
  api/auth/session.get.ts       # { admin, email, role, materials, packages } + mints gts_sid
  api/admin/users.get.ts        # real users + grants (admin-only)
  api/admin/users/role.post.ts  # promote/demote (admin-only)
  api/admin/users/grants.post.ts  # replace grants (admin-only)
  api/admin/audit-chat.post.ts  # Audits chat via Meta LLM (admin-only, 30/hr)
  api/admin/ai-usage.get.ts     # AI usage summary (+ optional ?rows=1 per-call rows, ?actor=admin|user scope filter, period-wide byActor split) for Overview + Reports (admin-only)
  api/live-test/generate.post.ts  # session-gated, rate-limited Meta generation
  api/health/d1.get.ts          # public D1 probe (tables + question count)
scripts/
  generate-questions/      # Question-generation pipeline (Meta Model API, Muse Spark):
                           # generate.mjs (CLI) + README.md. Validates batches against the
                           # Question schema, dedupes vs the bank, logs real token costs
                           # to out/cost-log.csv. Needs MODEL_API_KEY (dev.meta.ai/api-keys).
```

## Conventions

- Package manager: pnpm, never npm.
- Commits: `type(scope): short description` (e.g. `fix(gts): layout outlet`).
- Typecheck must pass with 0 errors before push.
- UI changes must be verified with a real render (screenshot), not just typecheck.
- Every change is documented here and in CHANGELOG.md.

## Trademark

TOEIC® is a registered trademark of Educational Testing Service (ETS). This product is not endorsed or approved by ETS. The same applies to TOEFL®/IELTS™ and their respective owners when those papers ship.

## Admin panel (minimal)

`/admin` — ops panel for question QC, reports, users, results, and
subscription packages. Guarded server-side (see [Auth](#auth)): sign in
with Google as an admin account. Without a valid admin session,
`/admin` redirects to `/auth?next=/admin`. Difficulty tags set here
persist in localStorage (`gts_admin_difficulty`).

### Admin panel audit (5 Nov 2026)

Every admin page was audited feature by feature. Rule applied:
dummy/seed data was removed wherever a real source exists; where no
real source exists yet, the page shows an honest empty / "not
connected" state instead of invented numbers — never a faked
connection. No demo users remain anywhere.

| Page | Feature | Data source | Connected? |
|---|---|---|---|
| Overview | Total questions (57) | Static bank + localStorage additions | Yes — local bank |
| Overview | Test takers / mo | Finished tests in this browser (`gts_result_*`) | Yes — local only |
| Overview | Pending reports / Recent reports | QC reports in localStorage | Yes — empty until a real report exists (no submission path yet) |
| Overview | Registered users | D1 users (real Google sign-ins) | Yes — D1 |
| Overview | AI usage card | D1 `ai_usage` (one row per Meta call) | Yes — D1 |
| Overview | User visits per month | — none — | No — visits are not tracked anywhere; the card says so instead of drawing a chart |
| Databases | Volumes, question tables, QC approve/reject, edits | Static bank + localStorage volumes/additions/overrides | Yes — local bank |
| Databases | Add volume ("Generate draft volume") | 30 hardcoded templates, cycled | Template stub, labeled as such — NOT AI generation; the real LLM path is `scripts/generate-questions/` |
| Packages | Subscriber counts | D1 package grants (explicit grants only; admins have implicit all-access) | Yes — D1 |
| Packages | Material matrix, question totals | Package picks (localStorage) + live bank | Yes — local |
| Packages | Vouchers | Admin-created only (localStorage) | Local only — no redemption flow yet; no seed vouchers |
| Audits | Audit chat | Meta LLM via `POST /api/admin/audit-chat` (admin-only, 30/hr, server key) | Yes — Meta; falls back to labeled local analysis when the key is missing |
| Audits | User analysis | Real D1 users (by email) + local test results | Yes — D1 users, local results |
| Audits | Volume audit / duplicates / key distribution / unrated | Live bank, computed locally | Yes — local bank |
| Reports | QC queue | QC reports in localStorage | Empty until a real report exists — no submission path from the test UI yet |
| Reports | Test results + certificates | Finished tests in this browser (`gts_result_*`) | Yes — local only, per browser |
| Reports | AI usage detail (Konsumsi AI) | D1 `ai_usage` — same rows as the Overview card, plus a per-call table (with Actor column), an All / Admin / User scope filter, an Admin-vs-User comparison block, and a "why 1,500++ tokens" explainer | Yes — D1 |
| Users | Real users table + role/grant controls | D1 users + grants | Yes — D1 |
| Settings | Meta API key card | Browser-stored key (dev convenience) | Dev only — production uses `NITRO_MODEL_API_KEY` |

Notes:
- Bank-view question ids are `lr-N` (TOEIC LR), `sw-N` (TOEIC SW),
  `free-N` (free test). SW used to be mapped to `lr-N`, which collided
  with LR ids in audit scopes and duplicate detection — fixed 5 Nov 2026.
- The three default volumes (TOEIC 1, TOEIC SW 1, Free Test 1) are
  structural defaults built from the real bank on first load, not
  fabricated data; their question counts are live bank counts.
- Auth guards are server-first everywhere: a valid server session
  opens the page even when the localStorage mirror is missing (cleared
  storage); the mirror is display-only. A forged localStorage "admin"
  with no server session is bounced to `/auth`.
- **Questions → Generate draft volume**: the admin generates question
  drafts (part/count/difficulty/topic) from templates, curates them in
  the Draft QC tab (approve/reject per question), and merges approved
  items into the bank with continuing numbers. The real LLM path is
  `scripts/generate-questions/`.
- **Packages**: Bulanan (1 material), Triwulanan (2), Semesteran (all);
  per-package material matrix, live question counts, subscriber counts.
  Flow: AI generates → admin curates → bank → package → customer.
  The AI never faces the customer live in phase 1.
- **Users**: real Google sign-in accounts (from D1) with role + grant
  controls — promote/demote admin, grant materials/packages without
  paying; grants take effect immediately.
- **Audits chat**: prompt the assistant ("audit bank soal", "cek duplikat",
  "distribusi kunci jawaban", "analisa user <email>") — the server asks
  the Meta LLM with real numbers computed from the live bank, and saves
  the answer as a report in the History tab. Without a key it falls back
  to the labeled local analysis, never pretending a local answer came
  from the LLM.
  Free-form prompts ("testing", greetings) are answered as audit
  questions, not refused: the old system prompt told the model to say
  "No audit was requested" for prompts without an audit scope, so a
  test word got a refusal plus a dump of raw context numbers. The
  prompt now answers every prompt from the context numbers, and the
  context sends totals alongside its 10-item samples — the model used
  to mistake the sample for the total ("10 unrated" was the truncated
  sample, not a verified count). The local fallback gives the same
  treatment: an unknown prompt returns a labeled bank summary, not a
  bare "unknown" line. Duplication was checked, not assumed: typing
  "testing" and "TEST" produces exactly one reply per send (verified
  with Playwright) — a doubled block in a chat report is a paste
  artifact, not an app bug.
  Fallback chain, in order: no key → 503 `no-key` → labeled local
  analysis ("Meta AI is not configured"); Meta rejects the key →
  502 `meta-error` → labeled local analysis with the note "Meta API
  rejected the request — the API key may be invalid or revoked. Check
  NITRO_MODEL_API_KEY, then restart the dev server."; rate limit →
  429 `rate-limited`. A rejected key is slow: Meta takes ~6 s to
  answer a bogus key, so the fallback reply arrives after a few
  seconds — not instant, not stuck. While the LLM answers, the chat
  shows an "AI sedang memproses…" bubble with animated dots and the
  composer is disabled, so the wait reads as working, not frozen.
  `.env` edits need a restart (see Run locally).
  The audits page has a "+ New chat" button (sidebar on desktop,
  History tab on mobile) that starts a fresh session without deleting
  history. The report detail view is full height to the bottom of the
  viewport (header fixed, body scrolls). The three category cards
  share the composer's `max-w-3xl` wrapper, so the cards row and the
  textarea are exactly the same width on desktop and mobile.
  Bank numbers behind one audit report, verified against the real
  static bank: 57 questions total (TOEIC LR 21 + TOEIC SW 6 + Free
  Test 30), keys A:18 B:23 C:10 D:6, 0 duplicate stems, 30 missing
  explanations — all 30 are Free Test questions, which have no
  explanation field by design. A report showing "97 questions" counts
  the browser's localStorage bank (57 static + additions, most likely
  approved template-draft volumes); the key skew and duplicates in
  such a report are real bank-quality findings, not audit bugs.
- **Question bank**: View opens a detail modal that can also **edit**
  stem, options, correct answer, and difficulty (persisted, applied to
  the live bank everywhere). Overview counts now match Packages.
`/m/:slug/playlist` — the customer's personal practice playlist:
behind-the-scenes ability analysis (accuracy per part from results +
practice, level 1–5, weakness-weighted share) builds a Spotify-style
question set; `/m/:slug/practice` is the drill runner whose results
feed the next playlist. Logic lives in `app/utils/adaptive.ts`
(plain algorithms — the LLM only *creates* questions, never serves
them live).

