/**
 * Live AI test — server route.
 *
 * POST /api/live-test/generate
 * Body: { part?: number, skill?: string, difficulty?: number, count?: number,
 *         excludeStems?: string[] }
 *
 * Generates a fresh batch of TOEIC-style questions with Meta's Model API
 * (muse-spark-1.3-contributor) and validates them with the same rules as
 * scripts/generate-questions/generate.mjs.
 *
 * Auth (added 2026-11-05 — the endpoint used to be open, so anyone could
 * burn Meta credits with a bare POST):
 * - A session is required: either a valid user session cookie
 *   (`gts_session`, from POST /api/auth/google) or a valid anonymous
 *   visitor id (`gts_sid`, minted by GET /api/auth/session). The Live
 *   Test page fetches the session before generating.
 * - Completed-test gate (added 2026-11-06): generation is refused
 *   (403 `no-completed-test`) unless the signed-in user has completed
 *   at least one finished paper — a row in D1 `test_results` for
 *   their `sub`. Anonymous visitors are refused too (they can never
 *   have completed a test). When the server has no D1 binding (plain
 *   `pnpm dev` only) the gate is skipped; production always has D1.
 * - Rate limit per client IP: 12 batches/hour for anonymous visitors,
 *   60/hour for the admin. Counts are in-memory (per process/isolate);
 *   see server/utils/rate-limit.ts.
 *
 * Key resolution (in order):
 * 1. NITRO_MODEL_API_KEY from the environment (production path — preferred).
 * 2. `apiKey` in the request body — ONLY when the request carries a
 *    valid admin session (the admin pastes the key in Admin → Settings
 *    as a dev convenience). Anonymous requests never get to spend a
 *    caller-supplied key, and the server key is never used without a
 *    session + rate-limit check above.
 * For Cloudflare Pages: set NITRO_MODEL_API_KEY in the dashboard (Functions env).
 * (The CLI pipeline keeps using MODEL_API_KEY — same key value, other name.)
 */

const BASE_URL = 'https://api.meta.ai/v1'
const MODEL = 'muse-spark-1.3-contributor'

const PART_DESCRIPTIONS: Record<number, string> = {
  1: 'Photographs: one statement describes the photo (4 spoken-style options).',
  2: 'Question–Response: a short spoken question, choose the best response.',
  3: 'Conversations: 2–3 speakers, 3 questions per dialogue.',
  4: 'Talks: a short monologue (announcement/ad/talk), 3 questions per talk.',
  5: 'Incomplete Sentences: choose the word/phrase that completes the sentence. Tests grammar + vocabulary.',
  6: 'Text Completion: a short passage (email/memo/notice) with 4 blanks; each blank is one question.',
  7: 'Reading Comprehension: single/double passages with 2–5 questions each.'
}

const QUESTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          stem: { type: 'string' },
          context: { type: 'string' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                letter: { type: 'string' },
                text: { type: 'string' }
              },
              required: ['letter', 'text']
            }
          },
          correctLetter: { type: 'string' },
          explanation: { type: 'string' }
        },
        required: ['stem', 'options', 'correctLetter', 'explanation']
      }
    }
  },
  required: ['questions']
}

interface GenOption {
  letter: string
  text: string
}

interface GenQuestion {
  stem: string
  context?: string
  options: GenOption[]
  correctLetter: string
  explanation: string
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim()
}

function buildPrompt({ part, skill, count, difficulty }: { part: number, skill: string, count: number, difficulty: number }): string {
  const partDesc = PART_DESCRIPTIONS[part] || `Part ${part}`
  return `You write ORIGINAL English test practice questions. Everything must be your own
original content — do not reproduce any published test material.

Generate ${count} TOEIC-style questions:
- Part: ${part} — ${partDesc}
- Skill: ${skill}
- Target difficulty: ${difficulty}/5 (1 = beginner, 5 = advanced)

Rules for every question:
1. "stem" is the question text (for Part 1, describe a photo like "Photograph: ...").
2. For Parts 6-7 include a short original "context" passage; otherwise omit it.
3. "options" has EXACTLY 4 items with letters A, B, C, D in order.
4. Exactly ONE option is correct; the other three are plausible distractors
   (common learner mistakes, not jokes or obviously wrong).
5. "correctLetter" is one of A/B/C/D.
6. "explanation" is 1-2 sentences explaining why the answer is correct.
7. Vary the correct letter across questions — do not make them all the same.
8. Workplace/business English tone. No copyrighted text, no real brand names.

Return ONLY the JSON object matching the schema.`
}

