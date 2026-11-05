/**
 * Server-side auth — sessions + anonymous visitor ids.
 *
 * Sign-in is Google Sign-In (see server/api/auth/google.post.ts and
 * server/utils/google-auth.ts). The session cookie `gts_session` carries
 * the verified Google identity (sub, email, name, picture) as a signed
 * token — never a role. The role and material access are resolved per
 * request from the D1 user store + the env allowlist (see
 * server/utils/user-store.ts), so promoting/demoting a user or changing
 * a grant takes effect immediately, even with a live session.
 *
 * Two session kinds:
 * 1. User session (cookie `gts_session`): minted only by POST
 *    /api/auth/google after the ID token verifies. Token format:
 *    `v1.<base64url(JSON identity)>.<exp>.<hex-hmac>` where the HMAC
 *    covers `user:<payload>:<exp>` with NITRO_SESSION_SECRET.
 *    The cookie is httpOnly; the client never sees the token.
 * 2. Anonymous visitor id (cookie `gts_sid`): minted by GET
 *    /api/auth/session for any visitor. It is NOT an identity —
 *    anyone can get one — it only exists so the live-test rate
 *    limiter can tell repeat visitors apart, next to the client IP.
 *
 * The bootstrap admin allowlist is NITRO_ADMIN_EMAILS (comma-separated,
 * default remtekindo@gmail.com). Those emails are always admins, even
 * when D1 is unreachable; everyone else's admin status comes from the
 * D1 user row (set in Admin → Users).
 *
 * Crypto uses the global Web Crypto API on purpose: it works in
 * Node (dev server), in Cloudflare Workers (Pages Functions), and
 * in the browser, with no node:crypto compatibility flag needed.
 * No Buffer is used either (not available in Workers without
 * nodejs_compat): base64url is done with btoa/atob.
 */
import type { H3Event } from 'h3'
import { getRequestDb, resolveAccess } from './user-store'

export const SESSION_COOKIE = 'gts_session'
export const SID_COOKIE = 'gts_sid'

/** Verified Google identity, as carried (signed) in the session token. */
export interface UserIdentity {
  sub: string
  email: string
  name?: string | null
  picture?: string | null
}

/** A signed-in user: identity + role/access resolved for this request. */
export interface UserSession extends UserIdentity {
  role: 'admin' | 'user'
  materials: string[]
  packages: string[]
}

/* ------------------------------------------------------------------ */
/* Small byte helpers                                                  */
/* ------------------------------------------------------------------ */

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = ''
  bytes.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function base64UrlToBytes(s: string): Uint8Array {
  const bin = atob(s.replaceAll('-', '+').replaceAll('_', '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time string comparison (no early exit on first mismatch). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/* ------------------------------------------------------------------ */
/* WebCrypto primitives                                                */
/* ------------------------------------------------------------------ */

async function hmacKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

async function hmacSignHex(secret: string, data: string): Promise<string> {
  const key = await hmacKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return bytesToHex(new Uint8Array(sig))
}

async function hmacVerifyHex(secret: string, data: string, sigHex: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(sigHex)) return false
  // Re-sign and compare in constant time instead of subtle.verify:
  // subtle.verify's BufferSource typing fights TS here, and the
  // comparison is what matters.
  const expected = await hmacSignHex(secret, data)
  return safeEqual(expected, sigHex.toLowerCase())
}

/* ------------------------------------------------------------------ */
/* Secrets                                                             */
/* ------------------------------------------------------------------ */

/** Per-process fallback secret, used ONLY for anonymous visitor ids. */
let processSecret: string | null = null

/**
 * Signing secret. Prefers NITRO_SESSION_SECRET. Without it, falls
 * back to a random per-process secret (anonymous sessions then do
 * not survive a restart) and warns once. Google sign-in additionally
 * requires the configured secret — see google.post.ts.
 */
export function getSessionSecret(event: H3Event): string {
  const configured = (useRuntimeConfig(event).sessionSecret as string) || ''
  if (configured) return configured
  if (!processSecret) {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    processSecret = bytesToHex(bytes)
    console.warn('[auth] NITRO_SESSION_SECRET is not set — using a per-process random secret. Set the env var so sessions survive restarts.')
  }
  return processSecret
}

/** Bootstrap admin emails, lowercase. Default: the owner's address. */
export function getAdminEmails(event: H3Event): string[] {
  const raw = (useRuntimeConfig(event).adminEmails as string) || ''
  const list = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  return list.length > 0 ? list : ['remtekindo@gmail.com']
}

/* ------------------------------------------------------------------ */
/* Cookie helpers                                                      */
/* ------------------------------------------------------------------ */

function cookieOptions(event: H3Event, maxAgeSec: number) {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: getRequestProtocol(event) === 'https',
    maxAge: maxAgeSec
  }
}

function setCookieValue(event: H3Event, name: string, value: string, maxAgeSec: number): void {
  setCookie(event, name, value, cookieOptions(event, maxAgeSec))
}

export function clearSessionCookie(event: H3Event): void {
  setCookie(event, SESSION_COOKIE, '', { ...cookieOptions(event, 0), maxAge: 0 })
}

/* ------------------------------------------------------------------ */
/* User session token                                                  */
/* ------------------------------------------------------------------ */

export async function mintUserToken(secret: string, identity: UserIdentity, maxAgeSec: number): Promise<{ token: string, expiresAt: number }> {
  const expiresAt = Math.floor(Date.now() / 1000) + maxAgeSec
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({
    sub: identity.sub,
    email: identity.email,
    name: identity.name ?? null,
    picture: identity.picture ?? null
  })))
  const sig = await hmacSignHex(secret, `user:${payload}:${expiresAt}`)
  return { token: `v1.${payload}.${expiresAt}.${sig}`, expiresAt }
}

