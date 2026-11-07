/**
 * POST /api/orders — create a pending order (signed-in users).
 *
 * Body: { package, materials }. The price is NEVER taken from the
 * client: it is computed server-side from the shared price table
 * (app/utils/pricing.ts). Material count must match the package
 * (Bulanan 1, Triwulanan 2, Semesteran all owned materials) and
 * every slug must exist in the catalog. The order starts as
 * `pending_payment` — materials unlock only when an admin approves
 * it (POST /api/admin/orders/approve).
 *
 * 401 when not signed in; 400 on bad input; 503 when the orders
 * store is not available on this server (plain `pnpm dev` has no
 * D1 binding).
 */
import { getUserSession } from '../utils/auth'
import { getRequestDb } from '../utils/user-store'
import { createOrder, validateOrderDraft } from '../utils/orders'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Sign-in required.', data: { code: 'not-signed-in' } })
  }
  const body = await readBody<{ package?: unknown, materials?: unknown, price?: unknown }>(event)
  const checked = validateOrderDraft(body.package, body.materials)
  if (!checked.ok) {
    throw createError({ statusCode: 400, statusMessage: checked.message, data: { code: checked.code } })
  }
  const db = getRequestDb(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Orders store is not available on this server.', data: { code: 'unavailable' } })
  }
  try {
    const order = await createOrder(db, session.sub, checked.pkg, checked.materials)
    return { order }
  } catch (e) {
    throw createError({
      statusCode: 503,
      statusMessage: `Orders store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
})
