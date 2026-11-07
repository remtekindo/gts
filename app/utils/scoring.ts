/**
 * Scoring helpers: map a raw correct-count to a TOEIC-style predicted score.
 *
 * The mapping is the Performance source of truth (see
 * server/utils/performance.ts): linear accuracy → 10–990, rounded to
 * the nearest 5 like real TOEIC scores, and CEFR from the official ETS
 * TOEIC LR total bands. The take page stores this score (local result
 * + D1), so the result page and the Performance page can never disagree
 * about the same attempt.
 */

/** Scale correct/total onto the familiar 10–990 range, nearest 5. */
export function predictedScore(correct: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((10 + (correct / total) * 980) / 5) * 5
}

/**
 * Official ETS TOEIC Listening & Reading total-score bands:
 * A1 120–220, A2 225–545, B1 550–780, B2 785–940, C1 945–990.
 * Below 120 → "—" (below A1 — never an invented level).
 */
export function cefrLevel(score: number): string {
  if (score >= 945) return 'C1'
  if (score >= 785) return 'B2'
  if (score >= 550) return 'B1'
  if (score >= 225) return 'A2'
  if (score >= 120) return 'A1'
  return '—'
}
