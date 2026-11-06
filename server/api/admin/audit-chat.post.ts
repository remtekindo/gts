/**
 * POST /api/admin/audit-chat — Audits chat backed by Meta's Model API.
 *
 * The Audits page used to answer only with a local algorithmic
 * analysis (see app/utils/ai-assistant.ts). This endpoint gives the
 * same chat a real LLM: the client computes the audit context
 * locally (bank stats, duplicates, key distribution, unrated items,
 * user per-part lines — all real numbers from the live bank) and
 * sends it along with the admin's prompt; the server asks Meta to
 * interpret it and return a structured answer.
 *
 * Auth + limits (same pattern as server/api/live-test/generate.post.ts):
 * - Admin session only (401 `not-admin` otherwise). There is no
 *   anonymous access — every call spends the server key.
 * - Rate limit 30 chats/hour per client IP (429 + `Retry-After`).
 * - Key is server-side only (NITRO_MODEL_API_KEY). No body key is
 *   accepted here — unlike Live Test, which keeps its admin body-key
 *   dev convenience. Without a key: 503 `no-key`, and the client
 *   falls back to the labeled local analysis.
 * - Meta errors surface as 502 (the client shows them honestly and
 *   falls back to local analysis, labeled).
 *
 * Every successful Meta call is recorded in the ai_usage table
 * (endpoint 'audit-chat') so the Overview AI card counts it.
 *
 * Body: { prompt: string, lang?: 'id' | 'en', context?: object,
 *         history?: Array<{ from: 'user' | 'ai', text: string }> }
 * Returns: { reply: string, findings: string[], title: string,
 *            summary: string | null, verdicts: array | null,
 *            source: 'llm', model: string,
 *            usage: { prompt_tokens: number, completion_tokens: number } }
 * `summary` is the plain-language conclusion (2-4 sentences, no
 * jargon): what is good, what still needs doing, and the single most
 * important next step — written in the request's language. It costs
 * ~50-100 extra completion tokens per call, recorded as usual.
 * `lang` falls back to Indonesian ('id') when missing or unknown.
 *
 * Worthiness scope (context.kind === 'worthiness'): the client sends
 * the admin-picked questions in context.questions (id, part, stem,
 * options, key, explanation). The model judges EACH one against five
 * explicit criteria (clear stem, exactly one correct key, plausible
 * distractors, appropriate difficulty, no factual/grammar/typo
 * errors) and returns one verdict per question — 'layak',
 * 'perlu-perbaikan', or 'tidak-layak' with one short reason — plus
 * the usual summary (verdict counts + most important fix). Verdicts
 * are computed live per assessment and stored only in the chat
 * session/report (localStorage); no D1 change.
 */

const BASE_URL = 'https://api.meta.ai/v1'
const MODEL = 'muse-spark-1.3-contributor'

const AUDIT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    findings: { type: 'array', items: { type: 'string' } },
    title: { type: 'string' },
    summary: { type: 'string' }
  },
  required: ['reply', 'findings', 'title', 'summary']
}

/** Worthiness scope: the same answer plus one verdict per question. */
const WORTHINESS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    ...AUDIT_JSON_SCHEMA.properties,
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          verdict: { type: 'string', enum: ['layak', 'perlu-perbaikan', 'tidak-layak'] },
          reason: { type: 'string' }
        },
        required: ['id', 'verdict', 'reason']
      }
    }
  },
  required: [...AUDIT_JSON_SCHEMA.required, 'verdicts']
}

export type WorthinessVerdict = { id: string, verdict: 'layak' | 'perlu-perbaikan' | 'tidak-layak', reason: string }

interface AuditChatBody {
  prompt?: string
  lang?: string
  context?: Record<string, unknown>
  history?: Array<{ from?: string, text?: string }>
}

