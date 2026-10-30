# GTS — Global Testing System

Multi-subject online testing platform. English first, more subjects later.

**What this is:** an assessment-first testing platform — users pay for tests and an instant predicted score/level, NOT theory lessons.
**What this is NOT:** a course app, a chatbot tutor, or an official TOEIC/TOEFL/IELTS product. Not affiliated with or endorsed by ETS.

## What this product does

A user signs in, picks a material they own (e.g. TOEIC Listening & Reading), and inside that material takes timed test papers, gets a predicted score with CEFR level plus per-part breakdown. Progress, streaks, and weak areas are tracked per material. New papers ship monthly for subscribers.

**What was pre-existing:** nothing — this repo was created 30 Oct 2026 for the GTS project.
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
- **Free test without login (`/free-test`):** 30 original general-English questions — 15 listening (read-and-respond), 10 reading, 5 writing (best-sentence choice, auto-gradable). Timer, palette grouped by section, submit confirmation. Submitting saves answers to localStorage and redirects to `/auth?next=/free-test/result`; the result page shows a login gate for guests and a per-section + total score breakdown after auth, then clears the pending answers. Answer options are pre-shuffled in the bank (fixed seed, no runtime randomness); the submit button sits in the top bar next to the timer; the result includes a full per-question review with correct answers marked; each attempt is recorded in Profile → Enroll History. The auth page honors `?next=` (local paths only) after sign-in or register.

## What is NOT built yet

- Real backend (auth, database, API) — planned Nov 2026
- Real question bank (AI-generated, human-reviewed) — planned Nov 2026
- Real TTS audio for listening — planned Nov 2026
- Play Billing subscriptions — planned Nov 2026
- TOEFL / IELTS papers — after v1
- AI writing grading — v2

## Stack

- Nuxt 4, Vue 3.5, TypeScript, Tailwind CSS v4 (`@tailwindcss/vite`)
- pnpm 10 (use pnpm, not npm)
- No backend yet — mock state in localStorage

## Branches

- `main` — stable
- `dev` — active development; all work lands here first

## Run locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000 — the public landing page. Sign in at http://localhost:3000/auth (mock auth: any non-empty credentials work).

```bash
pnpm typecheck   # vue-tsc, must pass with 0 errors
```

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
    auth.vue               # layout: false — split-screen mock login (route: /auth)
    materials/index.vue    # "My Materials" hub: owned cards + coming-soon upsell
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
    navigation.ts          # postLoginPath(): 1 owned material -> enter it, else hub
```

## Conventions

- Package manager: pnpm, never npm.
- Commits: `type(scope): short description` (e.g. `fix(gts): layout outlet`).
- Typecheck must pass with 0 errors before push.
- UI changes must be verified with a real render (screenshot), not just typecheck.
- Every change is documented here and in CHANGELOG.md.

## Trademark

TOEIC® is a registered trademark of Educational Testing Service (ETS). This product is not endorsed or approved by ETS. The same applies to TOEFL®/IELTS™ and their respective owners when those papers ship.
