# Changelog

All notable changes to this project are documented in this file and in README.md.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
