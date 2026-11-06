/**
 * POST /api/quests/claim — claim 50 points for one completed Weekly Quest.
 *
 * Body: { questId: 'sim' | 'score700' | 'drills' }. The server
 * re-checks completion from D1 results for the current week — a
 * quest pays only once per week, and only after the claim. The
 * points count in the month they are claimed.
 *
 * 401 when not signed in; 400 on an unknown quest; 409 when the
 * quest is not complete this week (`not-complete`) or was already
 * claimed (`already-claimed`); 503 when the store is not available.
 */
import { getUserSession } from '../../utils/auth'
import { getRequestDb } from '../../utils/user-store'
import { QUEST_POINTS, currentWeekStart, isQuestId, questStatus } from '../../utils/leaderboard'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Sign-in required.', data: { code: 'not-signed-in' } })
  }
  const db = getRequestDb(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Results store is not available on this server.', data: { code: 'unavailable' } })
  }
  const body = await readBody(event).catch(() => null) as Record<string, unknown> | null
  const questId = typeof body?.questId === 'string' ? body.questId : ''
  if (!isQuestId(questId)) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown quest.', data: { code: 'bad-input' } })
  }
  const weekStart = currentWeekStart()
  try {
    const quests = await questStatus(db, session.sub, weekStart)
    const quest = quests.find(q => q.id === questId) as { done: boolean, claimed: boolean } | undefined
    if (!quest?.done) {
      throw createError({ statusCode: 409, statusMessage: 'Quest is not complete this week.', data: { code: 'not-complete' } })
    }
    if (quest.claimed) {
      throw createError({ statusCode: 409, statusMessage: 'Quest was already claimed this week.', data: { code: 'already-claimed' } })
    }
    await db.prepare(
      'INSERT INTO quest_claims (user_sub, quest_id, week_start, points) VALUES (?1, ?2, ?3, ?4)'
    ).bind(session.sub, questId, weekStart, QUEST_POINTS).run()
    return { ok: true, questId, points: QUEST_POINTS, weekStart }
  } catch (e) {
    if (e && typeof e === 'object' && 'statusCode' in e) throw e
    throw createError({
      statusCode: 503,
      statusMessage: `Results store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
})
