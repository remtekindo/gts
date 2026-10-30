# GTS — Global Testing System

Multi-subject online testing platform. English first, more subjects later.

**What this is:** an assessment-first testing platform — users pay for tests and an instant predicted score/level, NOT theory lessons.
**What this is NOT:** a course app, a chatbot tutor, or an official TOEIC/TOEFL/IELTS product. Not affiliated with or endorsed by ETS.

## What this product does

A user picks a test paper (starting with TOEIC Listening & Reading simulations), takes it under timed conditions, and gets a predicted score with CEFR level plus per-part breakdown. Progress, streaks, and weak areas are tracked over time. New papers ship monthly for subscribers.

**What was pre-existing:** nothing — this repo was created 30 Oct 2026 for the GTS project.
**What was built on 30 Oct 2026:** the full UI clone below (structure inspired by SmartPrep's UX; all code, branding, and question content are original).

## What was built (30 Oct 2026)

- Initial scaffold: Nuxt 4 + Vue + TypeScript + Tailwind CSS v4, pnpm. Branches `main` (stable) and `dev` (active development).
- Full test-platform UI on `dev`, visually verified page by page with headless screenshots:
  - Login (split-screen, mock auth via localStorage)
  - Dashboard (profile card, Points/Streak/Rank tiles, Weekly Quest, Performance radar, Performance Journey, Continue card, Available Papers)
  - Papers list (hero, My/Available tabs, filter chips, search, paper cards)
  - Paper overview (navy hero, Exit, attempt selector, Listening/Reading skill cards, TOEIC Score / CEFR toggle)
  - Test interface (instructions modal per part, navy header with Save & Exit + Submit Quiz, progress bar, countdown timer, Notes drawer, question card with radio options, fixed bottom question palette grouped by part, submit confirmation with answered count)
  - Result page (predicted score + CEFR + marks pills, part tabs, per-question review with Correct/Wrong highlighting, color-coded palette)
  - Performance (Quick Insights + Full Analytics), Leaderboard (sticky "Your Ranking" card), Profile (4 tabs)
- Fixes after visual QA: `app.vue` now wraps pages in `<NuxtLayout>` (navbar/footer were not rendering); footer component added; route nesting fixed (`papers/[id].vue` → `papers/[id]/index.vue` so take/result pages resolve); username fallback fixed.
- Mock data only: 18 original demo questions across Parts 1–7, 5 demo papers, TOEIC-style scoring utils. Audio is a labeled placeholder.

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

Open http://localhost:3000/login — any username/password signs in (mock auth).

```bash
pnpm typecheck   # vue-tsc, must pass with 0 errors
```

## Project structure

```
app/
  assets/css/main.css      # Tailwind v4 entry (+ no-scrollbar utility)
  components/              # TopBar, AppFooter, QuestionPalette, AudioPlayer,
                           # CountdownTimer, StatTile, PaperCard, ScorePills,
                           # ConfirmModal, NotesDrawer
  data/mock.ts             # Demo papers, questions, parts (all original demo content)
  layouts/default.vue      # Sticky topbar + centered container + footer, with auth guard
  pages/
    login.vue              # layout: false — split-screen mock login
    index.vue              # Dashboard
    papers/index.vue       # Paper list
    papers/[id]/index.vue  # Paper overview (keep as index.vue: sibling of take/result,
                           # otherwise Nuxt treats take/result as its children and they won't render)
    papers/[id]/take.vue   # layout: false — own navy test chrome
    papers/[id]/result.vue # Score report
    performance.vue leaderboard.vue profile.vue
  utils/
    storage.ts             # Typed localStorage helpers (auth, answers, results, notes)
    scoring.ts             # TOEIC-style predicted score + CEFR mapping
```

## Conventions

- Package manager: pnpm, never npm.
- Commits: `type(scope): short description` (e.g. `fix(gts): layout outlet`).
- Typecheck must pass with 0 errors before push.
- UI changes must be verified with a real render (screenshot), not just typecheck.
- Every change is documented here and in CHANGELOG.md.

## Trademark

TOEIC® is a registered trademark of Educational Testing Service (ETS). This product is not endorsed or approved by ETS. The same applies to TOEFL®/IELTS™ and their respective owners when those papers ship.
