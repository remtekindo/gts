/**
 * Leaderboard — two tiers, one source of truth.
 *
 * GLOBAL (monthly competition): rank by TOTAL monthly points,
 * season = UTC month `YYYY-MM`. Points come from three sources:
 *   (a) test points: per paper, best-attempt accuracy %
 *       (correct/total × 100, rounded whole), summed across papers,
 *       CAPPED at 500/month;
 *   (b) quest points: 50 per completed Weekly Quest, counted only
 *       after the user claims it (see quest_claims);
 *   (c) streak points: +10 per active day (≥1 submitted result that
 *       day), +50 bonus each time a run of consecutive active days
 *       reaches a multiple of 7 (the bonus counts in the month its
 *       7th/14th/… day falls in).
 * Ties: points desc, then whoever earned their first point of the
 * month earliest, then user_sub (fully deterministic — ranks are
 * unique positions, never shared).
 *
 * PER-MATERIAL (mastery, self-measurement): one board per material.
 * Rank by AVERAGE best-attempt accuracy on FULL SIMULATIONS in that
 * material (0–100%); a user appears only after completing ≥1 full
 * simulation there. This board is ALL-TIME (accuracy is a level, not
 * an accumulation — no monthly reset). Ties: accuracy desc, then
 * more full simulations completed, then user_sub.
 *
 * Live tests are NOT submitted (AI-generated questions, not the
 * curated bank) and never earn points. The free test needs no login,
 * so it never earns points either. Only real Google users appear —
 * never demo rows, never emails (names are masked, see maskName).
 *
 * Dates are UTC throughout: created_at is SQLite datetime('now')
 * (UTC), the season is strftime('%Y-%m', created_at), and the quest
 * week starts Monday 00:00 UTC.
 */
import type { D1Database } from './d1'

export const QUEST_POINTS = 50
export const MONTHLY_TEST_CAP = 500
export const STREAK_DAY_POINTS = 10
export const STREAK_WEEK_BONUS = 50

export const QUEST_IDS = ['sim', 'score700', 'drills'] as const
export type QuestId = (typeof QUEST_IDS)[number]

export function isQuestId(v: string): v is QuestId {
  return (QUEST_IDS as readonly string[]).includes(v)
}

export interface ResultRow {
  user_sub: string | null
  material_slug: string
  paper_id: string
  kind: string | null
  score: number | null
  total: number | null
  correct: number | null
  created_at: string
}

export interface UserIdentityRow {
  google_sub: string
  name: string | null
  email: string | null
}

/* ------------------------------------------------------------------ */
/* Dates (UTC)                                                         */
/* ------------------------------------------------------------------ */

/** 'YYYY-MM' for a Date (UTC). */
export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function currentMonthKey(): string {
  return monthKey(new Date())
}

export function isMonthKey(v: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(v)
}

/** Monday (00:00 UTC) of the week containing `d`, as 'YYYY-MM-DD'. */
export function mondayOf(d: Date): string {
  const day = d.getUTCDay() // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7 // days since Monday
  const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff))
  return m.toISOString().slice(0, 10)
}

export function currentWeekStart(): string {
  return mondayOf(new Date())
}

/** 'YYYY-MM-DD' (UTC) of a created_at value. */
export function dateOf(createdAt: string): string {
  return createdAt.slice(0, 10)
}

/* ------------------------------------------------------------------ */
/* Names                                                               */
/* ------------------------------------------------------------------ */

/** Mask a display name the way the old demo board did ('R***a'): first
 * letter + '***' + last letter. Never returns an email. */
export function maskName(name: string | null, fallback = 'Learner'): string {
  const clean = (name ?? '').trim()
  if (!clean) return fallback
  if (clean.length === 1) return `${clean}***`
  return `${clean.charAt(0)}***${clean.charAt(clean.length - 1)}`
}

/* ------------------------------------------------------------------ */
/* Accuracy / points                                                   */
/* ------------------------------------------------------------------ */

/** Whole-percent accuracy of one result row, or null when the row
 * carries no usable correct/total (legacy rows). */
export function accuracyOf(row: Pick<ResultRow, 'correct' | 'total'>): number | null {
  if (row.correct === null || row.total === null || row.total <= 0) return null
  return Math.round((row.correct / row.total) * 100)
}

/** Best-attempt accuracy per paper_id, from a list of result rows. */
export function bestAccuracyByPaper(rows: ResultRow[]): Map<string, number> {
  const best = new Map<string, number>()
  for (const row of rows) {
    const acc = accuracyOf(row)
    if (acc === null) continue
    const prev = best.get(row.paper_id)
    if (prev === undefined || acc > prev) best.set(row.paper_id, acc)
  }
  return best
}

