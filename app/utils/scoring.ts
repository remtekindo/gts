/** Demo scoring helpers: map a raw correct-count to a TOEIC-style predicted score. */

/** Scale correct/total onto the familiar 10–990 range. */
export function predictedScore(correct: number, total: number): number {
  if (total <= 0) return 0
  return Math.round(10 + (correct / total) * 980)
}

/** Rough CEFR band mapping for a TOEIC Listening & Reading total score. */
export function cefrLevel(score: number): string {
  if (score >= 945) return 'C1'
  if (score >= 785) return 'B2'
  if (score >= 550) return 'B1'
  if (score >= 225) return 'A2'
  return 'A1'
}
