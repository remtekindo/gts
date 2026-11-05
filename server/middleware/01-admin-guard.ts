/**
 * Server-side guard for /admin pages.
 *
 * The admin layout also checks the session in the browser, but
 * that is UI-only: anyone can forge localStorage. This middleware
 * is the real gate — a direct load, refresh, or curl of any /admin
 * page without a valid admin session redirects to
 * /auth before any admin HTML is served. The admin role is resolved
 * per request (env allowlist + D1 user row), so promoting or
 * demoting a user in Admin → Users takes effect immediately.
 * Client-side navigation inside the app never hits this middleware;
 * the admin layout's own session check covers that path.
 */
import { getAdminSession } from '../utils/auth'

export default defineEventHandler(async (event) => {
  const path = getRequestPath(event)
  if (!path.startsWith('/admin')) return
  const admin = await getAdminSession(event)
  if (admin) return
  await sendRedirect(event, `/auth?next=${encodeURIComponent(path)}`, 302)
})
