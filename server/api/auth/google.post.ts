/**
 * POST /api/auth/google — Google Sign-In for EVERYONE (admin + learner).
 *
 * The client (Google Identity Services) POSTs the ID token it received
 * from Google. The server verifies the token — signature against
 * Google's JWKS, audience = our Client ID, issuer, expiry, verified
 * email — and only then trusts the identity. The role is NOT taken
 * from the client: it is resolved server-side (env allowlist for the
 * bootstrap admin, D1 user row + grants for everyone else).
 *
 * On success the endpoint upserts the user row in D1 (first sign-in
 * creates the account) and mints the httpOnly `gts_session` cookie
 * (24h, or 30d with remember).
 *
 * Env:  NUXT_PUBLIC_GOOGLE_CLIENT_ID (the Glots OAuth client),
 *       NITRO_ADMIN_EMAILS (comma-separated bootstrap admins,
 *       default remtekindo@gmail.com),
 *       NITRO_SESSION_SECRET (HMAC key for the session cookie).
 *
 * Responses:
 * - 200 { ok, email, name, picture, role, materials, packages, expiresAt }
 *   + httpOnly `gts_session` cookie.
 * - 401 { code: 'bad-token' } — malformed token, bad signature, or a
 *   claim check failed (wrong audience/issuer, expired, unverified email).
 * - 503 { code: 'unavailable' } — Google sign-in not configured, or
 *   Google's keys could not be fetched (fail closed).
 *
 * Test-only: NITRO_GOOGLE_JWKS_URL overrides the JWKS endpoint, and is
 * honored ONLY for localhost requests (local verification with a test
 * key set). It is ignored everywhere else — never set it in production.
 */
import { verifyGoogleIdToken } from '../../utils/google-auth'
import { getAdminEmails, mintUserToken, setSessionCookie } from '../../utils/auth'
import { getRequestDb, resolveAccess, upsertUser } from '../../utils/user-store'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ credential?: string, remember?: boolean }>(event)
  const config = useRuntimeConfig(event)
  const pub = config.public as Record<string, unknown>
  const clientId = (pub.googleClientId as string) || ''
  const secret = (config.sessionSecret as string) || ''
  if (!clientId || !secret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Google sign-in is not configured on this server.',
      data: { code: 'unavailable' }
    })
  }
  const credential = (body.credential || '').trim()
  if (!credential) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing Google credential.',
      data: { code: 'bad-token' }
    })
  }
  const host = getRequestHost(event) || ''
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('[::1]')
  const jwksOverride = (config.googleJwksUrl as string) || ''
  if (jwksOverride && !isLocal) {
    console.warn('[auth] NITRO_GOOGLE_JWKS_URL is set but ignored for non-localhost requests.')
  }
  const result = await verifyGoogleIdToken(credential, {
    clientId,
    jwksUrl: isLocal && jwksOverride ? jwksOverride : undefined
  })
  if (!result.ok) {
    throw createError({
      statusCode: result.code === 'unavailable' ? 503 : 401,
      statusMessage: result.code === 'unavailable' ? 'Could not verify the Google sign-in.' : 'Invalid Google credential.',
      data: { code: result.code }
    })
  }
  const identity = result.identity
  const db = getRequestDb(event)
  await upsertUser(db, identity)
  const bootstrap = getAdminEmails(event).includes(identity.email.toLowerCase())
  const access = await resolveAccess(db, identity, bootstrap)
  const maxAge = body.remember ? 30 * 86400 : 86400
  const { token, expiresAt } = await mintUserToken(secret, identity, maxAge)
  setSessionCookie(event, token, maxAge)
  return {
    ok: true,
    email: identity.email,
    name: identity.name ?? null,
    picture: identity.picture ?? null,
    role: access.role,
    materials: access.materials,
    packages: access.packages,
    expiresAt
  }
})
