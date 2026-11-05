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
 *            source: 'llm', model: string,
 *            usage: { prompt_tokens: number, completion_tokens: number } }
 */

const BASE_URL = 'https://api.meta.ai/v1'
const MODEL = 'muse-spark-1.3-contributor'

const AUDIT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    findings: { type: 'array', items: { type: 'string' } },
    title: { type: 'string' }
  },
  required: ['reply', 'findings', 'title']
}

interface AuditChatBody {
  prompt?: string
  lang?: string
  context?: Record<string, unknown>
  history?: Array<{ from?: string, text?: string }>
}

function buildMessages(body: AuditChatBody): Array<{ role: string, content: string }> {
  const lang = body.lang === 'id' ? 'id' : 'en'
  const langName = lang === 'id' ? 'Indonesian' : 'English'
  const contextJson = JSON.stringify(body.context ?? {}, null, 1).slice(0, 6000)
  const history = (body.history ?? []).slice(-6)
    .filter(m => typeof m.text === 'string' && m.text.trim())
    .map(m => `${m.from === 'ai' ? 'Assistant' : 'Admin'}: ${String(m.text).slice(0, 1000)}`)
    .join('\n')
  const system = `You are the GTS admin audit assistant. You audit an English test question bank (TOEIC-style items) and learner results for the app admin.
Rules:
- Answer in ${langName}. Be concise and concrete: findings first, then next actions.
- Base EVERY number and claim on the CONTEXT JSON below. Do not invent counts, questions, or users. The context lists samples (first 10) AND totals — always report the TOTALS (totalDuplicates, totalDuplicateIds, totalUnrated), never mistake a 10-item sample for the total.
- Free-test questions have no explanation field by design: the noExplanation count includes them — say so separately instead of listing them as broken items.
- Answer EVERY prompt as the audit assistant, even a greeting or a test word like "test": give a brief helpful answer from the context numbers (a short bank summary plus what you can audit) — never refuse with "no audit was requested" and never dump the raw context.
- Answer once, in a single concise block. Do not repeat the same text twice.
- Return ONLY the JSON object matching the schema: reply (the chat answer), findings (short bullet strings), title (short report title).`
  const user = `Admin prompt: ${body.prompt ?? ''}\n\n${history ? `Recent conversation:\n${history}\n\n` : ''}CONTEXT JSON (real numbers from the live bank):\n${contextJson}`
  return [
    { role: 'system', content: system },
    { role: 'user', content: user }
  ]
}

async function callMeta(body: AuditChatBody, apiKey: string): Promise<{ reply: string, findings: string[], title: string, usage: Record<string, number> }> {
  const payload = {
    model: MODEL,
    messages: buildMessages(body),
    response_format: { type: 'json_schema', json_schema: { name: 'audit_answer', schema: AUDIT_JSON_SCHEMA } },
    reasoning_effort: 'low',
    max_tokens: 1200
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
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }>, usage?: Record<string, number> }
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('Empty response content from Meta API')
      const parsed = JSON.parse(content) as { reply?: string, findings?: string[], title?: string }
      if (typeof parsed.reply !== 'string' || !parsed.reply.trim()) throw new Error('Model returned no reply')
      return {
        reply: parsed.reply.trim(),
        findings: Array.isArray(parsed.findings) ? parsed.findings.filter(f => typeof f === 'string').slice(0, 20) : [],
        title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim().slice(0, 80) : 'Audit chat',
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
import { recordAiUsage } from '../../utils/ai-usage'
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

  let answer: { reply: string, findings: string[], title: string, usage: Record<string, number> }
  try {
    answer = await callMeta({ ...body, prompt }, apiKey)
  } catch (e) {
    throw createError({ statusCode: 502, statusMessage: `Meta API error: ${(e as Error).message}`, data: { code: 'meta-error' } })
  }

  // 4. Log the call (best-effort) so the Overview AI card counts it.
  await recordAiUsage(getRequestDb(event), {
    endpoint: 'audit-chat',
    model: MODEL,
    promptTokens: Number(answer.usage.prompt_tokens) || 0,
    completionTokens: Number(answer.usage.completion_tokens) || 0
  })

  return {
    reply: answer.reply,
    findings: answer.findings,
    title: answer.title,
    source: 'llm' as const,
    model: MODEL,
    usage: {
      prompt_tokens: Number(answer.usage.prompt_tokens) || 0,
      completion_tokens: Number(answer.usage.completion_tokens) || 0
    }
  }
})