function buildMessages(body: AuditChatBody): Array<{ role: string, content: string }> {
  // Unknown or missing language falls back to Indonesian — Rey's
  // everyday language — not English.
  const lang = body.lang === 'en' ? 'en' : 'id'
  const langName = lang === 'id' ? 'Indonesian' : 'English'
  const isWorthiness = (body.context as { kind?: string } | undefined)?.kind === 'worthiness'
  // Worthiness sends up to 20 full questions (stem + options + key +
  // explanation) — needs a bigger context budget than the stats-only
  // audits.
  const contextJson = JSON.stringify(body.context ?? {}, null, 1).slice(0, isWorthiness ? 12000 : 6000)
  const history = (body.history ?? []).slice(-6)
    .filter(m => typeof m.text === 'string' && m.text.trim())
    .map(m => `${m.from === 'ai' ? 'Assistant' : 'Admin'}: ${String(m.text).slice(0, 1000)}`)
    .join('\n')
  const worthinessRules = isWorthiness ? `
- Worthiness assessment: context.questions lists the SELECTED questions to judge (id, part, stem, options, key, explanation). Judge EACH one against these criteria: (1) stem clear and unambiguous; (2) exactly one correct key; (3) distractors plausible — not obviously wrong and not duplicated; (4) difficulty appropriate for the part/level; (5) no factual, grammar, or typo errors. Verdict per question: "tidak-layak" when the key is wrong or ambiguous, or the stem is broken; "perlu-perbaikan" for fixable issues (typo, weak distractor, unclear wording); "layak" otherwise. Return one verdict per question in "verdicts" (id, verdict, one short reason sentence). The "summary" counts the verdicts and names the most important fix.` : ''
  const system = `You are the GTS admin audit assistant. You audit an English test question bank (TOEIC-style items) and learner results for the app admin.
Rules:
- Answer in ${langName}. Be concise and concrete: findings first, then next actions.
- Base EVERY number and claim on the CONTEXT JSON below. Do not invent counts, questions, or users. The context lists samples (first 10) AND totals — always report the TOTALS (totalDuplicates, totalDuplicateIds, totalUnrated), never mistake a 10-item sample for the total.
- Free-test questions have no explanation field by design: the noExplanation count includes them — say so separately instead of listing them as broken items.
- Answer EVERY prompt as the audit assistant, even a greeting or a test word like "test": give a brief helpful answer from the context numbers (a short bank summary plus what you can audit) — never refuse with "no audit was requested" and never dump the raw context.
- Answer once, in a single concise block. Do not repeat the same text twice.
- Also return "summary": 2-4 sentences in plain everyday language, no jargon and no numbers-heavy detail — say what is good about the bank, what still needs doing, and the single most important next step. Write it in ${langName}, the same language as the reply. It is shown to the admin as the "Kesimpulan" / "Conclusion" block above the technical answer.${worthinessRules}
- Return ONLY the JSON object matching the schema: reply (the chat answer), findings (short bullet strings), title (short report title), summary (plain-language conclusion)${isWorthiness ? ', verdicts (one per selected question)' : ''}.`
  const user = `Admin prompt: ${body.prompt ?? ''}\n\n${history ? `Recent conversation:\n${history}\n\n` : ''}CONTEXT JSON (real numbers from the live bank):\n${contextJson}`
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ]
}

async function callMeta(body: AuditChatBody, apiKey: string): Promise<{ reply: string, findings: string[], title: string, summary: string | null, verdicts: WorthinessVerdict[] | null, usage: Record<string, unknown> }> {
  const isWorthiness = (body.context as { kind?: string } | undefined)?.kind === 'worthiness'
  const payload = {
    model: MODEL,
    messages: buildMessages(body),
    response_format: { type: 'json_schema', json_schema: { name: 'audit_answer', schema: isWorthiness ? WORTHINESS_JSON_SCHEMA : AUDIT_JSON_SCHEMA } },
    reasoning_effort: 'low',
    // Worthiness returns one verdict + reason per question (up to
    // 20), so it needs a bigger output budget than a plain audit.
    max_tokens: isWorthiness ? 2000 : 1200
  }
  let lastErr: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(payload)
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
      const parsed = JSON.parse(content) as { reply?: string, findings?: string[], title?: string, summary?: string, verdicts?: WorthinessVerdict[] }
      if (typeof parsed.reply !== 'string' || !parsed.reply.trim()) throw new Error('Model returned no reply')
      // Verdicts are validated, not trusted blindly: id + reason must
      // be strings and the verdict one of the three known values.
      // Missing/empty verdicts never fail the answer — the client
      // renders no verdict block then.
      const verdicts = Array.isArray(parsed.verdicts)
        ? parsed.verdicts.filter((v): v is WorthinessVerdict =>
          !!v && typeof v.id === 'string' && (v.verdict === 'layak' || v.verdict === 'perlu-perbaikan' || v.verdict === 'tidak-layak') && typeof v.reason === 'string'
        ).map(v => ({ id: v.id, verdict: v.verdict, reason: v.reason.trim().slice(0, 300) })).slice(0, 20)
        : []
      return {
        reply: parsed.reply.trim(),
        findings: Array.isArray(parsed.findings) ? parsed.findings.filter(f => typeof f === 'string').slice(0, 20) : [],
        title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim().slice(0, 80) : 'Audit chat',
        // The summary is required by the schema, but never fail the
        // whole answer over it — a missing one renders as no block.
        summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim().slice(0, 600) : null,
        verdicts: verdicts.length > 0 ? verdicts : null,
        usage: data.usage || {}
      }
    } catch (e) {
      lastErr = e as Error
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500 * attempt))
    }
  }
  throw lastErr || new Error('Meta API call failed')
}

