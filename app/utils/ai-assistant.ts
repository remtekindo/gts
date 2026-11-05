/**
 * In-panel AI assistant.
 *
 * The admin opens the chat, types a prompt ("audit soal Part 5",
 * "cek duplikat", "distribusi kunci jawaban", "analisa user <email>"),
 * and the assistant first asks the real Meta LLM via
 * POST /api/admin/audit-chat with the real numbers computed locally
 * (duplicates, key distribution, unrated questions, user per-part
 * lines). When the LLM is unavailable (no key, rate-limited, error),
 * the same prompt falls back to a local algorithmic analysis — and the
 * UI labels it honestly as local analysis, never as an LLM answer.
 *
 * User analysis matches against real Google sign-in accounts (their
 * email, passed in by the Audits page); there are no demo users.
 */
import { liveAllQuestions, liveFreeQuestions, getDifficultyOverrides, bankViewId } from './admin'
import { analyzeAbility } from './adaptive'

export interface AuditReport {
  id: string
  type: 'audit' | 'duplicates' | 'distribution' | 'unrated' | 'stats' | 'user'
  title: string
  createdAt: string
  summary: string
  details: string[]
}

export interface AssistantAnswer {
  reply: string
  reportId: string | null
}

type Lang = 'id' | 'en'

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* noop */
  }
}

const AUDITS_KEY = 'gts_admin_audits'

export function getAudits(): AuditReport[] {
  return read<AuditReport[]>(AUDITS_KEY) ?? []
}

function saveAudit(report: AuditReport): void {
  const all = getAudits().filter(a => a.id !== report.id)
  all.unshift(report)
  write(AUDITS_KEY, all.slice(0, 50))
}

function uid(): string {
  return `audit-${Date.now().toString(36)}`
}

interface BankItem {
  id: string
  stem: string
  correctLetter: string
  explanation: string
}

function bankItems(scopeIds?: Set<string>): BankItem[] {
  const all: BankItem[] = [
    ...liveAllQuestions().map(q => ({
      id: bankViewId(q.materialSlug, q.number),
      stem: q.stem.trim(),
      correctLetter: q.correctLetter,
      explanation: q.explanation ?? '',
    })),
    ...liveFreeQuestions().map(q => ({
      id: `free-${q.number}`,
      stem: q.stem.trim(),
      correctLetter: q.correctLetter,
      explanation: '',
    })),
  ]
  if (!scopeIds) return all
  return all.filter(q => scopeIds.has(q.id))
}

const STR: Record<Lang, Record<string, string>> = {
  id: {
    auditTitle: 'Audit bank soal',
    dupTitle: 'Cek duplikat',
    distTitle: 'Distribusi kunci jawaban',
    unratedTitle: 'Soal belum dinilai',
    statsTitle: 'Ringkasan bank soal',
    noDupes: 'Tidak ada stem duplikat. Bank bersih.',
    dupesFound: '{n} stem duplikat ditemukan:',
    unratedNone: 'Semua soal sudah punya level kesulitan. Bagus.',
    unratedFound: '{n} soal belum punya level kesulitan:',
    help: 'Saya bisa: "audit bank soal", "cek duplikat", "distribusi kunci jawaban", "soal belum dinilai", "ringkasan bank".',
    unknown: 'Saya belum paham perintah itu. Coba: "audit bank soal", "cek duplikat", atau "distribusi kunci jawaban".',
    unknownStats: 'Perintah tidak dikenali — berikut ringkasan bank saat ini:',
    doneAudit: 'Audit selesai — {issues} temuan. Hasil lengkap tersimpan di tab Riwayat.',
    doneOk: 'Bank soal bersih, tidak ada temuan. Hasil tersimpan di tab Audit.',
    q: 'soal',
    keyDist: 'Kunci A:{a} B:{b} C:{c} D:{d}',
    noExpl: '{n} soal tanpa penjelasan.',
    totalLine: 'Total {n} soal di bank (LR + Free Test).',
    userTitle: 'Analisa user {name}',
    userNone: 'Tidak ada data tes untuk user "{name}". Minta user mengerjakan tes dulu.',
    userLine: 'Part {part}: {acc} · level {level} ({n} soal dijawab)',
    userWeak: 'Kelemahan utama: Part {part} ({acc}). Rekomendasi: fokus latihan Part {part} di level {level}.',
    userStrong: 'Kekuatan utama: Part {part} ({acc}).',
    userNotFound: 'User "{name}" tidak ditemukan.',
  },
  en: {
    auditTitle: 'Question bank audit',
    dupTitle: 'Duplicate check',
    distTitle: 'Answer key distribution',
    unratedTitle: 'Unrated questions',
    statsTitle: 'Bank summary',
    noDupes: 'No duplicate stems. Bank is clean.',
    dupesFound: '{n} duplicate stems found:',
    unratedNone: 'Every question has a difficulty level. Nice.',
    unratedFound: '{n} questions without a difficulty level:',
    help: 'I can: "audit question bank", "check duplicates", "answer key distribution", "unrated questions", "bank summary".',
    unknown: 'I did not understand that. Try: "audit question bank", "check duplicates", or "answer key distribution".',
    unknownStats: 'Command not recognized — here is the current bank summary:',
    doneAudit: 'Audit done — {issues} findings. Full result saved in the History tab.',
    doneOk: 'Bank is clean, no findings. Result saved in the Audit tab.',
    q: 'questions',
    keyDist: 'Keys A:{a} B:{b} C:{c} D:{d}',
    noExpl: '{n} questions without explanation.',
    totalLine: 'Total {n} questions in bank (LR + Free Test).',
    userTitle: 'User analysis: {name}',
    userNone: 'No test data for user "{name}". Ask them to take a test first.',
    userLine: 'Part {part}: {acc} · level {level} ({n} answered)',
    userWeak: 'Main weakness: Part {part} ({acc}). Recommendation: focus practice on Part {part} at level {level}.',
    userStrong: 'Main strength: Part {part} ({acc}).',
    userNotFound: 'User "{name}" not found.',
  },
}

