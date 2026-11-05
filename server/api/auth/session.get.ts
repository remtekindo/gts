/**
 * GET /api/auth/session — who is this request, server-side?
 *
 * Returns the signed-in user (identity + role + effective access, all
 * resolved server-side) and makes sure the visitor has an anonymous id
 * cookie (`gts_sid`, minted here if missing). The client calls this on
 * the Live Test page so the generate endpoint can tell repeat visitors
 * apart for rate limiting, and on the materials hub / material pages
 * to render locked vs open materials.
 * The `gts_auth` localStorage value is UI-only and is never trusted
 * here: only the httpOnly `gts_session` cookie counts.
 */
import { getUserSession, ensureAnonSid } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  await ensureAnonSid(event)
  if (!session) {
    return { admin: false, username: null, email: null, name: null, picture: null, role: 'user', materials: [], packages: [] }
  }
  return {
    admin: session.role === 'admin',
    username: session.email,
    email: session.email,
    name: session.name,
    picture: session.picture,
    role: session.role,
    materials: session.materials,
    packages: session.packages
  }
})
