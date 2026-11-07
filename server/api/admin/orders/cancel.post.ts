/**
 * POST /api/admin/orders/cancel — cancel a pending or
 * proof-uploaded order, admin-only.
 *
 * Body: { id }. Only a `pending_payment` or `proof_uploaded` order
 * can be cancelled (no grants are created). Cancelling an active,
 * already-cancelled, or expired order is a 400.
 */
import { getAdminSession } from '../../../utils/auth'
import { getRequestDb } from '../../../utils/user-store'
import { cancelOrder } from '../../../utils/orders'

export default defineEventHandler(async (event) => {
  const admin = await getAdminSession(event)
  if (!admin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Admin session required.',
      data: { code: 'not-admin' }
    })
  }
  const body = await readBody<{ id?: unknown }>(event)
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Body must be { id }.', data: { code: 'bad-request' } })
  }
  const db = getRequestDb(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Orders store is not available on this server.', data: { code: 'unavailable' } })
  }
  try {
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