function t(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let s = STR[lang][key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v))
  }
  return s
}

function duplicates(items: BankItem[]): { stem: string; ids: string[] }[] {
  const map = new Map<string, string[]>()
  for (const q of items) {
    const key = q.stem.toLowerCase()
    const arr = map.get(key) ?? []
    arr.push(q.id)
    map.set(key, arr)
  }
  return [...map.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([stem, ids]) => ({ stem: stem.slice(0, 80), ids }))
}

function keyDist(items: BankItem[]): Record<string, number> {
  const d: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
  for (const q of items) {
    if (d[q.correctLetter] !== undefined) d[q.correctLetter]! += 1
  }
  return d
}

function unrated(items: BankItem[]): BankItem[] {
  const diffs = getDifficultyOverrides()
  return items.filter(q => diffs[q.id] === undefined)
}

function runAudit(lang: Lang, scopeIds?: Set<string>): AssistantAnswer {
  const items = bankItems(scopeIds)
  const dups = duplicates(items)
  const dist = keyDist(items)
  const un = unrated(items)
  const noExpl = items.filter(q => !q.explanation.trim()).length
  const details: string[] = []
  if (dups.length > 0) {
    details.push(t(lang, 'dupesFound', { n: dups.length }))
    dups.slice(0, 10).forEach(d => details.push(`• ${d.stem}… (${d.ids.join(', ')})`))
  }
  const vals = Object.values(dist)
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  if (max - min > items.length * 0.15) {
    details.push(t(lang, 'keyDist', { a: dist.A ?? 0, b: dist.B ?? 0, c: dist.C ?? 0, d: dist.D ?? 0 }) + ' — unbalanced, consider rebalancing.')
  } else {
    details.push(t(lang, 'keyDist', { a: dist.A ?? 0, b: dist.B ?? 0, c: dist.C ?? 0, d: dist.D ?? 0 }))
  }
  if (un.length > 0) {
    details.push(t(lang, 'unratedFound', { n: un.length }))
    un.slice(0, 10).forEach(q => details.push(`• ${q.id}`))
  }
  if (noExpl > 0) details.push(t(lang, 'noExpl', { n: noExpl }))
  details.unshift(t(lang, 'totalLine', { n: items.length }))

  const issues = dups.length + (un.length > 0 ? 1 : 0) + (max - min > items.length * 0.15 ? 1 : 0)
  const report: AuditReport = {
    id: uid(),
    type: 'audit',
    title: t(lang, 'auditTitle'),
    createdAt: new Date().toISOString(),
    summary: issues === 0 ? t(lang, 'doneOk') : t(lang, 'doneAudit', { issues }),
    details,
  }
  saveAudit(report)
  return { reply: report.summary, reportId: report.id }
}