/** Test points: sum of best-attempt accuracies, capped at 500. */
export function testPoints(rows: ResultRow[]): number {
  let sum = 0
  for (const acc of bestAccuracyByPaper(rows).values()) sum += acc
  return Math.min(sum, MONTHLY_TEST_CAP)
}

/* ------------------------------------------------------------------ */
/* Streak                                                              */
/* ------------------------------------------------------------------ */

export interface StreakStats {
  /** Consecutive active days ending today (or yesterday when today
   * has no activity yet) — 0 when the last activity is older. */
  current: number
  /** Active days inside `month`. */
  monthActiveDays: number
  /** 7-day bonuses whose 7th/14th/… day falls inside `month`. */
  monthBonuses: number
  /** Streak points for `month`: days × 10 + bonuses × 50. */
  monthPoints: number
}

/**
 * Streak stats from a sorted, deduplicated list of active dates
 * ('YYYY-MM-DD', UTC). Pure date math — no DB access, so it is
 * trivially unit-testable from the same inputs the board uses.
 */
export function streakStats(activeDates: string[], month: string): StreakStats {
  const set = new Set(activeDates)
  const sorted = [...set].sort()
  const monthActiveDays = sorted.filter(d => d.startsWith(month)).length

  // 7-day bonuses: walk the run; every time the run length hits a
  // multiple of 7, that date earns +50 in its own month.
  let monthBonuses = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    if (prev !== null && daysBetween(prev, d) === 1) run += 1
    else run = 1
    if (run % 7 === 0 && d.startsWith(month)) monthBonuses += 1
    prev = d
  }

  // Current streak: count back from today, or from yesterday when
  // today has no activity yet.
  const today = new Date().toISOString().slice(0, 10)
  let cursor = set.has(today) ? today : addDays(today, -1)
  let current = 0
  while (set.has(cursor)) {
    current += 1
    cursor = addDays(cursor, -1)
  }

  return {
    current,
    monthActiveDays,
    monthBonuses,
    monthPoints: monthActiveDays * STREAK_DAY_POINTS + monthBonuses * STREAK_WEEK_BONUS
  }
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
}

function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/* ------------------------------------------------------------------ */
/* DB reads                                                            */
/* ------------------------------------------------------------------ */

export async function fetchUsers(db: D1Database): Promise<Map<string, UserIdentityRow>> {
  const res = await db.prepare(
    'SELECT google_sub, name, email FROM users WHERE google_sub IS NOT NULL'
  ).all<UserIdentityRow>()
  const map = new Map<string, UserIdentityRow>()
  for (const row of res.results || []) map.set(row.google_sub, row)
  return map
}

export async function fetchMonthResults(db: D1Database, month: string): Promise<ResultRow[]> {
  const res = await db.prepare(
    `SELECT user_sub, material_slug, paper_id, kind, score, total, correct, created_at
     FROM test_results
     WHERE user_sub IS NOT NULL AND kind IN ('simulation', 'drill')
       AND correct IS NOT NULL AND total IS NOT NULL AND total > 0
       AND strftime('%Y-%m', created_at) = ?1
     ORDER BY created_at ASC`
  ).bind(month).all<ResultRow>()
  return res.results || []
}

export async function fetchUserResults(db: D1Database, sub: string): Promise<ResultRow[]> {
  const res = await db.prepare(
    `SELECT user_sub, material_slug, paper_id, kind, score, total, correct, created_at
     FROM test_results
     WHERE user_sub = ?1 AND kind IN ('simulation', 'drill')
       AND correct IS NOT NULL AND total IS NOT NULL AND total > 0
     ORDER BY created_at ASC`
  ).bind(sub).all<ResultRow>()
  return res.results || []
}

export async function fetchMaterialResults(db: D1Database, material: string): Promise<ResultRow[]> {
  const res = await db.prepare(
    `SELECT user_sub, material_slug, paper_id, kind, score, total, correct, created_at
     FROM test_results
     WHERE material_slug = ?1 AND kind = 'simulation'
       AND user_sub IS NOT NULL
       AND correct IS NOT NULL AND total IS NOT NULL AND total > 0
     ORDER BY created_at ASC`
  ).bind(material).all<ResultRow>()
  return res.results || []
}

interface ClaimRow {
  user_sub: string
  quest_id: string
  week_start: string
  points: number
  claimed_at: string
}

