# Changelog

All notable changes to this project are documented in this file and in README.md.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
