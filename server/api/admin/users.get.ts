/**
 * GET /api/admin/users — real (Google sign-in) users, admin-only.
 *
 * Lists every user row in D1 with their role, grants, and effective
 * access (resolved server-side). 503 when the user store is not
 * available on this server (plain `pnpm dev` has no D1 binding).
 */
import { getAdminEmails, getAdminSession } from '../../utils/auth'
import { getRequestDb, listRealUsers } from '../../utils/user-store'

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
    throw createError({
      statusCode: 503,
      statusMessage: 'User store is not available on this server.',
      data: { code: 'unavailable' }
    })
  }
  try {
    return { users: await listRealUsers(db, getAdminEmails(event)) }
  } catch (e) {
    // The binding exists but the users/grants tables are missing (a
    // fresh pages-dev file starts with no tables) — say so plainly
    // instead of a bare 500. Apply the migrations to that file
    // (README § Local D1 check).
    throw createError({
      statusCode: 503,
      statusMessage: `User store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
})
