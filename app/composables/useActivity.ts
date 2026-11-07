/**
 * Client-side activity gates for one material.
 *
 * Definitions (see README § "New-user empty states"):
 * - "completed test": a finished paper — a row in D1 `test_results`
 *   for this user. The server counts it (GET /api/results/activity);
 *   when the server store is unreachable (plain `pnpm dev`, or D1
 *   down) the browser's local results are the fallback.
 * - "started": the user has any attempt in this material — a
 *   completed result (server or local) or saved answers for a paper
 *   of this material.
 * - "in progress": saved answers (`gts_answers_<paperId>_<attempt>`)
 *   with at least one answer — answers are cleared on submit, so a
 *   saved key is a genuinely unfinished attempt. This state exists
 *   only in the browser; D1 never sees it.
 */
import { MATERIALS, papersForMaterial } from '~/data/mock'
import type { PaperStatus } from '~/data/mock'
import { listInProgressAttempts, listLocalResults } from '~/utils/storage'
import { completedAttemptsFromLocal } from '~/utils/unlock'

/**
 * Per-paper status from the user's REAL data (never the catalog).
 *
 * Precedence: an active attempt beats a finished one — a user who
 * completed attempt 1 and started attempt 2 is working on the paper
 * right now, so "In progress" (and Continue) is the honest state.
 * No attempt and no finished result → "Not started".
 */
export function resolvePaperStatus(
  paperId: string,
  completedPaperIds: readonly string[],
  inProgressPaperIds: readonly string[]
): PaperStatus {
  if (inProgressPaperIds.includes(paperId)) return 'in-progress'
  if (completedPaperIds.includes(paperId)) return 'completed'
  return 'not-started'
}

export interface InProgressPaper {
  paperId: string
  attempt: number
  title: string
  answered: number
}

export interface MaterialActivity {
  loading: boolean
  /** Server data was reachable (false → local-storage fallback). */
  serverAvailable: boolean
  /** Finished papers, all materials (D1, or local fallback). */
  completedTotal: number
  /** Finished papers in this material. */
  completedInMaterial: number
  /** ≥1 finished paper anywhere — the Live Test unlock. */
  hasCompleted: boolean
  /** ≥1 finished paper in this material — the Performance gate. */
  hasCompletedInMaterial: boolean
  /** Any attempt in this material — the Playlist gate. */
  hasStarted: boolean
  /** First genuinely in-progress attempt in this material, if any. */
  inProgress: InProgressPaper | null
  /** Finished paper ids in this material (D1, or local fallback) —
   * the paper-card badge source. */
  completedPaperIds: string[]
  /** Finished attempt numbers per paper id in this material (D1, or
   * local fallback) — the sequential-unlock source: which attempts
   * are completed, not just which papers. */
  completedAttempts: Record<string, number[]>
  /** Paper ids with saved answers in this material (browser only) —
   * the paper-card badge source. */
  inProgressPaperIds: string[]
}

interface ActivityResponse {
  completedTotal: number
  completedInMaterial: number
  hasCompleted: boolean
  hasCompletedInMaterial: boolean
  completedPaperIds: string[]
  completedAttempts: Record<string, number[]>
}

export function useMaterialActivity(slug: string) {
  const state = reactive<MaterialActivity>({
    loading: true,
    serverAvailable: false,
    completedTotal: 0,
    completedInMaterial: 0,
    hasCompleted: false,
    hasCompletedInMaterial: false,
    hasStarted: false,
    inProgress: null,
    completedPaperIds: [],
    completedAttempts: {},
    inProgressPaperIds: []
  })

  function localSnapshot() {
    const papers = papersForMaterial(slug)
    const paperIds = papers.map(p => p.id)
    const byId = new Map(papers.map(p => [p.id, p]))
    const localCompleted = listLocalResults(paperIds).length
    // Completed anywhere (fallback for the global "completed one test"
    // gate): scan every owned material's papers for a local result.
    let localTotal = 0
    for (const m of MATERIALS) {
      if (m.status !== 'owned') continue
      localTotal += listLocalResults(papersForMaterial(m.slug).map(p => p.id)).length
    }
    const raw = listInProgressAttempts(paperIds)
    const first = raw[0]
    const inProgress: InProgressPaper | null = first
      ? {
          paperId: first.paperId,
          attempt: first.attempt,
          title: byId.get(first.paperId)?.title ?? first.paperId,
          answered: first.answered
        }
      : null
    return {
      localCompleted,
      localTotal,
      inProgress,
      localCompletedIds: listLocalResults(paperIds).map(r => r.paperId),
      localCompletedAttempts: completedAttemptsFromLocal(listLocalResults(paperIds)),
      inProgressPaperIds: [...new Set(raw.map(a => a.paperId))]
    }
  }

  // Local snapshot is synchronous and SSR-safe (storage helpers catch),
  // so the paper badges render from real browser data on first paint
  // instead of flashing "Not started"; the server fetch in load()
  // refines the completed ids (e.g. tests finished on another device).
  const initial = localSnapshot()
  state.completedPaperIds = initial.localCompletedIds
  state.completedAttempts = initial.localCompletedAttempts
  state.inProgressPaperIds = initial.inProgressPaperIds

  async function load(): Promise<void> {
    const snap = localSnapshot()
    let server: ActivityResponse | null = null
    try {
      server = await $fetch<ActivityResponse>('/api/results/activity', { query: { material: slug } })
    } catch {
      server = null
    }
    if (server) {
      state.serverAvailable = true
      state.completedTotal = server.completedTotal
      state.completedInMaterial = server.completedInMaterial
      state.hasCompleted = server.hasCompleted
      state.hasCompletedInMaterial = server.hasCompletedInMaterial
      state.completedPaperIds = server.completedPaperIds ?? []
      state.completedAttempts = server.completedAttempts ?? {}
    } else {
      // No server store: the browser's local results are the only
      // record of finished tests.
      state.serverAvailable = false
      state.completedTotal = snap.localTotal
      state.completedInMaterial = snap.localCompleted
      state.hasCompleted = snap.localTotal > 0
      state.hasCompletedInMaterial = snap.localCompleted > 0
      state.completedPaperIds = snap.localCompletedIds
      state.completedAttempts = snap.localCompletedAttempts
    }
    // In-progress attempts exist only in this browser, never in D1.
    state.inProgressPaperIds = snap.inProgressPaperIds
    state.hasStarted = state.hasCompletedInMaterial || snap.localCompleted > 0 || snap.inProgress !== null
    state.inProgress = snap.inProgress
    state.loading = false
  }

  onMounted(() => { void load() })

  return state
}