function runDuplicates(lang: Lang, scopeIds?: Set<string>): AssistantAnswer {
  const items = bankItems(scopeIds)
  const dups = duplicates(items)
  const details = dups.length === 0
    ? [t(lang, 'noDupes')]
    : [t(lang, 'dupesFound', { n: dups.length }), ...dups.slice(0, 20).map(d => `• ${d.stem}… (${d.ids.join(', ')})`)]
  const report: AuditReport = {
    id: uid(), type: 'duplicates', title: t(lang, 'dupTitle'),
    createdAt: new Date().toISOString(), summary: details[0] as string, details,
  }
  saveAudit(report)
  return { reply: report.summary, reportId: report.id }
}

function runDistribution(lang: Lang, scopeIds?: Set<string>): AssistantAnswer {
  const items = bankItems(scopeIds)
  const dist = keyDist(items)
  const line = t(lang, 'keyDist', { a: dist.A ?? 0, b: dist.B ?? 0, c: dist.C ?? 0, d: dist.D ?? 0 })
  const report: AuditReport = {
    id: uid(), type: 'distribution', title: t(lang, 'distTitle'),
    createdAt: new Date().toISOString(), summary: line, details: [line, t(lang, 'totalLine', { n: items.length })],
  }
  saveAudit(report)
  return { reply: line, reportId: report.id }
}

function runUnrated(lang: Lang, scopeIds?: Set<string>): AssistantAnswer {
  const items = bankItems(scopeIds)
  const un = unrated(items)
  const summary = un.length === 0 ? t(lang, 'unratedNone') : t(lang, 'unratedFound', { n: un.length })
  const report: AuditReport = {
    id: uid(), type: 'unrated', title: t(lang, 'unratedTitle'),
    createdAt: new Date().toISOString(), summary,
    details: [summary, ...un.slice(0, 20).map(q => `• ${q.id} — ${q.stem.slice(0, 60)}…`)],
  }
  saveAudit(report)
  return { reply: summary, reportId: report.id }
}

function runStats(lang: Lang, scopeIds?: Set<string>): AssistantAnswer {
  const items = bankItems(scopeIds)
  const dist = keyDist(items)
  const un = unrated(items)
  const summary = `${t(lang, 'totalLine', { n: items.length })} ${t(lang, 'keyDist', { a: dist.A ?? 0, b: dist.B ?? 0, c: dist.C ?? 0, d: dist.D ?? 0 })}`
  const report: AuditReport = {
    id: uid(), type: 'stats', title: t(lang, 'statsTitle'),
    createdAt: new Date().toISOString(), summary,
    details: [summary, un.length === 0 ? t(lang, 'unratedNone') : t(lang, 'unratedFound', { n: un.length })],
  }
  saveAudit(report)
  return { reply: summary, reportId: report.id }
}

function runUserAnalysis(lang: Lang, username: string, users: string[] = []): AssistantAnswer {
  const data = userAnalysisData(username, lang, users)
  if (!data.found) {
    return { reply: t(lang, 'userNotFound', { name: username }), reportId: null }
  }
  if (data.lines.length === 0) {
    return { reply: t(lang, 'userNone', { name: username }), reportId: null }
  }
  const report: AuditReport = {
    id: uid(), type: 'user', title: t(lang, 'userTitle', { name: username }),
    createdAt: new Date().toISOString(), summary: data.summary as string, details: [data.summary as string, ...data.lines],
  }
  saveAudit(report)
  return { reply: data.summary as string, reportId: report.id }
}

/**
 * Per-part ability lines for one user, without saving a report.
 * Shared by the local answer and by the LLM context builder.
 * `users` is the list of known real-user emails (from D1, passed in
 * by the Audits page); a username not on the list is "not found".
 */