function validateBatch(questions: GenQuestion[], exclude: Set<string>): { valid: GenQuestion[], errors: string[] } {
  const errors: string[] = []
  const valid: GenQuestion[] = []
  const seen = new Set<string>()
  questions.forEach((q, i) => {
    const tag = `q${i + 1}`
    if (!q.stem || typeof q.stem !== 'string' || !q.stem.trim()) { errors.push(`${tag}: empty stem`); return }
    if (!Array.isArray(q.options) || q.options.length !== 4) { errors.push(`${tag}: options must be exactly 4`); return }
    const letters = q.options.map(o => o.letter)
    if (JSON.stringify(letters) !== JSON.stringify(['A', 'B', 'C', 'D'])) { errors.push(`${tag}: option letters must be A,B,C,D in order`); return }
    const texts = q.options.map(o => (o.text || '').trim())
    if (texts.some(t => !t)) { errors.push(`${tag}: empty option text`); return }
    if (new Set(texts.map(normalize)).size !== 4) { errors.push(`${tag}: duplicate option texts`); return }
    if (!['A', 'B', 'C', 'D'].includes(q.correctLetter)) { errors.push(`${tag}: bad correctLetter`); return }
    if (!q.explanation || !q.explanation.trim()) { errors.push(`${tag}: empty explanation`); return }
    const n = normalize(q.stem)
    if (seen.has(n)) { errors.push(`${tag}: duplicate stem inside batch`); return }
    if (exclude.has(n)) { errors.push(`${tag}: duplicate of an earlier batch`); return }
    seen.add(n)
    valid.push(q)
  })
  return { valid, errors }
}

