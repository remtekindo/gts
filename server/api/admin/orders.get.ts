/**
 * GET /api/admin/orders — all orders, newest first, admin-only.
 *
 * What Admin → Pesanan renders: package, materials, price, status,
 * date, and the buyer's email/name. 401 when not an admin session;
 * 503 when the orders store is not available on this server
 * (plain `pnpm dev` has no D1 binding).
 */
import { getAdminSession } from '../../utils/auth'
import { getRequestDb } from '../../utils/user-store'
import { listAllOrders } from '../../utils/orders'

export default defineEventHandler(async (event) => {
  const admin = await getAdminSession(event)
  if (!admin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Admin session required.',
      data: { code: 'not-admin' }
    })
  }
  const db = getRequestDb(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Orders store is not available on this server.', data: { code: 'unavailable' } })
  }
  try {
    return { orders: await listAllOrders(db) }
  } catch (e) {
    throw createError({
      statusCode: 503,
      statusMessage: `Orders store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
})
