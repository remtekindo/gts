/**
 * Performance — real per-user score, CEFR, journey, and skill breakdown.
 *
 * Single source of truth for the score/CEFR mapping (the client copy
 * in app/utils/performance.ts mirrors these pure functions for the
 * local-storage fallback — keep both in sync; the unit script
 * `gts-performance-real-data-evidence/performance-unit.mjs` asserts
 * they agree on every boundary value).
 *
 * Rules (see README § "Performance from real data"):
 * - Overall score: the user's BEST Full Simulation attempt in the
 *   material only (highest accuracy). Accuracy maps linearly to the
 *   TOEIC LR scale 10–990, rounded to the nearest 5 like real TOEIC
 *   scores: score = round5(10 + accuracy × 980). Labeled "estimasi"
 *   in the UI — real ETS scoring is not linear.
 * - CEFR: official ETS TOEIC LR total bands — A1 120–220, A2 225–545,
 *   B1 550–780, B2 785–940, C1 945–990. Below 120 → "—" (below A1,
 *   never an invented level). No full simulation → no score, no CEFR.
 * - Journey: one point per completed attempt (simulation + drill),
 *   chronological, each point the attempt's accuracy mapped with the
 *   same formula. One attempt = one point.
 * - Skills: from the per-part breakdown of the MOST RECENT Full
 *   Simulation that has one. TOEIC LR parts only (other materials
 *   have different part meanings, so their skills stay null):
 *   Listening = avg(Parts 1–4), Reading = avg(Parts 5–7),
 *   Grammar = Part 5, Vocabulary = avg(Parts 6–7), each as accuracy
 *   %. Rows without a breakdown (submitted before migration 0007)
 *   show an honest empty state for the radar/skills, never demo
 *   values.
 *
 * Free tests and live tests are never submitted to D1, so they never
 * appear here — only finished bank papers (kind 'simulation' /
 * 'drill', valid correct/total).
 *
 * TOEIC scale scoping: the round5(10 + accuracy × 980) mapping and
 * the ETS CEFR bands are the TOEIC LR scale — they apply ONLY to
 * toeic-lr. Other materials have their own scales (TOEFL 1–6,
 * IELTS 1–9) which do not exist in this build yet, so a non-TOEIC
 * material gets NO overall score and NO CEFR (bestSim is null), and
 * its journey points carry accuracy % (0–100) instead of a TOEIC
 * number. The journey chart plots those points on a 0–100 scale
 * (`mode="accuracy"`). When a material's real scale lands, add it
 * here — never reuse the TOEIC mapping for another test.
 */

export interface PartScore {
  correct: number
  total: number
}

/** Per-part results, keyed by part number as a string: { "1": {correct, total}, … }. */
export type PartBreakdown = Record<string, PartScore>

export interface PerfRow {
  paperId: string
  kind: 'simulation' | 'drill'
  correct: number
  total: number
  /** ISO date string (D1 created_at, or the local finishedAt). */
  date: string
  breakdown: PartBreakdown | null
}

export interface BestSim {
  /** Whole-percent accuracy of the best attempt (0–100). */
  accuracy: number
  /** Estimated TOEIC LR total, 10–990, nearest 5. */
  score: number
  cefr: string
  date: string
  paperId: string
  breakdown: PartBreakdown | null
}

export interface PerfAttempt {
  date: string
  score: number
  kind: 'simulation' | 'drill'
  paperId: string
}

export interface SkillBreakdown {
  listening: number | null
  reading: number | null
  grammar: number | null
  vocabulary: number | null
}

export interface PerformanceData {
  bestSim: BestSim | null
  /** Most recent full simulation that carries a breakdown (the radar source). */
  latestSim: { date: string, paperId: string, breakdown: PartBreakdown } | null
  /** Derived from latestSim (TOEIC LR only); null when there is none. */
  skills: SkillBreakdown | null
  attempts: PerfAttempt[]
}

/** Linear accuracy (0–1) → TOEIC LR total, rounded to the nearest 5. */
export function accuracyToScore(accuracy: number): number {
  const a = Number.isFinite(accuracy) ? Math.min(1, Math.max(0, accuracy)) : 0
  return Math.round((10 + a * 980) / 5) * 5
}

/**
 * Official ETS TOEIC LR total-score bands. Scores are multiples of 5,
 * so the in-between values (221–224) never occur from accuracyToScore;
 * they map to the band below, defensively.
 */
export function scoreToCefr(score: number): string {
  if (score >= 945) return 'C1'
  if (score >= 785) return 'B2'
  if (score >= 550) return 'B1'
  if (score >= 225) return 'A2'
  if (score >= 120) return 'A1'
  return '—'
}

