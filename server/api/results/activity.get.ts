/**
 * GET /api/results/activity — has this user completed / started any test?
 *
 * The single source the new-user gates read (dashboard Continue /
 * Playlist / Live Test cards, the Live Test page banner, the
 * Performance page). A "completed test" is a finished paper: a row in
 * D1 `test_results` for this user (kind 'simulation' or 'drill',
 * valid correct/total). The free test is never submitted to D1, so it
 * never counts here; live tests are never submitted either.
 *
 * ?material=<slug> (optional): when given, the response also counts
 * completed results in that material (400 unknown material, 403 no
 * access — same rules as GET /api/leaderboard). `completedPaperIds`
 * lists the finished paper ids (same scope as the counts) so paper
 * cards can derive their badge from real data instead of the old
 * hardcoded catalog status.
 *
 * 401 when not signed in; 503 when the results store is not
 * available on this server (plain `pnpm dev` has no D1 binding, or
 * migration 0006 has not been applied to the local file). Callers
 * fall back to the browser's local results store on 503 (see
 * app/composables/useActivity.ts).
 */
import { getUserSession } from '../../utils/auth'
import { getRequestDb } from '../../utils/user-store'
import { isKnownMaterial } from '../../utils/catalog'

const VALID_ROW = `kind IN ('simulation', 'drill') AND correct IS NOT NULL AND total IS NOT NULL AND total > 0`

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
  if (material && !isKnownMaterial(material)) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown material.', data: { code: 'bad-input' } })
  }
  if (material && !session.materials.includes(material)) {
    throw createError({ statusCode: 403, statusMessage: 'No access to this material.', data: { code: 'no-access' } })
  }
  try {
    const total = await db.prepare(
      `SELECT COUNT(*) AS n FROM test_results WHERE user_sub = ?1 AND ${VALID_ROW}`
    ).bind(session.sub).first<{ n: number }>()
    let inMaterial = 0
    if (material) {
      const row = await db.prepare(
        `SELECT COUNT(*) AS n FROM test_results WHERE user_sub = ?1 AND material_slug = ?2 AND ${VALID_ROW}`
      ).bind(session.sub, material).first<{ n: number }>()
      inMaterial = row?.n ?? 0
    }
    const completedTotal = total?.n ?? 0
    const ids = await db.prepare(
      `SELECT DISTINCT paper_id AS id FROM test_results WHERE user_sub = ?1 ${material ? 'AND material_slug = ?2' : ''} AND ${VALID_ROW}`
    ).bind(...(material ? [session.sub, material] : [session.sub])).all<{ id: string }>()
    const completedPaperIds = (ids.results ?? []).map(r => r.id)
    return {
      completedTotal,
      completedInMaterial: inMaterial,
      hasCompleted: completedTotal > 0,
      hasCompletedInMaterial: inMaterial > 0,
      completedPaperIds
    }
  } catch (e) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e
    throw createError({
      statusCode: 503,
      statusMessage: `Results store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
})
