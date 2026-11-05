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
- **Multi-material architecture (pattern 3):** after login the user lands on the materials hub (`/materials`) when they own 2+ materials, or is taken straight into their material when they own exactly one. Inside a material (`/m/:slug`) the full test experience lives: dashboard, papers, performance, leaderboard — all scoped to that material. A switcher in the topbar moves between owned materials; coming-soon materials are shown as upsell.
- Materials in the demo: TOEIC Listening & Reading (owned), TOEIC Speaking & Writing (owned), TOEFL iBT (coming soon), IELTS Academic (coming soon).
- Full test-platform UI on `dev`, visually verified page by page with headless screenshots:
  - Login (split-screen, mock auth via localStorage — any non-empty credentials work)
  - Materials hub (owned cards with paper/credit counts, coming-soon section)
  - Per-material dashboard (profile card, Points/Streak/Rank tiles, Weekly Quest, Performance radar, Performance Journey, Continue card, Available Papers)
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

## What is NOT built yet

- Real backend (auth, database, API) — Cloudflare groundwork done 5 Nov 2026 (Pages + D1 binding + schema); **Google Sign-In for everyone + D1 user store with admin/grants done 5 Nov 2026** (see [Auth](#auth)); question bank + results migration pending
- Real question bank (AI-generated, human-reviewed) — planned Nov 2026
- Real TTS audio for listening — planned Nov 2026
- Play Billing subscriptions — planned Nov 2026
- TOEFL / IELTS papers — after v1
- AI writing grading — v2

## Stack

- Nuxt 4, Vue 3.5, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`)
- pnpm 10 (use pnpm, not npm)
- Cloudflare Pages (Nitro preset `cloudflare-pages`) + D1 (`DB` binding, see `wrangler.jsonc` + `migrations/`)
- App data still mock state in localStorage — migration to D1 pending

## Branches

- `main` — stable
- `dev` — active development; all work lands here first

## Run locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 — the public landing page. Sign in at http://localhost:3000/auth with Google (one button for everyone — admin or learner; the role is decided server-side). For local sign-in, copy `.env.example` to `.env` and set `NUXT_PUBLIC_GOOGLE_CLIENT_ID` (a Glots OAuth client with http://localhost:3000 as an authorized JavaScript origin) — see [Auth](#auth).

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
  5. Apply migration 0002 to the remote D1
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
  2, Semester all). The question bank and test results are still in
  localStorage — only identity/privilege moved to D1.
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
- **Live Test endpoint is session-gated + rate-limited**
  (`POST /api/live-test/generate`): no session → 401; anonymous
  visitors get 12 batches/hour, signed-in admins 60/hour (per client
  IP; 429 + `Retry-After` header when exceeded). A request-body Meta
  API key is honored **only** for a valid admin session — anonymous
  callers always use the server env key (`NITRO_MODEL_API_KEY`), and
  the endpoint returns 503 when no key is configured at all. An
  anonymous visitor id (`gts_sid` cookie, minted by the session
  endpoint) exists only so the limiter can tell repeat visitors apart;
  it is not an identity.

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

Note: locally wrangler keeps the CLI-managed D1 and the pages-dev D1 as two
separate files; if tables are missing from the served instance, apply
`migrations/0001_init.sql` to the active file under
`.wrangler/state/v3/d1/miniflare-D1DatabaseObject/`. Remote has no such
split — one database, one `migrations apply --remote`.

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
  utils/
    storage.ts             # Typed localStorage helpers (auth, answers, results, notes)
    scoring.ts             # TOEIC-style predicted score + CEFR mapping
    navigation.ts          # postLoginPath(): 1 accessible material -> enter it, else hub
    server-auth.ts         # fetchSessionState / loginWithGoogle / logoutServer / admin user APIs
server/
  middleware/01-admin-guard.ts  # redirects /admin* without a valid admin session
  utils/auth.ts                 # HMAC session tokens, anon visitor ids, admin allowlist
  utils/google-auth.ts          # Google ID-token verification (JWKS, claims)
  utils/user-store.ts           # D1 users + grants, access resolution
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
- **Questions → Generate AI**: the admin generates question drafts
  (part/count/difficulty/topic), curates them in the Draft QC tab
  (approve/reject per question), and merges approved items into the bank
  with continuing numbers. In-panel generation is a workflow stub;
  the real LLM path is `scripts/generate-questions/`.
- **Packages**: Bulanan (1 material), Triwulanan (2), Semesteran (all);
  per-package material matrix, live question counts, subscriber counts.
  Flow: AI generates → admin curates → bank → package → customer.
  The AI never faces the customer live in phase 1.
- **Users**: real Google sign-in accounts (from D1) with role + grant
  controls — promote/demote admin, grant materials/packages without
  paying; grants take effect immediately. Below them, the 18 demo
  users (clearly labeled, local-only) keep the detail modal with the
  per-user ability map (per-part accuracy/level) used by the playlist
  engine.
- **AI assistant** (floating ✨ button): prompt the assistant
  ("audit bank soal", "cek duplikat", "distribusi kunci jawaban") —
  it runs real local analyses over the live bank and saves reports to
  the **Audit** tab. Demo mode is algorithmic; the real Meta API plugs
  in via backend later.
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

