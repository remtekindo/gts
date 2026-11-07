/**
 * GET /api/settings/qris — the merchant QRIS image (public).
 *
 * A merchant QR is public by nature (it is meant to be scanned),
 * so this needs no auth. Returns `{ image: string | null }` — a
 * base64 data URL set by an admin on Admin → Finance, or null when
 * none is configured (the checkout page then shows an honest
 * placeholder instead of a fake QR). 503 when the settings store
 * is not available on this server (plain `pnpm dev` has no D1
 * binding).
 */
import { getRequestDb } from '../../utils/user-store'
import { getSetting } from '../../utils/settings'

export default defineEventHandler(async (event) => {
  const db = getRequestDb(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Settings store is not available on this server.', data: { code: 'unavailable' } })
  }
  try {
    return { image: await getSetting(db, 'qris_image') }
  } catch (e) {
    throw createError({
      statusCode: 503,
      statusMessage: `Settings store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
})
