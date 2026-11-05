/**
 * GET /api/health/d1 — D1 connectivity probe.
 * Returns the bound tables (empty before migrations are applied).
 */
import { getDb } from '../../utils/d1'

export default defineEventHandler(async (event) => {
  const db = getDb(event)
  if (!db) {
    throw createError({
      statusCode: 503,
      statusMessage: 'D1 binding DB is not configured. Deploy with wrangler.jsonc (Pages) or run wrangler pages dev --d1=DB locally.'
    })
  }
  const rows = await db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all<{ name: string }>()
  const tables = rows.results.map(r => r.name)
  let questions = 0
  if (tables.includes('questions')) {
    const count = await db.prepare('SELECT COUNT(*) AS n FROM questions').first<{ n: number }>()
    questions = count?.n ?? 0
  }
  return { ok: true, tables, questions }
})
