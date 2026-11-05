/**
 * POST /api/admin/users/role — promote/demote a user, admin-only.
 *
 * Body: { sub, role: 'admin' | 'user' }. The role lives on the D1
 * user row and takes effect on the user's next request (the /admin
 * guard re-resolves it every time). Users whose email is in the env
 * allowlist (NITRO_ADMIN_EMAILS) are always admins and cannot be
 * demoted here — 400 `bootstrap-admin`.
 */
import { getAdminEmails, getAdminSession } from '../../../utils/auth'
import { getRequestDb, getUserRow, setUserRole } from '../../../utils/user-store'

export default defineEventHandler(async (event) => {
  const admin = await getAdminSession(event)
  if (!admin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Admin session required.',
      data: { code: 'not-admin' }
    })
  }
  const body = await readBody<{ sub?: string, role?: string }>(event)
  const sub = (body.sub || '').trim()
  const role = body.role
  if (!sub || (role !== 'admin' && role !== 'user')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Body must be { sub, role: "admin" | "user" }.',
      data: { code: 'bad-request' }
    })
  }
  const db = getRequestDb(event)
  if (!db) {
    throw createError({
      statusCode: 503,
      statusMessage: 'User store is not available on this server.',
      data: { code: 'unavailable' }
    })
  }
  const row = await getUserRow(db, sub)
  if (!row) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found.',
      data: { code: 'not-found' }
    })
  }
  const email = (row.email || row.username || '').toLowerCase()
  if (getAdminEmails(event).includes(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'This account is always an admin (env allowlist).',
      data: { code: 'bootstrap-admin' }
    })
  }
  await setUserRole(db, sub, role)
  return { ok: true, sub, role }
})
