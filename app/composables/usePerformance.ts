/**
 * Client-side performance data for one material.
 *
 * Reads GET /api/performance?material=<slug> (the server derives it
 * from D1 `test_results`); when the server store is unreachable
 * (plain `pnpm dev`, or D1 down) the browser's local results are the
 * fallback (see buildLocalPerformance in app/utils/performance.ts —
 * one point per paper at most, since localStorage keeps only the
 * latest result per paper).
 *
 * The score is the BEST Full Simulation's accuracy mapped to the
 * TOEIC LR scale (round5, labeled "estimasi"); with drills only
 * there is a journey but no score and no CEFR. Skills come from the
 * most recent simulation's per-part breakdown; without one the
 * radar/skills stay empty, honestly.
 */
import { buildLocalPerformance } from '~/utils/performance'
import type { PerformanceData } from '~/utils/performance'

export interface MaterialPerformance extends PerformanceData {
  loading: boolean
  /** Server data was reachable (false → local-storage fallback). */
  serverAvailable: boolean
}

export function useMaterialPerformance(slug: string) {
  const state = reactive<MaterialPerformance>({
    loading: true,
    serverAvailable: false,
    bestSim: null,
    latestSim: null,
    skills: null,
    attempts: []
  })

  async function load(): Promise<void> {
    let server: PerformanceData | null = null
    try {
      server = await $fetch<PerformanceData>('/api/performance', { query: { material: slug } })
    } catch {
      server = null
    }
    if (server) {
      state.serverAvailable = true
      state.bestSim = server.bestSim
      state.latestSim = server.latestSim
      state.skills = server.skills
      state.attempts = server.attempts
    } else {
      state.serverAvailable = false
      const local = buildLocalPerformance(slug)
      state.bestSim = local.bestSim
      state.latestSim = local.latestSim
      state.skills = local.skills
      state.attempts = local.attempts
    }
    state.loading = false
  }

  onMounted(() => { void load() })

  return state
}