export async function fetchMonthClaims(db: D1Database, month: string): Promise<ClaimRow[]> {
  const res = await db.prepare(
    `SELECT user_sub, quest_id, week_start, points, claimed_at FROM quest_claims
     WHERE strftime('%Y-%m', claimed_at) = ?1 ORDER BY claimed_at ASC`
  ).bind(month).all<ClaimRow>()
  return res.results || []
}

export async function fetchUserClaims(db: D1Database, sub: string, weekStart: string): Promise<Set<string>> {
  const res = await db.prepare(
    'SELECT quest_id FROM quest_claims WHERE user_sub = ?1 AND week_start = ?2'
  ).bind(sub, weekStart).all<{ quest_id: string }>()
  return new Set((res.results || []).map(r => r.quest_id))
}

/* ------------------------------------------------------------------ */
/* Quests (this week)                                                  */
/* ------------------------------------------------------------------ */

export interface QuestStatus {
  id: QuestId
  done: boolean
  claimed: boolean
  points: number
}

/**
 * Which of the three Weekly Quests this user completed in the week
 * starting `weekStart` (Monday, UTC), and which are already claimed.
 * Completion is derived from D1 results only — never from the client.
 * - sim: ≥1 full simulation completed this week.
 * - score700: any paper with predicted score ≥ 700 this week.
 * - drills: ≥3 distinct drill packs completed this week.
 */
export async function questStatus(db: D1Database, sub: string, weekStart: string): Promise<QuestStatus[]> {
  const weekEnd = addDays(weekStart, 7)
  // created_at is SQLite datetime('now') format ('YYYY-MM-DD HH:MM:SS',
  // space separator) — the bounds must use the same format or the
  // string comparison silently drops the week's first day.
  const res = await db.prepare(
    `SELECT paper_id, kind, score FROM test_results
     WHERE user_sub = ?1 AND kind IN ('simulation', 'drill')
       AND created_at >= ?2 AND created_at < ?3`
  ).bind(sub, `${weekStart} 00:00:00`, `${weekEnd} 00:00:00`).all<{ paper_id: string, kind: string, score: number | null }>()
  const rows = res.results || []
  const doneSim = rows.some(r => r.kind === 'simulation')
  const doneScore = rows.some(r => r.score !== null && r.score >= 700)
  const drillPapers = new Set(rows.filter(r => r.kind === 'drill').map(r => r.paper_id))
  const doneDrills = drillPapers.size >= 3
  const claimed = await fetchUserClaims(db, sub, weekStart)
  const done: Record<QuestId, boolean> = { sim: doneSim, score700: doneScore, drills: doneDrills }
  return QUEST_IDS.map(id => ({ id, done: done[id], claimed: claimed.has(id), points: QUEST_POINTS }))
}

/* ------------------------------------------------------------------ */
/* Boards                                                              */
/* ------------------------------------------------------------------ */

export interface GlobalRow {
  rank: number
  name: string
  points: number
  testPoints: number
  questPoints: number
  streakPoints: number
  streak: number
  isMe: boolean
}

export interface GlobalBoard {
  scope: 'global'
  month: string
  rows: GlobalRow[]
  me: {
    rank: number | null
    points: number
    testPoints: number
    questPoints: number
    streakPoints: number
    streak: number
    scores: { slug: string, bestAccuracy: number | null }[]
  }
}

/**
 * Monthly global board. Every user with ≥1 point in `month` appears.
 * Rank is the unique position in: points desc, first point of the
 * month earliest, user_sub asc.
 */