function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v)
}

/**
 * Validate a per-part breakdown (parsed JSON or an already-parsed
 * value). Part keys must be integers 1–20; each part needs
 * 0 ≤ correct ≤ total with total > 0. Anything else → null (never a
 * guessed breakdown). When `expectedTotal` is given, the parts must
 * also add up to it — a breakdown that does not cover the whole paper
 * is rejected.
 */
export function parseBreakdown(value: unknown, expectedTotal?: number): PartBreakdown | null {
  let obj: unknown = value
  if (typeof value === 'string') {
    try {
      obj = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null
  const out: PartBreakdown = {}
  let sum = 0
  for (const [key, part] of Object.entries(obj as Record<string, unknown>)) {
    const n = Number(key)
    if (!Number.isInteger(n) || n < 1 || n > 20) return null
    if (!part || typeof part !== 'object' || Array.isArray(part)) return null
    const { correct, total } = part as Record<string, unknown>
    if (!isInt(correct) || !isInt(total) || total <= 0 || correct < 0 || correct > total) return null
    out[String(n)] = { correct, total }
    sum += total
  }
  if (Object.keys(out).length === 0) return null
  if (expectedTotal !== undefined && sum !== expectedTotal) return null
  return out
}

function partAccuracy(bd: PartBreakdown, parts: number[]): number | null {
  let correct = 0
  let total = 0
  for (const p of parts) {
    const row = bd[String(p)]
    if (!row) continue
    correct += row.correct
    total += row.total
  }
  if (total <= 0) return null
  return Math.round((correct / total) * 100)
}

/**
 * Skill accuracies from a breakdown. The part → skill mapping is the
 * TOEIC Listening & Reading one; any other material returns all null
 * rather than a mislabeled number.
 */
export function deriveSkills(breakdown: PartBreakdown, materialSlug: string): SkillBreakdown {
  if (materialSlug !== 'toeic-lr') {
    return { listening: null, reading: null, grammar: null, vocabulary: null }
  }
  return {
    listening: partAccuracy(breakdown, [1, 2, 3, 4]),
    reading: partAccuracy(breakdown, [5, 6, 7]),
    grammar: partAccuracy(breakdown, [5]),
    vocabulary: partAccuracy(breakdown, [6, 7])
  }
}

export function hasSkills(skills: SkillBreakdown | null): boolean {
  return !!skills && (skills.listening !== null || skills.reading !== null || skills.grammar !== null || skills.vocabulary !== null)
}

/** Build the whole performance view from one user's rows in a material. */
export function buildPerformance(rows: PerfRow[], materialSlug: string): PerformanceData {
  const valid = rows.filter(r => Number.isInteger(r.correct) && Number.isInteger(r.total) && r.total > 0 && r.correct >= 0 && r.correct <= r.total)
  const sorted = [...valid].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  // The TOEIC scale applies ONLY to toeic-lr (see the header
  // comment): other materials' journey points are accuracy %,
  // never a TOEIC number.
  const toeicScale = materialSlug === 'toeic-lr'
  const attempts: PerfAttempt[] = sorted.map(r => ({
    date: r.date,
    score: toeicScale ? accuracyToScore(r.correct / r.total) : Math.round((r.correct / r.total) * 100),
    kind: r.kind,
    paperId: r.paperId
  }))

  let best: PerfRow | null = null
  for (const r of sorted) {
    if (r.kind !== 'simulation') continue
    if (!best) { best = r; continue }
    const acc = r.correct / r.total
    const bestAcc = best.correct / best.total
    // Highest accuracy wins; on a tie the most recent attempt wins.
    if (acc > bestAcc || (acc === bestAcc && r.date >= best.date)) best = r
  }
  const bestSim: BestSim | null = best && toeicScale
    ? {
        accuracy: Math.round((best.correct / best.total) * 100),
        score: accuracyToScore(best.correct / best.total),
        cefr: scoreToCefr(accuracyToScore(best.correct / best.total)),
        date: best.date,
        paperId: best.paperId,
        breakdown: best.breakdown
      }
    : null

  let latestSim: PerformanceData['latestSim'] = null
  for (let i = sorted.length - 1; i >= 0; i--) {
    const r = sorted[i] as PerfRow
    if (r.kind === 'simulation' && r.breakdown) {
      latestSim = { date: r.date, paperId: r.paperId, breakdown: r.breakdown }
      break
    }
  }
  const skills = latestSim ? deriveSkills(latestSim.breakdown, materialSlug) : null
  return { bestSim, latestSim, skills: hasSkills(skills) ? skills : null, attempts }
}