export async function verifyUserToken(secret: string, token: string): Promise<(UserIdentity & { expiresAt: number }) | null> {
  const parts = token.split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') return null
  const payloadB64 = parts[1]
  const expRaw = parts[2]
  const sig = parts[3]
  if (!payloadB64 || !expRaw || !sig) return null
  const expiresAt = Number(expRaw)
  if (!Number.isInteger(expiresAt) || expiresAt * 1000 <= Date.now()) return null
  let identity: UserIdentity
  try {
    identity = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64))) as UserIdentity
  } catch {
    return null
  }
  if (!identity || typeof identity.sub !== 'string' || !identity.sub || typeof identity.email !== 'string' || !identity.email) return null
  const ok = await hmacVerifyHex(secret, `user:${payloadB64}:${expiresAt}`, sig)
  return ok ? { ...identity, expiresAt } : null
}

export function setSessionCookie(event: H3Event, token: string, maxAgeSec: number): void {
  setCookieValue(event, SESSION_COOKIE, token, maxAgeSec)
}

/**
 * Signed-in user for this request, or null. The identity comes from
 * the signed cookie; the role and material access are resolved fresh
 * (D1 user row + grants, env allowlist) so privilege changes apply
 * immediately. Never throws; a D1 failure degrades to the
 * env-allowlist role with no grants (fail closed for privilege).
 */
export async function getUserSession(event: H3Event): Promise<UserSession | null> {
  try {
    const secret = (useRuntimeConfig(event).sessionSecret as string) || ''
    if (!secret) return null
    const token = getCookie(event, SESSION_COOKIE)
    if (!token) return null
    const identity = await verifyUserToken(secret, token)
    if (!identity) return null
    const bootstrap = getAdminEmails(event).includes(identity.email.toLowerCase())
    const access = await resolveAccess(getRequestDb(event), identity, bootstrap)
    return {
      sub: identity.sub,
      email: identity.email,
      name: identity.name ?? null,
      picture: identity.picture ?? null,
      role: access.role,
      materials: access.materials,
      packages: access.packages
    }
  } catch {
    return null
  }
}

/** Valid admin session for this request, or null. Never throws. */
export async function getAdminSession(event: H3Event): Promise<UserSession | null> {
  const session = await getUserSession(event)
  return session && session.role === 'admin' ? session : null
}

/* ------------------------------------------------------------------ */
/* Anonymous visitor id                                                */
/* ------------------------------------------------------------------ */

export async function mintAnonSid(secret: string): Promise<{ sid: string, token: string }> {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const sid = bytesToHex(bytes)
  const sig = await hmacSignHex(secret, `anon:${sid}`)
  return { sid, token: `v1.${sid}.${sig}` }
}

export async function verifyAnonSid(secret: string, token: string): Promise<string | null> {
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return null
  const sid = parts[1]
  const sig = parts[2]
  if (!sid || !sig) return null
  if (!/^[0-9a-f]{32}$/.test(sid)) return null
  const ok = await hmacVerifyHex(secret, `anon:${sid}`, sig)
  return ok ? sid : null
}

/** Valid anonymous visitor id for this request, or null. Never throws. */
export async function getAnonSid(event: H3Event): Promise<string | null> {
  try {
    const token = getCookie(event, SID_COOKIE)
    if (!token) return null
    return await verifyAnonSid(getSessionSecret(event), token)
  } catch {
    return null
  }
}

/**
 * Make sure the visitor has an anonymous id cookie (mint one if
 * missing/invalid). Returns the sid. Used by GET /api/auth/session.
 */
export async function ensureAnonSid(event: H3Event): Promise<string> {
  const existing = await getAnonSid(event)
  if (existing) return existing
  const { sid, token } = await mintAnonSid(getSessionSecret(event))
  setCookieValue(event, SID_COOKIE, token, 30 * 86400)
  return sid
}

/* ------------------------------------------------------------------ */
/* Client IP (Cloudflare-aware)                                        */
/* ------------------------------------------------------------------ */

export function getClientIp(event: H3Event): string {
  const cf = getRequestHeader(event, 'cf-connecting-ip')
  if (cf) return cf.trim()
  const xff = getRequestHeader(event, 'x-forwarded-for')
  if (xff) return xff.split(',')[0]?.trim() || 'unknown'
  return event.node.req.socket?.remoteAddress || 'unknown'
}