export async function computeGlobalBoard(db: D1Database, month: string, meSub: string): Promise<GlobalBoard> {
  const users = await fetchUsers(db)
  const monthResults = await fetchMonthResults(db, month)
  const monthClaims = await fetchMonthClaims(db, month)

  const byUser = new Map<string, { results: ResultRow[], firstAt: string | null, claims: number }>()
  const touch = (sub: string) => {
    let cur = byUser.get(sub)
    if (!cur) { cur = { results: [], firstAt: null, claims: 0 }; byUser.set(sub, cur) }
    return cur
  }
  for (const r of monthResults) {
    const cur = touch(r.user_sub as string)
    cur.results.push(r)
    if (cur.firstAt === null || r.created_at < cur.firstAt) cur.firstAt = r.created_at
  }
  for (const c of monthClaims) {
    const cur = touch(c.user_sub)
    cur.claims += c.points
    if (cur.firstAt === null || c.claimed_at < cur.firstAt) cur.firstAt = c.claimed_at
  }

  // Streaks need each user's full activity history (not just the
  // month — a run can start in the previous month).
  const scored: (GlobalRow & { sub: string, firstAt: string })[] = []
  for (const [sub, cur] of byUser) {
    const allRows = await fetchUserResults(db, sub)
    const activeDates = [...new Set(allRows.map(r => dateOf(r.created_at)))]
    const streak = streakStats(activeDates, month)
    const tp = testPoints(cur.results)
    const qp = cur.claims
    const sp = streak.monthPoints
    const total = tp + qp + sp
    if (total <= 0) continue
    const identity = users.get(sub)
    scored.push({
      rank: 0,
      name: maskName(identity?.name ?? null),
      points: total,
      testPoints: tp,
      questPoints: qp,
      streakPoints: sp,
      streak: streak.current,
      isMe: sub === meSub,
      sub,
      firstAt: cur.firstAt ?? '9999'
    })
  }
  scored.sort((a, b) =>
    b.points - a.points ||
    (a.firstAt < b.firstAt ? -1 : a.firstAt > b.firstAt ? 1 : 0) ||
    (a.sub < b.sub ? -1 : a.sub > b.sub ? 1 : 0)
  )
  scored.forEach((r, i) => { r.rank = i + 1 })

  // Per-material best accuracy for the "Your scores" chips (all-time).
  const myRows = meSub ? await fetchUserResults(db, meSub) : []
  const scores: { slug: string, bestAccuracy: number | null }[] = []
  const byMaterial = new Map<string, ResultRow[]>()
  for (const r of myRows) {
    const list = byMaterial.get(r.material_slug) ?? []
    list.push(r)
    byMaterial.set(r.material_slug, list)
  }
  for (const [slug, rows] of byMaterial) {
    const best = bestAccuracyByPaper(rows)
    scores.push({ slug, bestAccuracy: best.size ? Math.max(...best.values()) : null })
  }

  const me = scored.find(r => r.sub === meSub)
  const meStreak = meSub ? streakStats([...new Set(myRows.map(r => dateOf(r.created_at)))], month) : null
  const rows: GlobalRow[] = scored.map(({ sub: _sub, firstAt: _firstAt, ...row }) => row)
  return {
    scope: 'global',
    month,
    rows,
    me: me
      ? {
          rank: me.rank,
          points: me.points,
          testPoints: me.testPoints,
          questPoints: me.questPoints,
          streakPoints: me.streakPoints,
          streak: me.streak,
          scores
        }
      : {
          rank: null,
          points: 0,
          testPoints: 0,
          questPoints: 0,
          streakPoints: 0,
          streak: meStreak ? meStreak.current : 0,
          scores
        }
  }
}

export interface MaterialRow {
  rank: number
  name: string
  accuracy: number
  sims: number
  isMe: boolean
}

export interface MaterialBoard {
  scope: 'material'
  material: string
  rows: MaterialRow[]
  me: { rank: number | null, accuracy: number | null, sims: number }
}

/**
 * Per-material mastery board (all-time). Rank by average best-attempt
 * accuracy on full simulations; a user appears only after completing
 * ≥1 full simulation in this material. Ties: accuracy desc, then
 * more simulations, then user_sub.
 */
export async function computeMaterialBoard(db: D1Database, material: string, meSub: string): Promise<MaterialBoard> {
  const users = await fetchUsers(db)
  const results = await fetchMaterialResults(db, material)
  const byUser = new Map<string, ResultRow[]>()
  for (const r of results) {
    const sub = r.user_sub as string
    const list = byUser.get(sub) ?? []
    list.push(r)
    byUser.set(sub, list)
  }
  const scored: (MaterialRow & { sub: string })[] = []
  for (const [sub, rows] of byUser) {
    const best = bestAccuracyByPaper(rows)
    if (best.size === 0) continue
    const accuracy = Math.round([...best.values()].reduce((a, b) => a + b, 0) / best.size)
    const identity = users.get(sub)
    scored.push({
      rank: 0,
      name: maskName(identity?.name ?? null),
      accuracy,
      sims: best.size,
      isMe: sub === meSub,
      sub
    })
  }
  scored.sort((a, b) =>
    b.accuracy - a.accuracy ||
    b.sims - a.sims ||
    (a.sub < b.sub ? -1 : a.sub > b.sub ? 1 : 0)
  )
  scored.forEach((r, i) => { r.rank = i + 1 })
  const me = scored.find(r => r.sub === meSub)
  const rows: MaterialRow[] = scored.map(({ sub: _sub, ...row }) => row)
  return {
    scope: 'material',
    material,
    rows,
    me: me ? { rank: me.rank, accuracy: me.accuracy, sims: me.sims } : { rank: null, accuracy: null, sims: 0 }
  }
}
