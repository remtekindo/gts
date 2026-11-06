/**
 * POST /api/results/submit — record one completed paper in D1.
 *
 * The browser keeps its own localStorage copy (see
 * app/utils/storage.ts saveResult) — this server copy is additive:
 * it is what the leaderboard reads, so only real signed-in users
 * with real results ever appear on the board. Live tests are never
 * submitted (AI-generated questions, not the curated bank) and the
 * free test needs no login, so neither earns points.
 *
 * Body: { paperId, materialSlug, kind: 'simulation' | 'drill',
 *         correct, total, score, finishedAt? }
 * `finishedAt` (ISO) is stored as created_at when valid; otherwise
 * the server time is used. One row per attempt — retakes are separate
 * rows; the board takes the best accuracy per paper.
 *
 * 401 when not signed in; 403 when the user has no access to the
 * material; 400 on invalid input; 503 when the results store is not
 * available on this server (plain `pnpm dev` has no D1 binding, or
 * migration 0006 has not been applied to the local file).
 */
import { getUserSession } from '../../utils/auth'
import { getRequestDb } from '../../utils/user-store'
import { isKnownMaterial } from '../../utils/catalog'

function isInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v)
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Sign-in required.', data: { code: 'not-signed-in' } })
  }
  const db = getRequestDb(event)
  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'Results store is not available on this server.', data: { code: 'unavailable' } })
  }
  const body = await readBody(event).catch(() => null) as Record<string, unknown> | null
  const paperId = typeof body?.paperId === 'string' ? body.paperId.trim() : ''
  const materialSlug = typeof body?.materialSlug === 'string' ? body.materialSlug.trim() : ''
  const kind = body?.kind
  const correct = body?.correct
  const total = body?.total
  const score = body?.score
  if (!paperId || !isKnownMaterial(materialSlug) || (kind !== 'simulation' && kind !== 'drill')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid paper, material, or kind.', data: { code: 'bad-input' } })
  }
  if (!isInt(correct) || !isInt(total) || total <= 0 || correct < 0 || correct > total) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid correct/total.', data: { code: 'bad-input' } })
  }
  if (!isInt(score) || score < 0 || score > 990) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid score.', data: { code: 'bad-input' } })
  }
  if (!session.materials.includes(materialSlug)) {
    throw createError({ statusCode: 403, statusMessage: 'No access to this material.', data: { code: 'no-access' } })
  }
  const finishedAt = typeof body?.finishedAt === 'string' ? body.finishedAt : ''
  const createdAt = finishedAt && !Number.isNaN(Date.parse(finishedAt)) ? new Date(finishedAt).toISOString() : null
  try {
    if (createdAt) {
      await db.prepare(
        `INSERT INTO test_results (username, user_sub, material_slug, paper_id, kind, score, total, correct, answers_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, '{}', ?9)`
      ).bind(session.name ?? session.email, session.sub, materialSlug, paperId, kind, score, total, correct, createdAt.replace('T', ' ').slice(0, 19)).run()
    } else {
      await db.prepare(
        `INSERT INTO test_results (username, user_sub, material_slug, paper_id, kind, score, total, correct, answers_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, '{}')`
      ).bind(session.name ?? session.email, session.sub, materialSlug, paperId, kind, score, total, correct).run()
    }
  } catch (e) {
    throw createError({
      statusCode: 503,
      statusMessage: `Results store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
  return { ok: true }
})
