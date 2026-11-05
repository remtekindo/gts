/**
 * AI usage log — one D1 row per Meta Model API call.
 *
 * Both server routes that call Meta (Live Test + admin audit chat)
 * record here: model, prompt/completion tokens (from the `usage`
 * field of Meta's response), endpoint, and timestamp. The Overview
 * "Aktivitas Penggunaan AI" card reads this table — so its numbers
 * are real, never seeded. An empty table honestly means "no usage
 * yet". Recording is best-effort and never throws: a logging failure
 * must never break a test or a chat answer.
 *
 * Money: Contributor pricing $0.10 / 1M input tokens, $0.20 / 1M
 * output tokens, converted at a fixed displayed rate (USD_IDR_RATE).
 * The card labels the Rupiah figure "estimasi" — it is not a bill.
 *
 * Time: `created_at` is stored as UTC (SQLite datetime('now')).
 * The hourly histogram is built in WIB (UTC+7, no DST) here, in
 * plain JS, so the aggregation is unit-testable without SQL.
 */

import { getDb, type D1Database } from './d1'

export const AI_USAGE_RATES = { inputUsdPerMtok: 0.10, outputUsdPerMtok: 0.20 } as const
/** Fixed USD→IDR rate used for the cost estimate. Displayed in the UI and README. */
export const USD_IDR_RATE = 16500

export interface AiUsageRow {
  id: number
  endpoint: string
  model: string
  promptTokens: number
  completionTokens: number
  createdAt: string
}

export interface AiUsageModelBreakdown {
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
  byModel: AiUsageModelBreakdown[]
  /** Calls per hour, index 0-23, in WIB (Asia/Jakarta, UTC+7). */
  hourly: number[]
  /** Busiest WIB hour (0-23), or null when there are no calls. */
  peakHour: number | null
}

export function costUsd(promptTokens: number, completionTokens: number): number {
  return (promptTokens / 1_000_000) * AI_USAGE_RATES.inputUsdPerMtok
    + (completionTokens / 1_000_000) * AI_USAGE_RATES.outputUsdPerMtok
}

/** Record one Meta API call. Best-effort: never throws. */
export async function recordAiUsage(
  db: D1Database | null,
  entry: { endpoint: string, model: string, promptTokens: number, completionTokens: number }
): Promise<void> {
  if (!db) return
  try {
    await db.prepare(
      'INSERT INTO ai_usage (endpoint, model, prompt_tokens, completion_tokens) VALUES (?1, ?2, ?3, ?4)'
    ).bind(
      entry.endpoint,
      entry.model,
      Math.max(0, Math.floor(entry.promptTokens)),
      Math.max(0, Math.floor(entry.completionTokens))
    ).run()
  } catch (e) {
    console.warn('[ai-usage] record failed:', (e as Error).message)
  }
}

function toSqliteUtc(ms: number): string {
  const d = new Date(ms)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`
}

/**
 * Start of the requested period, as a SQLite UTC timestamp string
 * (space-separated, so lexical comparison with created_at works), or
 * null for "all". 'today' means the current calendar day in WIB.
 */
export function periodStartIso(period: string, nowMs = Date.now()): string | null {
  if (period === 'all') return null
  if (period === 'today') {
    const wib = nowMs + 7 * 3600_000
    const startWib = Math.floor(wib / 86400000) * 86400000
    return toSqliteUtc(startWib - 7 * 3600_000)
  }
  const days = period === '7d' ? 7 : 30
  return toSqliteUtc(nowMs - days * 86400000)
}

/** Raw rows for a period (newest first, capped — the card aggregates client-side data from here). */
export async function fetchAiUsageRows(db: D1Database, sinceIso: string | null): Promise<AiUsageRow[]> {
  const base = 'SELECT id, endpoint, model, prompt_tokens, completion_tokens, created_at FROM ai_usage'
  const stmt = sinceIso
    ? db.prepare(`${base} WHERE created_at >= ?1 ORDER BY created_at DESC LIMIT 5000`).bind(sinceIso)
    : db.prepare(`${base} ORDER BY created_at DESC LIMIT 5000`)
  const res = await stmt.all<Record<string, unknown>>()
  return (res.results || []).map(r => ({
    id: Number(r.id) || 0,
    endpoint: String(r.endpoint || ''),
    model: String(r.model || ''),
    promptTokens: Number(r.prompt_tokens) || 0,
    completionTokens: Number(r.completion_tokens) || 0,
    createdAt: String(r.created_at || '')
  }))
}

/** WIB hour (0-23) for a UTC 'YYYY-MM-DD HH:MM:SS' timestamp. Returns -1 when unparsable. */
export function wibHour(utcSqliteTs: string): number {
  const ms = Date.parse(utcSqliteTs.replace(' ', 'T') + 'Z')
  if (Number.isNaN(ms)) return -1
  return (new Date(ms).getUTCHours() + 7) % 24
}

/** Pure aggregation over raw rows — no SQL, so it is unit-testable. */
export function summarizeAiUsage(rows: AiUsageRow[], period: string): AiUsageSummary {
  const byModel = new Map<string, AiUsageModelBreakdown>()
  const hourly = new Array<number>(24).fill(0)
  let totalPrompt = 0
  let totalCompletion = 0
  for (const r of rows) {
    totalPrompt += r.promptTokens
    totalCompletion += r.completionTokens
    const cur = byModel.get(r.model) ?? { model: r.model, calls: 0, promptTokens: 0, completionTokens: 0, costUsd: 0, costIdr: 0 }
    cur.calls += 1
    cur.promptTokens += r.promptTokens
    cur.completionTokens += r.completionTokens
    byModel.set(r.model, cur)
    const h = wibHour(r.createdAt)
    if (h >= 0) hourly[h] = (hourly[h] ?? 0) + 1
  }
  const models = [...byModel.values()].map(m => {
    const usd = costUsd(m.promptTokens, m.completionTokens)
    return { ...m, costUsd: usd, costIdr: Math.round(usd * USD_IDR_RATE) }
  }).sort((a, b) => b.calls - a.calls)
  const totalUsd = costUsd(totalPrompt, totalCompletion)
  let peakHour: number | null = null
  let peakCount = 0
  hourly.forEach((c, h) => {
    if (c > peakCount) { peakCount = c; peakHour = h }
  })
  return {
    period,
    totalCalls: rows.length,
    totalPromptTokens: totalPrompt,
    totalCompletionTokens: totalCompletion,
    totalTokens: totalPrompt + totalCompletion,
    totalCostUsd: totalUsd,
    totalCostIdr: Math.round(totalUsd * USD_IDR_RATE),
    usdIdrRate: USD_IDR_RATE,
    byModel: models,
    hourly,
    peakHour
  }
}

/** D1 binding for this request, or null (plain `pnpm dev` has none). */
export function getUsageDb(event: import('h3').H3Event): D1Database | null {
  return getDb(event)
}
