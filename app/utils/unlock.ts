/**
 * Sequential unlocking, client-side (see README § "New-user empty
 * states" — the unlock rules). These are the UI mirrors of
 * server/utils/unlock.ts, which is the enforcement point: the server
 * refuses a locked paper (`paper-locked`) or attempt
 * (`attempt-locked`) with 403 on submit, so this file only decides
 * what the user SEES, never what is allowed.
 *
 * Paper level (Full Simulations only, catalog order): Sim 01 is
 * always open; Sim 02 opens only after Sim 01 has a completed
 * result, Sim 03 only after Sim 02, and so on. A drill completion
 * never unlocks a simulation. Drill packs are always open.
 *
 * Attempt level (within one paper): Attempt 01 is always open;
 * Attempt 02 opens only after Attempt 01 has a completed result,
 * Attempt 03 only after Attempt 02.
 */
import { papersForMaterial } from '~/data/mock'
import type { Paper } from '~/data/mock'
import type { TestResult } from '~/utils/storage'

/** Attempts offered per paper (the detail page shows Attempt 1–3). */
export const MAX_ATTEMPTS = 3

export interface PaperLock {
  locked: boolean
  /** The simulation that must be completed first, if locked. */
  unlockAfter: Paper | null
}

/** Paper-level lock for one paper, from the catalog order. */
export function resolvePaperLock(
  paper: Paper,
  papers: readonly Paper[],
  completedPaperIds: readonly string[]
): PaperLock {
  if (paper.category !== 'Full Simulation') return { locked: false, unlockAfter: null }
  const sims = papers.filter(p => p.category === 'Full Simulation')
  const i = sims.findIndex(p => p.id === paper.id)
  if (i <= 0) return { locked: false, unlockAfter: null }
  const prev = sims[i - 1] as Paper
  return completedPaperIds.includes(prev.id)
    ? { locked: false, unlockAfter: null }
    : { locked: true, unlockAfter: prev }
}

/** Attempt-level lock for one attempt of a paper. Attempt 1 is
 * always open; attempt N needs a completed result for N − 1. */
export function isAttemptLocked(attempt: number, completedAttempts: readonly number[]): boolean {
  if (attempt <= 1) return false
  return !completedAttempts.includes(attempt - 1)
}

/** Short display name of a paper for lock reasons: the part after
 * the last "—" ("TOEIC Listening & Reading — Full Simulation 01" →
 * "Full Simulation 01"). Falls back to the full title. */
export function shortPaperName(title: string): string {
  const parts = title.split('—')
  const last = parts.length > 1 ? (parts[parts.length - 1] as string).trim() : ''
  return last || title
}

/** Completed attempt numbers per paper, from the browser's local
 * results. localStorage keeps only the LATEST result per paper, so
 * the completed attempts are 1..that attempt — the sequence is
 * enforced going forward, so a latest attempt of 2 implies attempt
 * 1 was completed. The server data (when available) is exact and
 * replaces this approximation. */
export function completedAttemptsFromLocal(results: TestResult[]): Record<string, number[]> {
  const map: Record<string, number[]> = {}
  for (const r of results) {
    const n = Math.max(1, Math.min(MAX_ATTEMPTS, r.attempt || 1))
    map[r.paperId] = Array.from({ length: n }, (_, i) => i + 1)
  }
  return map
}

/** Papers of a material, in catalog order (the unlock order). */
export function simPapersForMaterial(slug: string): Paper[] {
  return papersForMaterial(slug).filter(p => p.category === 'Full Simulation')
}
