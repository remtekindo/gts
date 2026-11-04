/**
 * In-panel AI assistant (demo mode).
 *
 * The admin opens the floating chat, types a prompt ("audit soal Part 5",
 * "cek duplikat", "distribusi kunci jawaban"), and the assistant runs a
 * REAL local analysis over the live bank — duplicates, answer-key
 * distribution, unrated questions, missing explanations — then saves the
 * result as an audit report shown in the Audit tab.
 *
 * This is algorithmic analysis, not an LLM call. When the backend exists,
 * the same chat box will forward prompts to the real Meta API; the audit
 * tab and report format stay the same.
 */
import { liveAllQuestions, liveFreeQuestions, getDifficultyOverrides, allManagedUsers } from './admin'
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
      id: `lr-${q.number}`,
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

function runUserAnalysis(lang: Lang, username: string): AssistantAnswer {
  const user = allManagedUsers().find(u => u.username.toLowerCase() === username.toLowerCase())
  if (!user) {
    return { reply: t(lang, 'userNotFound', { name: username }), reportId: null }
  }
  const parts = analyzeAbility('toeic-lr', user.username)
  const touched = parts.filter(p => p.answered > 0)
  if (touched.length === 0) {
    return { reply: t(lang, 'userNone', { name: user.username }), reportId: null }
  }
  const pct = (a: number | null) => (a === null ? '—' : `${Math.round(a * 100)}%`)
  const details = touched.map(p =>
    t(lang, 'userLine', { part: p.part, acc: pct(p.accuracy), level: p.level, n: p.answered }),
  )
  const weak = [...touched].sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1))[0]!
  const strong = [...touched].sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))[0]!
  const summary = `${t(lang, 'userWeak', { part: weak.part, acc: pct(weak.accuracy), level: weak.level })} ${t(lang, 'userStrong', { part: strong.part, acc: pct(strong.accuracy) })}`
  const report: AuditReport = {
    id: uid(), type: 'user', title: t(lang, 'userTitle', { name: user.username }),
    createdAt: new Date().toISOString(), summary, details: [summary, ...details],
  }
  saveAudit(report)
  return { reply: summary, reportId: report.id }
}

/** Route a free-text admin prompt to the right analysis. */
export function answerPrompt(raw: string, lang: Lang, scopeIds?: Set<string>): AssistantAnswer {
  if (typeof localStorage === 'undefined') return { reply: t(lang, 'unknown'), reportId: null }
  const s = raw.toLowerCase()
  const has = (...words: string[]) => words.some(w => s.includes(w))
  const mUser = s.match(/(?:analisa|analisis|analyze|analysis)\s+(?:user\s+)?(\w+)/)
  if (mUser && has('user', 'analisa', 'analisis', 'analyze', 'analysis')) {
    return runUserAnalysis(lang, mUser[1] as string)
  }
  if (has('audit')) return runAudit(lang, scopeIds)
  if (has('duplikat', 'duplicate', 'kembar', 'sama')) return runDuplicates(lang, scopeIds)
  if (has('distribusi', 'distribution', 'kunci', 'key', 'sebar')) return runDistribution(lang, scopeIds)
  if (has('belum dinilai', 'unrated', 'tanpa level', 'level', 'rating', 'dinilai')) return runUnrated(lang, scopeIds)
  if (has('ringkas', 'summary', 'statistik', 'stats', 'bank', 'total')) return runStats(lang, scopeIds)
  if (has('bantuan', 'help', 'bisa apa', 'halo', 'hai', 'hello', 'hi')) return { reply: t(lang, 'help'), reportId: null }
  return { reply: t(lang, 'unknown'), reportId: null }
}
