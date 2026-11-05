/**
 * POST /api/auth/logout — clears the session cookie.
 * Best-effort from the client; always returns ok.
 */
import { clearSessionCookie } from '../../utils/auth'

export default defineEventHandler((event) => {
  clearSessionCookie(event)
  return { ok: true }
})
