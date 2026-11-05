/**
 * Admin-stored Meta Model API key (dev/demo mode).
 *
 * The key is saved in the admin's own browser (localStorage) via
 * Admin → Settings, so the live test works without terminal env vars.
 * The live-test page sends it in the request body; the server route
 * prefers NITRO_MODEL_API_KEY from the environment and only falls
 * back to the body key.
 *
 * Production rule: set the key as a server env var (Cloudflare Pages
 * Functions env) and do NOT rely on the browser-stored key.
 */

const KEY = 'gts_admin_model_key'

export function getStoredModelKey(): string {
  try {
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

export function setStoredModelKey(key: string): void {
  try {
    localStorage.setItem(KEY, key.trim())
  } catch {
    /* noop */
  }
}

export function clearStoredModelKey(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

export function hasStoredModelKey(): boolean {
  return getStoredModelKey().length > 0
}

/** Mask a key for display: show first 6 + last 4 chars only. */
export function maskModelKey(key: string): string {
  if (key.length <= 10) return '••••••••'
  return `${key.slice(0, 6)}…${key.slice(-4)}`
}