async function callMeta(prompt: string, apiKey: string): Promise<{ questions: GenQuestion[], usage: Record<string, unknown> }> {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are a precise test-item writer. You output only valid JSON.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'toeic_questions', schema: QUESTION_JSON_SCHEMA } },
    reasoning_effort: 'low'
  }
  let lastErr: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body)
      })
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`Meta API HTTP ${res.status}`)
        await new Promise(r => setTimeout(r, 2000 * attempt))
        continue
      }
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Meta API HTTP ${res.status}: ${text.slice(0, 300)}`)
      }
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }>, usage?: Record<string, unknown> }
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('Empty response content from Meta API')
      const parsed = JSON.parse(content) as { questions?: GenQuestion[] }
      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) throw new Error('Model returned no questions')
      return { questions: parsed.questions, usage: data.usage || {} }
    } catch (e) {
      lastErr = e as Error
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt))
    }
  }
  throw lastErr || new Error('Meta API call failed')
}

import { getAdminSession, getAnonSid, getClientIp, getUserSession } from '../../utils/auth'
import { checkRateLimit } from '../../utils/rate-limit'
import { recordAiUsage, reasoningTokensFromUsage } from '../../utils/ai-usage'
import { getRequestDb } from '../../utils/user-store'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ part?: number, skill?: string, difficulty?: number, count?: number, excludeStems?: string[], apiKey?: string }>(event)

  // 1. A session is required — admin session or anonymous visitor id.
  //    Without this, any script on the internet could POST here and
  //    spend the server's Meta credits.
  const admin = await getAdminSession(event)
  const sid = admin ? null : await getAnonSid(event)
  if (!admin && !sid) {
    throw createError({
      statusCode: 401,
      statusMessage: 'A session is required. Open the app and sign in first.',
      data: { code: 'no-session' }
    })
  }

  // 1b. Completed-test gate: Live Test unlocks only after the user
  //     has completed one finished paper (any module). "Completed"
  //     is a row in D1 `test_results` for this user (kind
  //     'simulation' or 'drill', valid correct/total) — the same
  //     definition GET /api/results/activity reports. Anonymous
  //     visitors can never have one, so they are refused too. When
  //     this server has no D1 binding (plain `pnpm dev` only) the
  //     gate cannot be checked and is skipped — production always
  //     has D1. This runs before the rate limit so refused requests
  //     never consume budget.
  const userSession = await getUserSession(event)
  if (!userSession) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Complete one test first to unlock the Live Test.',
      data: { code: 'no-completed-test' }
    })
  }
  const gateDb = getRequestDb(event)
  if (gateDb) {
    try {
      const row = await gateDb.prepare(
        `SELECT COUNT(*) AS n FROM test_results WHERE user_sub = ?1
         AND kind IN ('simulation', 'drill')
         AND correct IS NOT NULL AND total IS NOT NULL AND total > 0`
      ).bind(userSession.sub).first<{ n: number }>()
      if (!row || row.n === 0) {
        throw createError({
          statusCode: 403,
          statusMessage: 'Complete one test first to unlock the Live Test.',
          data: { code: 'no-completed-test' }
        })
      }
    } catch (e) {
      if (e && typeof e === 'object' && 'statusCode' in e) throw e
      throw createError({
        statusCode: 503,
        statusMessage: 'Results store tables are missing on this server.',
        data: { code: 'unavailable' }
      })
    }
  }

  // 2. Rate limit per client IP so one visitor cannot drain credits.
  const ip = getClientIp(event)
  const limit = admin ? 60 : 12
  const rl = checkRateLimit(`live-test:${admin ? 'admin' : 'anon'}:${ip}`, limit)
  if (!rl.allowed) {
    setResponseHeader(event, 'Retry-After', rl.resetAfterSec)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many Live Test requests. Please wait and try again.',
      data: { code: 'rate-limited', retryAfterSec: rl.resetAfterSec }
    })
  }

  // 3. Key: server env first; a body key is honored ONLY for a signed-in
  //    admin (dev convenience). Anonymous callers can never bring a key,
  //    and the env key is only spent behind the checks above.
  const { modelApiKey } = useRuntimeConfig(event)
  const apiKey = modelApiKey || (admin && typeof body.apiKey === 'string' ? body.apiKey.trim() : '')
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No Meta API key configured. Set NITRO_MODEL_API_KEY on the server.'
    })
  }

  const part = body.part && body.part >= 1 && body.part <= 7 ? Math.floor(body.part) : 5
  const skill = body.skill || (part <= 4 ? 'listening' : 'reading')
  const difficulty = body.difficulty && body.difficulty >= 1 && body.difficulty <= 5 ? Math.floor(body.difficulty) : 3
  const count = body.count && body.count >= 1 && body.count <= 10 ? Math.floor(body.count) : 5
  const exclude = new Set((body.excludeStems || []).map(normalize))

  const prompt = buildPrompt({ part, skill, count, difficulty })
  const collected: GenQuestion[] = []
  let lastErrors: string[] = []
  // Up to 3 API calls to fill the batch (model may return dupes/empties).
  for (let attempt = 0; attempt < 3 && collected.length < count; attempt++) {
    let res: { questions: GenQuestion[], usage: Record<string, unknown> }
    try {
      res = await callMeta(prompt, apiKey)
    } catch (e) {
      throw createError({ statusCode: 502, statusMessage: `Meta API error: ${(e as Error).message}` })
    }
    // Log the call (best-effort) so the Overview AI card counts it.
    // Reasoning tokens are recorded too when Meta reports them — they
    // are part of completion, not extra (see server/utils/ai-usage.ts).
    // actor 'user': Live Test is the user-facing feature, so its
    // calls are end-user usage even when an admin takes the test.
    await recordAiUsage(getRequestDb(event), {
      endpoint: 'live-test',
      model: MODEL,
      promptTokens: Number(res.usage?.prompt_tokens) || 0,
      completionTokens: Number(res.usage?.completion_tokens) || 0,
      reasoningTokens: reasoningTokensFromUsage(res.usage),
      actor: 'user'
    })
    const { valid, errors } = validateBatch(res.questions, new Set([...exclude, ...collected.map(q => normalize(q.stem))]))
    lastErrors = errors
    collected.push(...valid)
  }

  if (collected.length === 0) {
    throw createError({ statusCode: 422, statusMessage: `Generated batch failed validation: ${lastErrors.join('; ') || 'unknown'}` })
  }

  return {
    questions: collected.slice(0, count),
    model: MODEL,
    part,
    skill,
    difficulty
  }
})
