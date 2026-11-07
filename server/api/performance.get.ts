/**
 * GET /api/performance?material=<slug> — this user's real performance
 * in one material: best Full Simulation (score + CEFR), the journey
 * (one point per completed attempt), and the skill breakdown from the
 * most recent simulation that carries per-part data.
 *
 * The score is the BEST full simulation's accuracy mapped linearly to
 * the TOEIC LR scale (round5(10 + accuracy × 980), labeled "estimasi"
 * in the UI); CEFR follows the official ETS total bands. A user with
 * drills only gets a journey but no score and no CEFR — the same rule
 * as the per-material leaderboard board, which also requires ≥1 full
 * simulation. Per-part data comes from the nullable `breakdown`
 * column (migration 0007); older rows without one simply have no
 * radar/skills. Free tests and live tests are never submitted, so
 * they never count here.
 *
 * 401 when not signed in; 400 unknown material; 403 no access to the
 * material; 503 when the results store is not available on this
 * server (plain `pnpm dev` has no D1 binding, or migration 0006/0007
 * has not been applied to the local file). Callers fall back to the
 * browser's local results store on 503 (see
 * app/composables/usePerformance.ts).
 */
import { getUserSession } from '../utils/auth'
import { getRequestDb } from '../utils/user-store'
import { isKnownMaterial } from '../utils/catalog'
import { buildPerformance, parseBreakdown } from '../utils/performance'
import type { PerfRow } from '../utils/performance'

const VALID_ROW = `kind IN ('simulation', 'drill') AND correct IS NOT NULL AND total IS NOT NULL AND total > 0`

interface ResultRow {
  paper_id: string
  kind: string
  correct: number
  total: number
  created_at: string
  breakdown: string | null
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Sign-in required.', data: { code: 'not-signed-in' } })
  }
  const db = getRequestDb(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Results store is not available on this server.', data: { code: 'unavailable' } })
  }
  const q = getQuery(event)
  const material = typeof q.material === 'string' ? q.material : ''
  if (!isKnownMaterial(material)) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown material.', data: { code: 'bad-input' } })
  }
  if (!session.materials.includes(material)) {
    throw createError({ statusCode: 403, statusMessage: 'No access to this material.', data: { code: 'no-access' } })
  }
  try {
    const res = await db.prepare(
      `SELECT paper_id, kind, correct, total, created_at, breakdown FROM test_results
       WHERE user_sub = ?1 AND material_slug = ?2 AND ${VALID_ROW}
       ORDER BY created_at ASC`
    ).bind(session.sub, material).all<ResultRow>()
    const rows: PerfRow[] = (res.results ?? []).map(r => ({
      paperId: r.paper_id,
      kind: r.kind === 'simulation' ? 'simulation' : 'drill',
      correct: r.correct,
      total: r.total,
      date: r.created_at.replace(' ', 'T') + 'Z',
      breakdown: parseBreakdown(r.breakdown)
    }))
    return buildPerformance(rows, material)
  } catch (e) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e
    throw createError({
      statusCode: 503,
      statusMessage: `Results store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
})
