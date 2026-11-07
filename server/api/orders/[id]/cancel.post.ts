/**
 * POST /api/orders/:id/cancel — cancel your own pending order.
 *
 * The "Batalkan pesanan" link on the checkout QRIS screen. The
 * order must belong to the signed-in user and be `pending_payment`
 * or `proof_uploaded`. Active, cancelled, or expired orders cannot
 * be cancelled here.
 *
 * 401 when not signed in; 403 when the order belongs to someone
 * else; 404 when the order does not exist; 400 when it cannot be
 * cancelled; 503 when the orders store is not available.
 */
import { getUserSession } from '../../../utils/auth'
import { getRequestDb } from '../../../utils/user-store'
import { cancelOrder, getOrder } from '../../../utils/orders'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Sign-in required.', data: { code: 'not-signed-in' } })
  }
  const id = getRouterParam(event, 'id') || ''
  const db = getRequestDb(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Orders store is not available on this server.', data: { code: 'unavailable' } })
  }
  try {
    const existing = await getOrder(db, id)
    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'Order not found.', data: { code: 'not-found' } })
    }
    if (existing.userSub !== session.sub) {
      throw createError({ statusCode: 403, statusMessage: 'This order belongs to another user.', data: { code: 'forbidden' } })
    }
    const res = await cancelOrder(db, id)
    if (!res.ok) {
      if (res.reason === 'not-found') {
        throw createError({ statusCode: 404, statusMessage: 'Order not found.', data: { code: 'not-found' } })
      }
      throw createError({ statusCode: 400, statusMessage: 'Only a pending order can be cancelled.', data: { code: 'not-pending' } })
    }
    return { order: res.order }
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode) throw e
    throw createError({
      statusCode: 503,
      statusMessage: `Orders store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
})
