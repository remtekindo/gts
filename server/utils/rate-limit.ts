/**
 * In-memory fixed-window rate limiter.
 *
 * Deliberately simple: one Map, one window (default 1 hour), keyed
 * by caller (e.g. `live-test:anon:<ip>`). Correct on a single
 * process (local dev server, `wrangler pages dev`); on Cloudflare
 * Pages each isolate keeps its own buckets, so a client that hops
 * isolates gets a fresh bucket — the limit is a pragmatic bound
 * against casual abuse, not a hard global quota. If a hard global
 * quota is ever needed, move the counters into D1 (the DB binding
 * is already there) — see README § Auth.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const MAX_BUCKETS = 5000

function prune(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return
  for (const [key, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(key)
  }
}

export function checkRateLimit(key: string, limit: number, windowMs = 3_600_000): { allowed: boolean, resetAfterSec: number } {
  const now = Date.now()
  prune(now)
  const b = buckets.get(key)
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, resetAfterSec: Math.ceil(windowMs / 1000) }
  }
  if (b.count >= limit) {
    return { allowed: false, resetAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) }
  }
  b.count += 1
  return { allowed: true, resetAfterSec: Math.ceil((b.resetAt - now) / 1000) }
}
