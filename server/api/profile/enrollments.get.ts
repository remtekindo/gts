/**
 * GET /api/profile/enrollments — this user's real grant rows.
 *
 * What the Profile → Enroll tab renders: one row per grant, with
 * the date it was granted. Material grants open one material;
 * package grants open the materials that package covers (server
 * default mapping in server/utils/catalog.ts). Role-based access
 * (e.g. the bootstrap admin) is NOT a grant and never appears here.
 *
 * 401 when not signed in; 503 when the grants store is not
 * available on this server (plain `pnpm dev` has no D1 binding).
 */
import { getUserSession } from '../../utils/auth'
import { getRequestDb } from '../../utils/user-store'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Sign-in required.', data: { code: 'not-signed-in' } })
  }
  const db = getRequestDb(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Grants store is not available on this server.', data: { code: 'unavailable' } })
  }
  try {
    const res = await db.prepare(
      'SELECT kind, target, granted_at FROM grants WHERE user_sub = ?1 ORDER BY granted_at ASC'
    ).bind(session.sub).all<{ kind: string, target: string, granted_at: string }>()
    return {
      grants: (res.results || []).map(r => ({
        kind: r.kind as 'material' | 'package',
        target: r.target,
        grantedAt: r.granted_at
      }))
    }
  } catch (e) {
    throw createError({
      statusCode: 503,
      statusMessage: `Grants store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
})
