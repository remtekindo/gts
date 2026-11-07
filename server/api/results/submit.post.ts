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
 *         correct, total, score, finishedAt?, parts?, attempt? }
 * `finishedAt` (ISO) is stored as created_at when valid; otherwise
 * the server time is used. One row per attempt — retakes are separate
 * rows; the board takes the best accuracy per paper.
 * `attempt` (1–3, optional) is the attempt the row was submitted
 * for, stored in the nullable `attempt` column (migration 0008) so
 * the sequential unlock can tell Attempt 02 from Attempt 01. Rows
 * without it (older clients) store NULL and count as attempt 1 for
 * the unlock check. Anything outside 1–3 is a 400.
 * `parts` (optional) is the per-part tally the take page computed
 * from the bank questions — { "<part>": {correct, total}, … } — stored
 * as JSON in the nullable `breakdown` column (migration 0007) for the
 * Performance page. It is validated strictly: integer part keys 1–20,
 * 0 ≤ correct ≤ total, and the parts must add up to `total`; anything
 * else is a 400. A missing `parts` simply stores NULL (older clients
 * and rows without one show an honest empty radar, never demo data).
 *
 * Sequential unlocking is enforced here, not just in the UI: a
 * locked paper is refused with 403 `paper-locked` (the previous
 * Full Simulation is not completed yet), a locked attempt with 403
 * `attempt-locked` (the previous attempt is not completed yet) —
 * see server/utils/unlock.ts. A direct take URL can never bypass
 * the lock, because the result cannot be recorded.
 *
 * 401 when not signed in; 403 when the user has no access to the
 * material; 400 on invalid input (including an unknown paper id);
 * 503 when the results store is not available on this server (plain
 * `pnpm dev` has no D1 binding, or migrations 0006/0008 have not
 * been applied to the local file).
 */
import { getUserSession } from '../../utils/auth'
import { getRequestDb } from '../../utils/user-store'
import { isKnownMaterial, getPaperEntry } from '../../utils/catalog'
import { parseBreakdown } from '../../utils/performance'
import { MAX_ATTEMPTS, getUnlockState, paperLock, attemptLocked } from '../../utils/unlock'

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
  const attempt = body?.attempt === undefined || body?.attempt === null ? null : body.attempt
  if (!paperId || !isKnownMaterial(materialSlug) || (kind !== 'simulation' && kind !== 'drill')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid paper, material, or kind.', data: { code: 'bad-input' } })
  }
  if (!isInt(correct) || !isInt(total) || total <= 0 || correct < 0 || correct > total) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid correct/total.', data: { code: 'bad-input' } })
  }
  if (!isInt(score) || score < 0 || score > 990) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid score.', data: { code: 'bad-input' } })
  }
  if (attempt !== null && (!isInt(attempt) || attempt < 1 || attempt > MAX_ATTEMPTS)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid attempt.', data: { code: 'bad-input' } })
  }
  // The paper must exist in the catalog — a forged id must not slip
  // past the lock check below (which trusts the catalog order).
  const paperEntry = getPaperEntry(paperId)
  if (!paperEntry || paperEntry.materialSlug !== materialSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Unknown paper for this material.', data: { code: 'bad-input' } })
  }
  const parts = parseBreakdown(body?.parts, total)
  if (body?.parts !== undefined && body?.parts !== null && parts === null) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid parts breakdown.', data: { code: 'bad-input' } })
  }
  const breakdownJson = parts ? JSON.stringify(parts) : null
  if (!session.materials.includes(materialSlug)) {
    throw createError({ statusCode: 403, statusMessage: 'No access to this material.', data: { code: 'no-access' } })
  }
  // Sequential unlocking — the server is the enforcement point, not
  // the take page: a locked paper or attempt cannot be recorded even
  // when the take URL was opened directly.
  let unlock
  try {
    unlock = await getUnlockState(db, session.sub, materialSlug)
  } catch (e) {
    throw createError({
      statusCode: 503,
      statusMessage: `Results store tables are missing on this server: ${(e as Error).message}`,
      data: { code: 'unavailable' }
    })
  }
  const pl = paperLock(materialSlug, paperId, unlock.completedPaperIds)
  if (pl.locked) {
    throw createError({ statusCode: 403, statusMessage: 'This paper is locked. Complete the previous Full Simulation first.', data: { code: 'paper-locked', unlockAfterId: pl.unlockAfterId } })
  }
  if (attemptLocked(attempt ?? 1, unlock.completedAttempts[paperId] ?? [])) {
    throw createError({ statusCode: 403, statusMessage: 'This attempt is locked. Complete the previous attempt first.', data: { code: 'attempt-locked' } })
  }
  const finishedAt = typeof body?.finishedAt === 'string' ? body.finishedAt : ''
  const createdAt = finishedAt && !Number.isNaN(Date.parse(finishedAt)) ? new Date(finishedAt).toISOString() : null
  try {
    if (createdAt) {
      await db.prepare(
        `INSERT INTO test_results (username, user_sub, material_slug, paper_id, kind, score, total, correct, answers_json, created_at, breakdown, attempt)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, '{}', ?9, ?10, ?11)`
      ).bind(session.name ?? session.email, session.sub, materialSlug, paperId, kind, score, total, correct, createdAt.replace('T', ' ').slice(0, 19), breakdownJson, attempt).run()
    } else {
      await db.prepare(
        `INSERT INTO test_results (username, user_sub, material_slug, paper_id, kind, score, total, correct, answers_json, breakdown, attempt)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, '{}', ?9, ?10)`
      ).bind(session.name ?? session.email, session.sub, materialSlug, paperId, kind, score, total, correct, breakdownJson, attempt).run()
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
