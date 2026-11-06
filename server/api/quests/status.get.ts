/**
 * GET /api/quests/status — this week's Weekly Quest progress.
 *
 * Completion is derived from D1 results only (never from the client):
 * - sim: ≥1 full simulation completed this week.
 * - score700: any paper with predicted score ≥ 700 this week.
 * - drills: ≥3 distinct drill packs completed this week.
 * The week starts Monday 00:00 UTC. `claimed` says whether the
 * 50 points were already claimed (see POST /api/quests/claim).
 * 401 when not signed in; 503 when the store is not available.
 */
import { getUserSession } from '../../utils/auth'
import { getRequestDb } from '../../utils/user-store'
import { currentWeekStart, questStatus } from '../../utils/leaderboard'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Sign-in required.', data: { code: 'not-signed-in' } })
  }
  const db = getRequestDb(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Results store is not available on this server.', data: { code: 'unavailable' } })
  }
  const weekStart = currentWeekStart()
  try {
    const quests = await questStatus(db, session.sub, weekStart)
    return { weekStart, quests }
  } catch (e) {
    throw createError({
      statusCode: 503,
      statusMessage: `Results store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
})
