/**
 * Google Sign-In — ID token verification (server-side).
 *
 * The client (Google Identity Services) hands the server a Google-issued
 * ID token (JWT). This module verifies it — nothing the client claims
 * about the user is trusted until this passes:
 * - signature against Google's public keys (JWKS, fetched + cached),
 * - `alg` RS256 with a known `kid`,
 * - `iss` is a Google issuer, `aud` is OUR Client ID,
 * - `exp` not passed, `email` present and `email_verified` true.
 *
 * Pure function of its inputs (no runtime config inside) so it can be
 * unit-tested with a local JWKS. Uses the global fetch + Web Crypto, so
 * it works in Node (dev server) and in Cloudflare Workers (Pages).
 * No Buffer is used (not available in Workers without nodejs_compat).
 */

export interface GoogleIdentity {
  sub: string
  email: string
  name?: string | null
  picture?: string | null
}

export type VerifyGoogleResult =
  | { ok: true, identity: GoogleIdentity }
  | { ok: false, code: 'bad-token' | 'unavailable' }

export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs'

const GOOGLE_ISSUERS = new Set(['https://accounts.google.com', 'accounts.google.com'])

const JWKS_TTL_MS = 60 * 60 * 1000

interface CachedJwks {
  keys: Map<string, CryptoKey>
  fetchedAt: number
}

const jwksCache = new Map<string, CachedJwks>()

function b64UrlDecode(s: string): Uint8Array {
  const bin = atob(s.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(s.length / 4) * 4, '='))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function jsonFromB64(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(new TextDecoder().decode(b64UrlDecode(s))) as Record<string, unknown>
  } catch {
    return null
  }
}

async function fetchJwks(url: string, forceRefresh: boolean): Promise<Map<string, CryptoKey> | null> {
  const cached = jwksCache.get(url)
  if (cached && !forceRefresh && Date.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.keys
  let res: Response
  try {
    res = await fetch(url, { headers: { Accept: 'application/json' } })
  } catch {
    return null
  }
  if (!res.ok) return null
  let data: { keys?: Array<Record<string, unknown>> }
  try {
    data = await res.json() as { keys?: Array<Record<string, unknown>> }
  } catch {
    return null
  }
  if (!Array.isArray(data.keys)) return null
  const keys = new Map<string, CryptoKey>()
  for (const jwk of data.keys) {
    const kid = jwk.kid
    if (typeof kid !== 'string' || !kid) continue
    try {
      const key = await crypto.subtle.importKey(
        'jwk',
        jwk as JsonWebKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      )
      keys.set(kid, key)
    } catch {
      // A malformed key in the set must not break verification of the rest.
    }
  }
  jwksCache.set(url, { keys, fetchedAt: Date.now() })
  return keys
}

/**
 * Verify a Google ID token. Returns the identity on success.
 * - 'bad-token': malformed token, unknown key, bad signature, or a
 *   claim check failed (wrong audience/issuer, expired, unverified email).
 * - 'unavailable': Google's JWKS could not be fetched — fail closed, the
 *   caller must answer 503, never accept the token.
 */
export async function verifyGoogleIdToken(
  credential: string,
  opts: { clientId: string, jwksUrl?: string }
): Promise<VerifyGoogleResult> {
  const jwksUrl = opts.jwksUrl || GOOGLE_JWKS_URL
  const parts = credential.split('.')
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return { ok: false, code: 'bad-token' }
  const header = jsonFromB64(parts[0])
  const payload = jsonFromB64(parts[1])
  if (!header || !payload) return { ok: false, code: 'bad-token' }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || !header.kid) return { ok: false, code: 'bad-token' }

  // Signature first: no claim is read until the token is proven genuine.
  let keys = await fetchJwks(jwksUrl, false)
  if (keys === null) return { ok: false, code: 'unavailable' }
  let key = keys.get(header.kid)
  if (!key) {
    // Key rotation: refetch once before giving up on this kid.
    keys = await fetchJwks(jwksUrl, true)
    if (keys === null) return { ok: false, code: 'unavailable' }
    key = keys.get(header.kid)
  }
  if (!key) return { ok: false, code: 'bad-token' }
  let valid: boolean
  try {
    valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      b64UrlDecode(parts[2]) as BufferSource,
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`) as BufferSource
    )
  } catch {
    return { ok: false, code: 'bad-token' }
  }
  if (!valid) return { ok: false, code: 'bad-token' }

  // Claims (only now, with a proven signature).
  const iss = payload.iss
  if (typeof iss !== 'string' || !GOOGLE_ISSUERS.has(iss)) return { ok: false, code: 'bad-token' }
  const aud = payload.aud
  const audOk = typeof aud === 'string' ? aud === opts.clientId : Array.isArray(aud) && aud.includes(opts.clientId)
  if (!audOk) return { ok: false, code: 'bad-token' }
  const exp = payload.exp
  if (typeof exp !== 'number' || exp * 1000 <= Date.now()) return { ok: false, code: 'bad-token' }
  const sub = payload.sub
  const email = payload.email
  if (typeof sub !== 'string' || !sub || typeof email !== 'string' || !email) return { ok: false, code: 'bad-token' }
  if (payload.email_verified !== true) return { ok: false, code: 'bad-token' }
  const name = payload.name
  const picture = payload.picture
  return {
    ok: true,
    identity: {
      sub,
      email,
      name: typeof name === 'string' ? name : null,
      picture: typeof picture === 'string' ? picture : null
    }
  }
}
