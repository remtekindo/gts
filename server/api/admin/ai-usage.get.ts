/**
 * GET /api/admin/ai-usage — AI usage summary for the Overview card, admin-only.
 *
 * Query: ?period=today | 7d | 30d (default) | all
 * Returns the summary computed from the ai_usage table (see
 * server/utils/ai-usage.ts): totals, per-model breakdown, cost
 * estimate in IDR (rates + fixed USD→IDR rate included in the
 * response so the UI can display them), and the 0-23 WIB hourly
 * histogram with the peak hour. No dummy rows are ever seeded:
 * an empty table returns zeros and peakHour null.
 *
 * 401 when the request has no admin session; 503 when the usage
 * store is not available on this server (plain `pnpm dev` has no
 * D1 binding) — the card then shows an honest "no data" state.
 */
import { getAdminSession } from '../../utils/auth'
import { getRequestDb } from '../../utils/user-store'
import { AI_USAGE_RATES, fetchAiUsageRows, periodStartIso, summarizeAiUsage } from '../../utils/ai-usage'

export default defineEventHandler(async (event) => {
  const admin = await getAdminSession(event)
  if (!admin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Admin session required.',
      data: { code: 'not-admin' }
    })
  }
  const db = getRequestDb(event)
  if (!db) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Usage store is not available on this server.',
      data: { code: 'unavailable' }
    })
  }
  const q = getQuery(event)
  const rawPeriod = typeof q.period === 'string' ? q.period : '30d'
  const period = ['today', '7d', '30d', 'all'].includes(rawPeriod) ? rawPeriod : '30d'
  const rows = await fetchAiUsageRows(db, periodStartIso(period))
  return {
    ...summarizeAiUsage(rows, period),
    rates: AI_USAGE_RATES,
    currency: 'IDR'
  }
})
