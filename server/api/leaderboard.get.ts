/**
 * GET /api/leaderboard — the two-tier board, real users only.
 *
 * ?scope=global (default) &month=YYYY-MM (default: current UTC month)
 *   Monthly competition: rank by total monthly points
 *   (test points capped at 500 + claimed quest points + streak
 *   points). Rows: rank, masked name, points, streak. The caller's
 *   own position is in `me`, plus per-material best accuracy for the
 *   hub "Your scores" chips.
 * ?scope=material &material=<slug>
 *   All-time mastery board for one material: rank by average
 *   best-attempt accuracy on full simulations; a user appears only
 *   after completing ≥1 full simulation there. Rows: rank, masked
 *   name, accuracy %, full simulations completed.
 *
 * The formula lives in server/utils/leaderboard.ts (tie-breaks
 * documented there). Names are masked — emails are never exposed.
 * 401 when not signed in; 403 when the material is not open to the
 * caller; 503 when the results store is not available on this server
 * (plain `pnpm dev` has no D1 binding, or migration 0006 has not
 * been applied to the local file).
 */
import { getUserSession } from '../utils/auth'
import { getRequestDb } from '../utils/user-store'
import { isKnownMaterial } from '../utils/catalog'
import { computeGlobalBoard, computeMaterialBoard, currentMonthKey, isMonthKey } from '../utils/leaderboard'

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
  const scope = q.scope === 'material' ? 'material' : 'global'
  try {
    if (scope === 'material') {
      const material = typeof q.material === 'string' ? q.material : ''
      if (!isKnownMaterial(material)) {
        throw createError({ statusCode: 400, statusMessage: 'Unknown material.', data: { code: 'bad-input' } })
      }
      if (!session.materials.includes(material)) {
        throw createError({ statusCode: 403, statusMessage: 'No access to this material.', data: { code: 'no-access' } })
      }
      return await computeMaterialBoard(db, material, session.sub)
    }
    const rawMonth = typeof q.month === 'string' ? q.month : ''
    const month = isMonthKey(rawMonth) ? rawMonth : currentMonthKey()
    return await computeGlobalBoard(db, month, session.sub)
  } catch (e) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e
    throw createError({
      statusCode: 503,
      statusMessage: `Results store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
})
