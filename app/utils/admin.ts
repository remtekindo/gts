/** Minimal admin helpers for the GTS /admin panel (demo: localStorage-backed). */

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

export interface AdminQuestionView {
  id: string
  bank: string
  section: string
  stem: string
  options: { letter: string; text: string }[]
  correctLetter: string
}

export interface AdminReport {
  id: string
  questionId: string
  reason: string
  reporter: string
  status: 'pending' | 'resolved' | 'dismissed'
  createdAt: string
}

export interface AdminUser {
  username: string
  plan: string
  status: 'active' | 'trial' | 'expired'
  joined: string
  attempts: number
  phone: string
  subscriptionEnds: string
}

export interface UserOverride {
  status?: AdminUser['status']
  subscriptionEnds?: string
}

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

// ---- Difficulty overrides (foundation for the adaptive engine) ----

const DIFF_KEY = 'gts_admin_difficulty'

export function getDifficultyOverrides(): Record<string, DifficultyLevel> {
  return read<Record<string, DifficultyLevel>>(DIFF_KEY) ?? {}
}

export function setDifficulty(questionId: string, level: DifficultyLevel): void {
  const all = getDifficultyOverrides()
  all[questionId] = level
  write(DIFF_KEY, all)
}

// ---- Question reports (QC queue) ----

const REPORTS_KEY = 'gts_admin_reports'

const SEED_REPORTS: AdminReport[] = [
  {
    id: 'r-1',
    questionId: 'free-7',
    reason: 'Stem ambiguous — two options could be correct',
    reporter: 'demo-learner',
    status: 'pending',
    createdAt: '2026-10-30T09:12:00+07:00',
  },
  {
    id: 'r-2',
    questionId: 'lr-4',
    reason: 'Suspected wrong answer key',
    reporter: 'demo-learner',
    status: 'pending',
    createdAt: '2026-10-29T16:40:00+07:00',
  },
]

export function getReports(): AdminReport[] {
  const stored = read<AdminReport[]>(REPORTS_KEY)
  if (stored) return stored
  write(REPORTS_KEY, SEED_REPORTS)
  return SEED_REPORTS
}

export function setReportStatus(id: string, status: AdminReport['status']): void {
  const reports = getReports().map(r => (r.id === id ? { ...r, status } : r))
  write(REPORTS_KEY, reports)
}

// ---- Demo users (until the real backend exists) ----

export const MOCK_ADMIN_USERS: AdminUser[] = [
  { username: 'budi', plan: 'Bulanan', status: 'active', joined: '2026-10-28', attempts: 12, phone: '6281234567890', subscriptionEnds: '2026-11-28' },
  { username: 'sari', plan: 'Triwulanan', status: 'active', joined: '2026-10-25', attempts: 31, phone: '6281234567891', subscriptionEnds: '2027-01-25' },
  { username: 'agus', plan: 'Free', status: 'trial', joined: '2026-10-30', attempts: 3, phone: '6281234567892', subscriptionEnds: '2026-11-06' },
  { username: 'dewi', plan: 'Semesteran', status: 'active', joined: '2026-10-20', attempts: 47, phone: '6281234567893', subscriptionEnds: '2027-04-20' },
  { username: 'rudi', plan: 'Bulanan', status: 'expired', joined: '2026-09-15', attempts: 8, phone: '6281234567894', subscriptionEnds: '2026-10-15' },
]

const USERS_KEY = 'gts_admin_user_overrides'

export function getUserOverrides(): Record<string, UserOverride> {
  return read<Record<string, UserOverride>>(USERS_KEY) ?? {}
}

export function setUserOverride(username: string, override: UserOverride): void {
  const all = getUserOverrides()
  all[username] = { ...(all[username] ?? {}), ...override }
  write(USERS_KEY, all)
}

export function getEffectiveUsers(): AdminUser[] {
  const overrides = getUserOverrides()
  return MOCK_ADMIN_USERS.map(u => {
    const o = overrides[u.username]
    return o ? { ...u, ...o } : u
  })
}

// ---- Attempts recorded in this browser ----

export interface AttemptSummary {
  paperId: string
  score: number
  correct: number
  total: number
  finishedAt: string
  username?: string
}

export function getLocalAttempts(): AttemptSummary[] {
  const out: AttemptSummary[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('gts_result_')) {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const r = JSON.parse(raw) as { paperId: string; score: number; correct: number; total: number; finishedAt: string; username?: string }
        out.push({ paperId: r.paperId, score: r.score, correct: r.correct, total: r.total, finishedAt: r.finishedAt, username: r.username })
      }
    }
  } catch {
    /* noop */
  }
  return out.sort((a, b) => (b.finishedAt > a.finishedAt ? 1 : -1))
}

