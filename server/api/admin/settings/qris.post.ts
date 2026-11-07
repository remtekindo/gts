/**
 * POST /api/admin/settings/qris — set (or clear) the merchant QRIS image, admin-only.
 *
 * Body: { image: string | null } — a base64 data URL (image/jpeg,
 * image/png, or image/webp, max ~500 KB) uploaded on Admin →
 * Finance, or null/empty to remove the QRIS image. Stored in the
 * `settings` table under key `qris_image`; served publicly by
 * GET /api/settings/qris.
 */
import { getAdminSession } from '../../../utils/auth'
import { getRequestDb } from '../../../utils/user-store'
import { deleteSetting, setSetting } from '../../../utils/settings'

export default defineEventHandler(async (event) => {
  const admin = await getAdminSession(event)
  if (!admin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Admin session required.',
      data: { code: 'not-admin' }
    })
  }
  const body = await readBody<{ image?: unknown }>(event)
  const db = getRequestDb(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Settings store is not available on this server.', data: { code: 'unavailable' } })
  }
  try {
    const image = body.image
    if (image === null || image === '' || image === undefined) {
      await deleteSetting(db, 'qris_image')
      return { ok: true, image: null }
    }
    if (typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) {
      throw createError({ statusCode: 400, statusMessage: 'Image must be a base64 data URL (JPEG, PNG, or WebP).', data: { code: 'bad-image' } })
    }
    const b64 = image.slice(image.indexOf(',') + 1)
    const bytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0)
    if (bytes > 500 * 1024) {
      throw createError({ statusCode: 400, statusMessage: 'Image is too large (max ~500 KB).', data: { code: 'too-large' } })
    }
    await setSetting(db, 'qris_image', image)
    return { ok: true, image }
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode) throw e
    throw createError({
      statusCode: 503,
      statusMessage: `Settings store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
})