function userAnalysisData(username: string, lang: Lang, users: string[] = []): { found: boolean, lines: string[], summary: string | null } {
  const known = users.some(u => u.toLowerCase() === username.toLowerCase())
  if (!known) return { found: false, lines: [], summary: null }
  const parts = analyzeAbility('toeic-lr', username)
  const touched = parts.filter(p => p.answered > 0)
  if (touched.length === 0) return { found: true, lines: [], summary: null }
  const pct = (a: number | null) => (a === null ? '—' : `${Math.round(a * 100)}%`)
  const lines = touched.map(p =>
    t(lang, 'userLine', { part: p.part, acc: pct(p.accuracy), level: p.level, n: p.answered }),
  )
  const weak = [...touched].sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1))[0]!
  const strong = [...touched].sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0]!
  const summary = `${t(lang, 'userWeak', { part: weak.part, acc: pct(weak.accuracy), level: weak.level })} ${t(lang, 'userStrong', { part: strong.part, acc: pct(strong.accuracy) })}`
  return { found: true, lines, summary }
}

/** Username/email after "analisa user …" — a full token, so emails work. */
function extractUser(raw: string): string | null {
  const m = raw.toLowerCase().match(/(?:analisa|analisis|analyze|analysis)\s+(?:user\s+)?([^\s]+)/)
  if (!m) return null
  return (m[1] as string).replace(/[.,;:!?]+$/, '')
}

/** Which intent a free-text prompt is, using the same routing as answerPrompt. */
export type AuditKind = 'audit' | 'duplicates' | 'distribution' | 'unrated' | 'stats' | 'user' | 'help' | 'unknown'

export function detectKind(raw: string): AuditKind {
  const s = raw.toLowerCase()
  const has = (...words: string[]) => words.some(w => s.includes(w))
  if (extractUser(raw) && has('user', 'analisa', 'analisis', 'analyze', 'analysis')) return 'user'
  if (has('audit')) return 'audit'
  if (has('duplikat', 'duplicate', 'kembar', 'sama')) return 'duplicates'
  if (has('distribusi', 'distribution', 'kunci', 'key', 'sebar')) return 'distribution'
  if (has('belum dinilai', 'unrated', 'tanpa level', 'level', 'rating', 'dinilai')) return 'unrated'
  if (has('ringkas', 'summary', 'statistik', 'stats', 'bank', 'total')) return 'stats'
  if (has('bantuan', 'help', 'bisa apa', 'halo', 'hai', 'hello', 'hi')) return 'help'
  return 'unknown'
}

/**
 * Real audit context for the LLM: the same numbers the local analysis
 * computes (bank stats, duplicates, key distribution, unrated items,
 * user per-part lines). Nothing here is invented — the LLM is told to
 * base every claim on these numbers.
 */
export interface AuditContext {
  kind: AuditKind
  scope: string | null
  totalQuestions: number
  keyDist: Record<string, number>
  duplicates: { stem: string, ids: string[] }[]
  /** True totals — the arrays above are samples (first 10), never totals. */
  totalDuplicates: number
  totalDuplicateIds: number
  unrated: { id: string, stem: string }[]
  totalUnrated: number
  noExplanation: number
  /** Free-test items have no explanation field by design (see mock data). */
  freeQuestions: number
  userLines: string[]
  userSummary: string | null
}

export function buildAuditContext(raw: string, lang: Lang, scopeIds?: Set<string>, users: string[] = []): AuditContext {
  const kind = detectKind(raw)
  const items = bankItems(scopeIds)
  const dist = keyDist(items)
  const dups = duplicates(items)
  const un = unrated(items)
  const noExpl = items.filter(q => !q.explanation.trim()).length
  let userLines: string[] = []
  let userSummary: string | null = null
  let scope: string | null = null
  if (kind === 'user') {
    const username = extractUser(raw) ?? ''
    scope = username || null
    const data = userAnalysisData(username, lang, users)
    userLines = data.lines
    userSummary = data.summary
  }
  return {
    kind,
    scope,
    totalQuestions: items.length,
    keyDist: dist,
    duplicates: dups.slice(0, 10),
    totalDuplicates: dups.length,
    totalDuplicateIds: dups.reduce((n, d) => n + d.ids.length, 0),
    unrated: un.slice(0, 10).map(q => ({ id: q.id, stem: q.stem.slice(0, 80) })),
    totalUnrated: un.length,
    noExplanation: noExpl,
    freeQuestions: items.filter(q => q.id.startsWith('free-')).length,
    userLines,
    userSummary
  }
}

