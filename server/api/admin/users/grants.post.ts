/**
 * POST /api/admin/users/grants — replace a user's grants, admin-only.
 *
 * Body: { sub, materials: string[], packages: string[] }. Grants are
 * replaced wholesale (the panel sends the full checkbox state).
 * Targets are validated against the server catalog — unknown slugs
 * are dropped silently. A material grant opens one material; a
 * package grant opens the materials that package covers.
 */
import { getAdminSession } from '../../../utils/auth'
import { getRequestDb, setGrants } from '../../../utils/user-store'

export default defineEventHandler(async (event) => {
  const admin = await getAdminSession(event)
  if (!admin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Admin session required.',
      data: { code: 'not-admin' }
    })
  }
  const body = await readBody<{ sub?: string, materials?: unknown, packages?: unknown }>(event)
  const sub = (body.sub || '').trim()
  if (!sub) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Body must be { sub, materials, packages }.',
      data: { code: 'bad-request' }
    })
  }
  const materials = Array.isArray(body.materials) ? body.materials.filter((s): s is string => typeof s === 'string') : []
  const packages = Array.isArray(body.packages) ? body.packages.filter((s): s is string => typeof s === 'string') : []
  const db = getRequestDb(event)
  if (!db) {
    throw createError({
      statusCode: 503,
      statusMessage: 'User store is not available on this server.',
      data: { code: 'unavailable' }
    })
  }
  const ok = await setGrants(db, sub, { materials, packages }, admin.email)
  if (!ok) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.',
      data: { code: 'not-found' }
    })
  }
  return { ok: true, sub, materials, packages }
})
