/**
 * Client helpers for the two-tier leaderboard + quests.
 *
 * The board is real users only: every number comes from D1 via
 * GET /api/leaderboard (global monthly points, per-material mastery)
 * and GET /api/quests/status (this week's quest progress). Quest
 * points count only after POST /api/quests/claim records the claim
 * server-side. Test results reach D1 through POST /api/results/submit
 * (called from the paper take page after the local save) — the local
 * localStorage copy keeps working exactly as before.
 */

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

export interface QuestStatusItem {
  id: 'sim' | 'score700' | 'drills'
  done: boolean
  claimed: boolean
  points: number
}

export interface QuestStatus {
  weekStart: string
  quests: QuestStatusItem[]
}

function errorCode(e: unknown): string | null {
  const data = (e as { data?: { data?: { code?: string }, code?: string } })?.data
  return data?.data?.code || data?.code || null
}

export async function fetchGlobalBoard(month?: string): Promise<{ ok: true, board: GlobalBoard } | { ok: false, code: string }> {
  try {
    const board = await $fetch<GlobalBoard>('/api/leaderboard', { query: { scope: 'global', ...(month ? { month } : {}) } })
    return { ok: true, board }
  } catch (e) {
    return { ok: false, code: errorCode(e) ?? 'unavailable' }
  }
}

export async function fetchMaterialBoard(material: string): Promise<{ ok: true, board: MaterialBoard } | { ok: false, code: string }> {
  try {
    const board = await $fetch<MaterialBoard>('/api/leaderboard', { query: { scope: 'material', material } })
    return { ok: true, board }
  } catch (e) {
    return { ok: false, code: errorCode(e) ?? 'unavailable' }
  }
}

export async function fetchQuestStatus(): Promise<{ ok: true, status: QuestStatus } | { ok: false, code: string }> {
  try {
    const status = await $fetch<QuestStatus>('/api/quests/status')
    return { ok: true, status }
  } catch (e) {
    return { ok: false, code: errorCode(e) ?? 'unavailable' }
  }
}

export async function claimQuest(questId: string): Promise<{ ok: true } | { ok: false, code: string }> {
  try {
    await $fetch('/api/quests/claim', { method: 'POST', body: { questId } })
    return { ok: true }
  } catch (e) {
    return { ok: false, code: errorCode(e) ?? 'unavailable' }
  }
}

export interface SubmitResultInput {
  paperId: string
  materialSlug: string
  kind: 'simulation' | 'drill'
  correct: number
  total: number
  score: number
  finishedAt: string
  /** The attempt the row was submitted for (1–3, migration 0008).
   * Required for the sequential unlock — the server refuses a
   * locked attempt with 403 `attempt-locked`. */
  attempt?: number
  /** Per-part tally from the take page (migration 0007 `breakdown`).
   * Optional — older callers simply store NULL. */
  parts?: Record<number, { correct: number, total: number }>
}

/** Best-effort server copy of a completed paper. Never throws and
 * never blocks navigation — the local result is already saved. */
export async function submitResult(input: SubmitResultInput): Promise<boolean> {
  try {
    await $fetch('/api/results/submit', { method: 'POST', body: input })
    return true
  } catch (e) {
    console.warn('[leaderboard] result submit failed:', errorCode(e) ?? e)
    return false
  }
}
