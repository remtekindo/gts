/**
 * Sequential unlocking, server-side (see README § "New-user empty
 * states" — the unlock rules).
 *
 * Paper level (Full Simulations only, catalog order): Sim 01 is
 * always open; Sim 02 opens only after Sim 01 has a completed
 * result, Sim 03 only after Sim 02, and so on. A drill completion
 * never unlocks a simulation. Drill packs are always open.
 *
 * Attempt level (within one paper): Attempt 01 is always open;
 * Attempt 02 opens only after Attempt 01 has a completed result,
 * Attempt 03 only after Attempt 02.
 *
 * "Completed" = a finished row in D1 `test_results` for this user
 * (kind 'simulation' or 'drill', valid correct/total) — the same
 * definition the activity endpoint and the leaderboard use. The
 * client enforces the same rules for the UI, but this module is the
 * enforcement point: POST /api/results/submit refuses a locked
 * paper (`paper-locked`) or a locked attempt (`attempt-locked`)
 * with 403, so a direct URL can never bypass the lock.
 */
import { PAPERS_BY_MATERIAL } from './catalog'
import type { D1Database } from './d1'

/** Attempts offered per paper (the detail page shows Attempt 1–3). */
export const MAX_ATTEMPTS = 3

const VALID_ROW = `kind IN ('simulation', 'drill') AND correct IS NOT NULL AND total IS NOT NULL AND total > 0`

export interface UnlockState {
  /** Finished paper ids in this material. */
  completedPaperIds: string[]
  /** Completed attempt numbers per paper id. Rows written before the
   * attempt column existed (NULL) count as attempt 1 — the default
   * attempt, and the only one that was ever open first. */
  completedAttempts: Record<string, number[]>
}

/** The user's completed papers + attempts in one material, from D1. */
export async function getUnlockState(db: D1Database, userSub: string, materialSlug: string): Promise<UnlockState> {
  const rows = await db.prepare(
    `SELECT paper_id AS paperId, attempt FROM test_results
     WHERE user_sub = ?1 AND material_slug = ?2 AND ${VALID_ROW}`
  ).bind(userSub, materialSlug).all<{ paperId: string, attempt: number | null }>()
  return rowsToUnlockState(rows.results ?? [])
}

/** Build an UnlockState from raw `test_results` rows (paper_id +
 * attempt). Shared by getUnlockState and the activity endpoint so
 * the legacy-NULL → attempt 1 rule lives in exactly one place. */
export function rowsToUnlockState(rows: Array<{ paperId: string, attempt: number | null }>): UnlockState {
  const completedPaperIds: string[] = []
  const completedAttempts: Record<string, number[]> = {}
  for (const r of rows) {
    if (!completedPaperIds.includes(r.paperId)) completedPaperIds.push(r.paperId)
    const list = completedAttempts[r.paperId] ?? []
    // Legacy rows (attempt NULL) count as attempt 1, see above.
    const n = r.attempt ?? 1
    if (!list.includes(n)) list.push(n)
    completedAttempts[r.paperId] = list.sort((a, b) => a - b)
  }
  return { completedPaperIds, completedAttempts }
}

export interface PaperLock {
  locked: boolean
  /** Id of the simulation that must be completed first, if locked. */
  unlockAfterId: string | null
}

/** Paper-level lock for one paper, from the catalog order. Unknown
 * paper ids and drills are never locked (unknown ids are rejected
 * earlier, at the submit handler, with 400). */
export function paperLock(materialSlug: string, paperId: string, completedPaperIds: readonly string[]): PaperLock {
  const papers = PAPERS_BY_MATERIAL[materialSlug] ?? []
  const paper = papers.find(p => p.id === paperId)
  if (!paper || paper.kind !== 'simulation') return { locked: false, unlockAfterId: null }
  const sims = papers.filter(p => p.kind === 'simulation')
  const i = sims.findIndex(p => p.id === paperId)
  if (i <= 0) return { locked: false, unlockAfterId: null }
  const prev = sims[i - 1] as { id: string }
  return completedPaperIds.includes(prev.id)
    ? { locked: false, unlockAfterId: null }
    : { locked: true, unlockAfterId: prev.id }
}

/** Attempt-level lock for one attempt of a paper. Attempt 1 is
 * always open; attempt N needs a completed result for N − 1. */
export function attemptLocked(attempt: number, completedAttempts: readonly number[]): boolean {
  if (attempt <= 1) return false
  return !completedAttempts.includes(attempt - 1)
}