/* ------------------------------------------------------------------ */
/* AI question drafts: admin generates via panel, QCs, then approves   */
/* into the bank. Until the real backend exists, in-panel generation   */
/* is a workflow stub — the real LLM path is scripts/generate-        */
/* questions/. Drafts and approvals persist in localStorage.           */
/* ------------------------------------------------------------------ */

import type { Question } from '~/data/mock'
import { QUESTIONS } from '~/data/mock'

export type DraftItemStatus = 'pending' | 'approved' | 'rejected'

export interface DraftItem extends Question {
  draftId: string
  draftStatus: DraftItemStatus
}

export interface QuestionDraft {
  id: string
  materialSlug: string
  part: number
  targetDifficulty: DifficultyLevel
  topic: string
  createdAt: string
  status: 'review' | 'merged'
  items: DraftItem[]
}

const DRAFTS_KEY = 'gts_admin_drafts'

export function getDrafts(): QuestionDraft[] {
  return read<QuestionDraft[]>(DRAFTS_KEY) ?? []
}

function writeDrafts(drafts: QuestionDraft[]): void {
  write(DRAFTS_KEY, drafts)
}

export function saveDraft(draft: QuestionDraft): void {
  const drafts = getDrafts().filter(d => d.id !== draft.id)
  drafts.unshift(draft)
  writeDrafts(drafts)
}

export function setDraftItemStatus(draftId: string, index: number, status: DraftItemStatus): void {
  const drafts = getDrafts().map(d => {
    if (d.id !== draftId) return d
    const items = d.items.map((it, i) => (i === index ? { ...it, draftStatus: status } : it))
    return { ...d, items }
  })
  writeDrafts(drafts)
}

export function setAllDraftItems(draftId: string, status: DraftItemStatus): void {
  const drafts = getDrafts().map(d => {
    if (d.id !== draftId) return d
    return { ...d, items: d.items.map(it => ({ ...it, draftStatus: status })) }
  })
  writeDrafts(drafts)
}

export function removeDraft(draftId: string): void {
  writeDrafts(getDrafts().filter(d => d.id !== draftId))
}

/** Small built-in template pool so the generate → QC → approve workflow
 *  can be exercised in-panel before the backend calls the real API. */
const DRAFT_TEMPLATES: { part: number; stem: string; options: [string, string, string, string]; correct: string; why: string }[] = [
  { part: 5, stem: 'The marketing team will _______ the new campaign results at Friday\u2019s meeting.', options: ['present', 'presentation', 'presented', 'presents'], correct: 'A', why: 'DRAFT template — needs human review.' },
  { part: 5, stem: '_______ the delay, all shipments arrived before the deadline.', options: ['Despite', 'Although', 'Because', 'However'], correct: 'A', why: 'DRAFT template — needs human review.' },
  { part: 5, stem: 'Employees are requested to _______ their expense reports by the end of the month.', options: ['submit', 'submission', 'submitted', 'submits'], correct: 'A', why: 'DRAFT template — needs human review.' },
  { part: 5, stem: 'The new policy applies to _______ departments across the company.', options: ['all', 'every', 'each', 'any'], correct: 'A', why: 'DRAFT template — needs human review.' },
  { part: 5, stem: 'Mr. Tanaka, _______ experience in logistics is extensive, will lead the project.', options: ['whose', 'who', 'whom', 'which'], correct: 'A', why: 'DRAFT template — needs human review.' },
  { part: 5, stem: 'The conference room has been _______ for the client presentation.', options: ['reserved', 'reserve', 'reserving', 'reservation'], correct: 'A', why: 'DRAFT template — needs human review.' },
  { part: 6, stem: 'Please review the attached invoice and let us know if anything looks _______.', options: ['incorrect', 'incorrectly', 'correct', 'correction'], correct: 'A', why: 'DRAFT template — needs human review.' },
  { part: 7, stem: 'According to the memo, what should employees do before leaving the office?', options: ['Lock all windows', 'Turn off the lights', 'Submit a report', 'Call security'], correct: 'A', why: 'DRAFT template — needs human review.' },
]