export interface AuditChatResult {
  ok: boolean
  reply?: string
  findings?: string[]
  title?: string
  code?: string
}

/** Ask the server-side Meta LLM. Any failure is reported by code — the caller falls back to labeled local analysis. */
export async function askAuditChat(prompt: string, lang: Lang, context: AuditContext, history: ChatMsg[]): Promise<AuditChatResult> {
  try {
    const res = await $fetch<{ reply: string, findings: string[], title: string }>('/api/admin/audit-chat', {
      method: 'POST',
      body: {
        prompt,
        lang,
        context,
        history: history.slice(-6).map(m => ({ from: m.from, text: m.text }))
      }
    })
    return { ok: true, reply: res.reply, findings: res.findings ?? [], title: res.title ?? 'Audit chat' }
  } catch (e) {
    const data = (e as { data?: { data?: { code?: string }, code?: string } })?.data
    const code = data?.data?.code || data?.code || 'unavailable'
    return { ok: false, code }
  }
}

/** Save an LLM answer as an audit report (same History tab as local reports). */
export function saveLlmAuditReport(title: string, summary: string, findings: string[]): string {
  const report: AuditReport = {
    id: uid(), type: 'audit', title,
    createdAt: new Date().toISOString(),
    summary,
    details: findings.length > 0 ? findings : [summary],
  }
  saveAudit(report)
  return report.id
}

/** Route a free-text admin prompt to the right analysis. */
export function answerPrompt(raw: string, lang: Lang, scopeIds?: Set<string>, users: string[] = []): AssistantAnswer {
  if (typeof localStorage === 'undefined') return { reply: t(lang, 'unknown'), reportId: null }
  const s = raw.toLowerCase()
  const has = (...words: string[]) => words.some(w => s.includes(w))
  const username = extractUser(raw)
  if (username && has('user', 'analisa', 'analisis', 'analyze', 'analysis')) {
    return runUserAnalysis(lang, username, users)
  }
  if (has('audit')) return runAudit(lang, scopeIds)
  if (has('duplikat', 'duplicate', 'kembar', 'sama')) return runDuplicates(lang, scopeIds)
  if (has('distribusi', 'distribution', 'kunci', 'key', 'sebar')) return runDistribution(lang, scopeIds)
  if (has('belum dinilai', 'unrated', 'tanpa level', 'level', 'rating', 'dinilai')) return runUnrated(lang, scopeIds)
  if (has('ringkas', 'summary', 'statistik', 'stats', 'bank', 'total')) return runStats(lang, scopeIds)
  if (has('bantuan', 'help', 'bisa apa', 'halo', 'hai', 'hello', 'hi')) return { reply: t(lang, 'help'), reportId: null }
  // Unknown free text (a greeting, a test word, anything else): do not
  // leave the admin with a bare "I don't understand". Answer with the
  // labeled bank summary so the reply is always useful.
  const stats = runStats(lang, scopeIds)
  return { reply: `${t(lang, 'unknownStats')}\n${stats.reply}`, reportId: stats.reportId }
}

/* ------------------------------------------------------------------ */
/* Chat sessions: conversation history for the Audits sidebar.         */
/* ------------------------------------------------------------------ */

export interface ChatMsg {
  from: 'user' | 'ai'
  text: string
  reportId?: string | null
  /** 'llm' = answered by Meta AI; 'local' = labeled local-analysis fallback. Absent on old stored messages. */
  source?: 'llm' | 'local'
  /** Explains a fallback (e.g. no API key configured). Shown under the message. */
  note?: string | null
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ChatMsg[]
}

const SESSIONS_KEY = 'gts_admin_chat_sessions'

export function getChatSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY)
    return raw ? (JSON.parse(raw) as ChatSession[]) : []
  } catch {
    return []
  }
}

export function saveChatSession(session: ChatSession): void {
  try {
    const all = getChatSessions().filter(s => s.id !== session.id)
    all.unshift(session)
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(all.slice(0, 30)))
  } catch {
    /* noop */
  }
}

export function deleteChatSession(id: string): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(getChatSessions().filter(s => s.id !== id)))
  } catch {
    /* noop */
  }
}

export function getAuditById(id: string): AuditReport | undefined {
  return getAudits().find(a => a.id === id)
}

export function newSessionId(): string {
  return `chat-${Date.now().toString(36)}`
}
