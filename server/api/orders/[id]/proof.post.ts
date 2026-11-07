/**
 * POST /api/orders/:id/proof — upload a payment proof, owner only.
 *
 * Body: { image: string } — a base64 data URL (JPEG/PNG/WebP,
 * max ~500 KB after the client-side compression). The order must
 * belong to the signed-in user and be `pending_payment` or
 * `proof_uploaded` (re-upload replaces the earlier proof) and NOT
 * expired — uploading to an expired order is a 400 "Waktu
 * pembayaran habis". On success the order becomes
 * `proof_uploaded` with `proof_uploaded_at` set.
 *
 * 401 when not signed in; 403 when the order belongs to someone
 * else; 404 when the order does not exist; 400 on bad input;
 * 503 when the orders store is not available on this server.
 */
import { getUserSession } from '../../../utils/auth'
import { getRequestDb } from '../../../utils/user-store'
import { getOrder, uploadProof } from '../../../utils/orders'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Sign-in required.', data: { code: 'not-signed-in' } })
  }
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody<{ image?: unknown }>(event)
  if (typeof body.image !== 'string' || !body.image) {
    throw createError({ statusCode: 400, statusMessage: 'Body must be { image }.', data: { code: 'bad-request' } })
  }
  const db = getRequestDb(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Orders store is not available on this server.', data: { code: 'unavailable' } })
  }
  try {
    const existing = await getOrder(db, id)
    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'Order not found.', data: { code: 'not-found' } })
    }
    if (existing.userSub !== session.sub && session.role !== 'admin') {
      throw createError({ statusCode: 403, statusMessage: 'This order belongs to another user.', data: { code: 'forbidden' } })
    }
    const res = await uploadProof(db, id, body.image)
    if (!res.ok) {
      if (res.reason === 'not-found') {
        throw createError({ statusCode: 404, statusMessage: 'Order not found.', data: { code: 'not-found' } })
      }
      if (res.reason === 'expired') {
        throw createError({ statusCode: 400, statusMessage: 'Waktu pembayaran habis.', data: { code: 'expired' } })
      }
      if (res.reason === 'too-large') {
        throw createError({ statusCode: 400, statusMessage: 'Bukti bayar terlalu besar (maks ~500 KB).', data: { code: 'too-large' } })
      }
      if (res.reason === 'bad-image') {
        throw createError({ statusCode: 400, statusMessage: 'Bukti bayar harus berupa gambar.', data: { code: 'bad-image' } })
      }
      throw createError({ statusCode: 400, statusMessage: 'Only a pending order can take a payment proof.', data: { code: 'not-pending' } })
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
