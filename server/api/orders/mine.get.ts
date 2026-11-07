/**
 * GET /api/orders/mine — this user's orders, newest first.
 *
 * What Profile → Pesanan Saya renders. 401 when not signed in;
 * 503 when the orders store is not available on this server
 * (plain `pnpm dev` has no D1 binding).
 */
import { getUserSession } from '../../utils/auth'
import { getRequestDb } from '../../utils/user-store'
import { listOrdersForUser } from '../../utils/orders'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Sign-in required.', data: { code: 'not-signed-in' } })
  }
  const db = getRequestDb(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Orders store is not available on this server.', data: { code: 'unavailable' } })
  }
  try {
    return { orders: await listOrdersForUser(db, session.sub) }
  } catch (e) {
    throw createError({
      statusCode: 503,
      statusMessage: `Orders store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
})
