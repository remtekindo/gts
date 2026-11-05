/**
 * Client helpers for the server-side auth endpoints.
 *
 * Sign-in is Google Sign-In: the browser gets an ID token from Google
 * and POSTs it to /api/auth/google; the server verifies it and mints
 * the httpOnly session cookie. The session carries the user's identity,
 * role, and effective material access — all resolved server-side.
 * GET /api/auth/session also mints the anonymous visitor id cookie
 * (`gts_sid`) the Live Test endpoint requires for rate limiting.
 * Admin user management (Admin → Users) lives here too.
 */

export interface SessionState {
  admin: boolean
  /** Email of the signed-in user (null when signed out). */
  username: string | null
  email: string | null
  name: string | null
  picture: string | null
  role: 'admin' | 'user'
  /** Material slugs this user can open (server-resolved). */
  materials: string[]
  /** Package ids granted to this user. */
  packages: string[]
}

export const EMPTY_SESSION: SessionState = {
  admin: false,
  username: null,
  email: null,
  name: null,
  picture: null,
  role: 'user',
  materials: [],
  packages: []
}

export async function fetchSessionState(): Promise<SessionState> {
  try {
    return await $fetch<SessionState>('/api/auth/session')
  } catch {
    return { ...EMPTY_SESSION }
  }
}

export type GoogleLoginResult =
  | { ok: true, session: SessionState }
  | { ok: false, code: 'bad-token' | 'unavailable' }

function errorCode(e: unknown): string | null {
  const data = (e as { data?: { data?: { code?: string }, code?: string } })?.data
  return data?.data?.code || data?.code || null
}

export async function loginWithGoogle(credential: string, remember: boolean): Promise<GoogleLoginResult> {
  try {
    const res = await $fetch<{ ok: boolean, email: string, name: string | null, picture: string | null, role: 'admin' | 'user', materials: string[], packages: string[] }>(
      '/api/auth/google',
      { method: 'POST', body: { credential, remember } }
    )
    return {
      ok: true,
      session: {
        admin: res.role === 'admin',
        username: res.email,
        email: res.email,
        name: res.name,
        picture: res.picture,
        role: res.role,
        materials: res.materials,
        packages: res.packages
      }
    }
  } catch (e) {
    const code = errorCode(e)
    if (code === 'bad-token' || code === 'unavailable') return { ok: false, code }
    return { ok: false, code: 'unavailable' }
  }
}

/** Best-effort: clearing the local auth state matters more than this call. */
export async function logoutServer(): Promise<void> {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    /* server already unreachable or session already gone — ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Admin → Users (real Google accounts)                                */
/* ------------------------------------------------------------------ */

export interface RealUser {
  sub: string
  email: string
  name: string | null
  picture: string | null
  role: 'admin' | 'user'
  createdAt: string | null
  lastLoginAt: string | null
  bootstrapAdmin: boolean
  access: { materials: string[], packages: string[] }
  grants: { materials: string[], packages: string[] }
}

/** Real users, or null when the list could not be loaded. */
export async function fetchRealUsers(): Promise<RealUser[] | null> {
  try {
    const res = await $fetch<{ users: RealUser[] }>('/api/admin/users')
    return res.users
  } catch {
    return null
  }
}

export async function setUserRole(sub: string, role: 'admin' | 'user'): Promise<{ ok: boolean, code?: string }> {
  try {
    await $fetch('/api/admin/users/role', { method: 'POST', body: { sub, role } })
    return { ok: true }
  } catch (e) {
    return { ok: false, code: errorCode(e) ?? undefined }
  }
}

export async function setUserGrants(sub: string, materials: string[], packages: string[]): Promise<{ ok: boolean, code?: string }> {
  try {
    await $fetch('/api/admin/users/grants', { method: 'POST', body: { sub, materials, packages } })
    return { ok: true }
  } catch (e) {
    return { ok: false, code: errorCode(e) ?? undefined }
  }
}

/* ------------------------------------------------------------------ */
/* Admin → Overview: AI usage (real Meta API calls from D1)            */
/* ------------------------------------------------------------------ */

export interface AiUsageModelRow {
  model: string
  calls: number
  promptTokens: number
  completionTokens: number
  costUsd: number
  costIdr: number
}

export interface AiUsageSummary {
  period: string
  totalCalls: number
  totalPromptTokens: number
  totalCompletionTokens: number
  totalTokens: number
  totalCostUsd: number
  totalCostIdr: number
  usdIdrRate: number
  byModel: AiUsageModelRow[]
  hourly: number[]
  peakHour: number | null
  rates: { inputUsdPerMtok: number, outputUsdPerMtok: number }
  currency: string
}

export type AiUsagePeriod = 'today' | '7d' | '30d' | 'all'

/** AI usage summary, or an error code ('unavailable' when D1 is not connected). */
export async function fetchAiUsage(period: AiUsagePeriod): Promise<{ ok: true, summary: AiUsageSummary } | { ok: false, code: string }> {
  try {
    const res = await $fetch<AiUsageSummary>('/api/admin/ai-usage', { query: { period } })
    return { ok: true, summary: res }
  } catch (e) {
    return { ok: false, code: errorCode(e) ?? 'unavailable' }
  }
}