export function mockGenerateDraftItems(
  materialSlug: string,
  part: number,
  count: number,
  difficulty: DifficultyLevel,
  topic: string
): { draftId: string; items: DraftItem[] } {
  const draftId = `draft-${Date.now().toString(36)}`
  const pool = DRAFT_TEMPLATES.filter(t => t.part === part)
  const src = pool.length > 0 ? pool : DRAFT_TEMPLATES
  const items: DraftItem[] = []
  for (let i = 0; i < count; i++) {
    const tpl = src[i % src.length] as (typeof src)[number]
    const suffix = topic ? ` [${topic}]` : ''
    items.push({
      materialSlug,
      number: 0,
      part: tpl.part,
      skill: 'reading',
      stem: tpl.stem + suffix,
      options: tpl.options.map((text, oi) => ({ letter: 'ABCD'[oi] as string, text })),
      correctLetter: tpl.correct,
      explanation: tpl.why,
      draftId: `${draftId}-${i}`,
      draftStatus: 'pending',
    })
  }
  return { draftId, items }
}

/* ------------------------------------------------------------------ */
/* Bank additions: approved drafts enter the live bank with continuing */
/* numbers. Served to the app together with the static bank.           */
/* ------------------------------------------------------------------ */

export interface BankAddition extends Question {
  source: 'ai-draft' | 'batch'
}

const BANK_KEY = 'gts_admin_bank_additions'

export function getBankAdditions(): BankAddition[] {
  return read<BankAddition[]>(BANK_KEY) ?? []
}

export function liveQuestionsForMaterial(slug: string): Question[] {
  const base = QUESTIONS.filter(q => q.materialSlug === slug)
  const added = getBankAdditions().filter(q => q.materialSlug === slug)
  return [...base, ...added]
}

export function nextQuestionNumber(slug: string): number {
  const nums = liveQuestionsForMaterial(slug).map(q => q.number)
  return (nums.length > 0 ? Math.max(...nums) : 0) + 1
}

/** Move approved draft items into the bank with continuing numbers. */
export function approveDraftIntoBank(draftId: string): number {
  const drafts = getDrafts()
  const draft = drafts.find(d => d.id === draftId)
  if (!draft) return 0
  const approved = draft.items.filter(it => it.draftStatus === 'approved')
  if (approved.length === 0) return 0
  let n = nextQuestionNumber(draft.materialSlug)
  const additions: BankAddition[] = approved.map(it => {
    const { draftId: _d, draftStatus: _s, ...q } = it
    return { ...q, number: n++, source: 'ai-draft' }
  })
  const stored = getBankAdditions()
  write(BANK_KEY, [...stored, ...additions])
  // tag difficulty for the adaptive engine
  const diffs = getDifficultyOverrides()
  additions.forEach(a => {
    diffs[`lr-${a.number}`] = draft.targetDifficulty
  })
  try {
    localStorage.setItem(DIFF_KEY, JSON.stringify(diffs))
  } catch {
    /* noop */
  }
  writeDrafts(drafts.map(d => (d.id === draftId ? { ...d, status: 'merged' as const } : d)))
  return additions.length
}

/* ------------------------------------------------------------------ */
/* Packages: which materials each subscription tier unlocks.            */
/* ------------------------------------------------------------------ */

export interface PackageDef {
  id: string
  priceLabel: string
  materialLimit: number | 'all'
}

export const PACKAGES: PackageDef[] = [
  { id: 'bulanan', priceLabel: 'Rp75rb', materialLimit: 1 },
  { id: 'triwulanan', priceLabel: 'Rp199rb', materialLimit: 2 },
  { id: 'semesteran', priceLabel: 'Rp349rb', materialLimit: 'all' },
]

const PKG_KEY = 'gts_admin_package_materials'

/** Manual material assignment per package (Semesteran always = all). */
export function getPackageMaterials(): Record<string, string[]> {
  return read<Record<string, string[]>>(PKG_KEY) ?? {}
}

export function setPackageMaterial(pkgId: string, slug: string, included: boolean): void {
  const all = getPackageMaterials()
  const cur = new Set(all[pkgId] ?? [])
  if (included) cur.add(slug)
  else cur.delete(slug)
  all[pkgId] = [...cur]
  write(PKG_KEY, all)
}

/** Effective materials for a package: manual picks, or all owned for Semesteran. */
export function packageMaterials(pkgId: string, ownedSlugs: string[]): string[] {
  if (pkgId === 'semesteran') return ownedSlugs
  const manual = getPackageMaterials()[pkgId]
  if (manual && manual.length > 0) return manual.filter(s => ownedSlugs.includes(s))
  return ownedSlugs.slice(0, pkgId === 'bulanan' ? 1 : 2)
}
