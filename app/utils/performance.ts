/**
 * Client mirror of server/utils/performance.ts — the same pure mapping
 * (score = round5(10 + accuracy × 980); CEFR = official ETS TOEIC LR
 * total bands; skills from the most recent simulation's per-part
 * breakdown), used ONLY for the local-storage fallback when the server
 * store is unreachable (plain `pnpm dev`). The server file is the
 * source of truth — keep both in sync; the unit script
 * `gts-performance-real-data-evidence/performance-unit.mjs` asserts
 * they agree on every boundary value.
 *
 * TOEIC scale scoping (mirrors the server file): the TOEIC mapping
 * and CEFR bands apply ONLY to toeic-lr. Other materials get NO
 * overall score/CEFR (bestSim is null) and their journey points
 * carry accuracy % (0–100) — never a TOEIC number.
 */
import { papersForMaterial } from '~/data/mock'
import type { TestResult } from '~/utils/storage'

export interface PartScore {
  correct: number
  total: number
}

export type PartBreakdown = Record<string, PartScore>

export interface PerfRow {
  paperId: string
  kind: 'simulation' | 'drill'
  correct: number
  total: number
  date: string
  breakdown: PartBreakdown | null
}

export interface BestSim {
  accuracy: number
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
  latestSim: { date: string, paperId: string, breakdown: PartBreakdown } | null
  skills: SkillBreakdown | null
  attempts: PerfAttempt[]
}

export function accuracyToScore(accuracy: number): number {
  const a = Number.isFinite(accuracy) ? Math.min(1, Math.max(0, accuracy)) : 0
  return Math.round((10 + a * 980) / 5) * 5
}

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

/**
 * Local fallback: the browser keeps only the LATEST result per paper
 * (`gts_result_<paperId>`), so the journey has at most one point per
 * paper and the best simulation is the best of those. Kind comes from
 * the catalog (paper category); the breakdown is the one stored at
 * submit time — local results saved before per-part tallies existed
 * have none, and their radar/skills stay empty, honestly.
 */
export function buildLocalPerformance(slug: string): PerformanceData {
  const papers = papersForMaterial(slug)
  const rows: PerfRow[] = []
  for (const p of papers) {
    let r: TestResult | null = null
    try {
      const raw = localStorage.getItem(`gts_result_${p.id}`)
      r = raw ? (JSON.parse(raw) as TestResult) : null
    } catch {
      r = null
    }
    if (!r) continue
    rows.push({
      paperId: p.id,
      kind: p.category === 'Full Simulation' ? 'simulation' : 'drill',
      correct: r.correct,
      total: r.total,
      date: r.finishedAt,
      breakdown: parseBreakdown(r.parts ?? null)
    })
  }
  return buildPerformance(rows, slug)
}
