/**
 * Where to send the user right after a successful sign-in (or when
 * visiting `/` while already signed in): always the materials hub.
 * The hub is the home — it carries the global learner analytics
 * (greeting, Points/Streak/Rank, Weekly Quest, per-material score
 * summary) above the material cards. The old single-material
 * auto-enter was removed 6 Nov 2026: it skipped the hub, so a
 * one-material user never saw the global analytics.
 */
export function postLoginPath(): string {
  return '/materials'
}