import { getAdminSession, getClientIp } from '../../utils/auth'
import { checkRateLimit } from '../../utils/rate-limit'
import { recordAiUsage, reasoningTokensFromUsage } from '../../utils/ai-usage'
import { getRequestDb } from '../../utils/user-store'

export default defineEventHandler(async (event) => {
  const body = await readBody<AuditChatBody>(event)

  // 1. Admin only — every call spends the server key.
  const admin = await getAdminSession(event)
  if (!admin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Admin session required.',
      data: { code: 'not-admin' }
    })
  }

  // 2. Rate limit per client IP so one admin session cannot drain credits.
  const ip = getClientIp(event)
  const rl = checkRateLimit(`audit-chat:admin:${ip}`, 30)
  if (!rl.allowed) {
    setResponseHeader(event, 'Retry-After', rl.resetAfterSec)
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many audit chats. Please wait and try again.',
      data: { code: 'rate-limited', retryAfterSec: rl.resetAfterSec }
    })
  }

  // 3. Prompt first: a malformed request is a 400 whatever the server
  // config is — the caller gets the real reason, not a 503.
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 2000) : ''
  if (!prompt) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A prompt is required.',
      data: { code: 'bad-prompt' }
    })
  }

  // 4. Key: server env only. No body key is accepted on this endpoint.
  const { modelApiKey } = useRuntimeConfig(event)
  const apiKey = (modelApiKey as string) || ''
  if (!apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'No Meta API key configured. Set NITRO_MODEL_API_KEY on the server.',
      data: { code: 'no-key' }
    })
  }

  let answer: { reply: string, findings: string[], title: string, summary: string | null, verdicts: WorthinessVerdict[] | null, usage: Record<string, unknown> }
  try {
    answer = await callMeta({ ...body, prompt }, apiKey)
  } catch (e) {
    throw createError({ statusCode: 502, statusMessage: `Meta API error: ${(e as Error).message}`, data: { code: 'meta-error' } })
  }

  // 4. Log the call (best-effort) so the Overview AI card counts it.
  // Reasoning tokens are recorded too when Meta reports them — they
  // are part of completion, not extra (see server/utils/ai-usage.ts).
  // actor 'admin': this endpoint is admin-only, so every call here
  // is internal-team usage.
  await recordAiUsage(getRequestDb(event), {
    endpoint: 'audit-chat',
    model: MODEL,
    promptTokens: Number(answer.usage.prompt_tokens) || 0,
    completionTokens: Number(answer.usage.completion_tokens) || 0,
    reasoningTokens: reasoningTokensFromUsage(answer.usage),
    actor: 'admin'
  })

  return {
    reply: answer.reply,
    findings: answer.findings,
    title: answer.title,
    summary: answer.summary,
    verdicts: answer.verdicts ?? null,
    source: 'llm' as const,
    model: MODEL,
    usage: {
      prompt_tokens: Number(answer.usage.prompt_tokens) || 0,
      completion_tokens: Number(answer.usage.completion_tokens) || 0
    }
  }
})
