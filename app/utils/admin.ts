/** Minimal admin helpers for the GTS /admin panel (demo: localStorage-backed). */

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5

export interface AdminQuestionView {
  id: string
  bank: string
  section: string
  stem: string
  options: { letter: string; text: string }[]
  correctLetter: string
  /** localStorage override key (`toeic-lr-N` / `free-N`), when editable. */
  ovKey?: string
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
  { username: 'maya', plan: 'Bulanan', status: 'active', joined: '2026-10-22', attempts: 19, phone: '6281234567895', subscriptionEnds: '2026-11-22' },
  { username: 'joko', plan: 'Triwulanan', status: 'active', joined: '2026-10-18', attempts: 26, phone: '6281234567896', subscriptionEnds: '2027-01-18' },
  { username: 'rina', plan: 'Free', status: 'trial', joined: '2026-11-01', attempts: 2, phone: '6281234567897', subscriptionEnds: '2026-11-08' },
  { username: 'doni', plan: 'Semesteran', status: 'active', joined: '2026-10-12', attempts: 52, phone: '6281234567898', subscriptionEnds: '2027-04-12' },
  { username: 'lina', plan: 'Bulanan', status: 'expired', joined: '2026-08-30', attempts: 14, phone: '6281234567899', subscriptionEnds: '2026-09-30' },
  { username: 'fajar', plan: 'Triwulanan', status: 'active', joined: '2026-10-27', attempts: 9, phone: '6281234567800', subscriptionEnds: '2027-01-27' },
  { username: 'nina', plan: 'Free', status: 'trial', joined: '2026-11-02', attempts: 1, phone: '6281234567801', subscriptionEnds: '2026-11-09' },
  { username: 'eko', plan: 'Bulanan', status: 'active', joined: '2026-10-24', attempts: 22, phone: '6281234567802', subscriptionEnds: '2026-11-24' },
  { username: 'wulan', plan: 'Semesteran', status: 'active', joined: '2026-10-15', attempts: 38, phone: '6281234567803', subscriptionEnds: '2027-04-15' },
  { username: 'bima', plan: 'Bulanan', status: 'expired', joined: '2026-09-05', attempts: 6, phone: '6281234567804', subscriptionEnds: '2026-10-05' },
  { username: 'tari', plan: 'Triwulanan', status: 'active', joined: '2026-10-29', attempts: 11, phone: '6281234567805', subscriptionEnds: '2027-01-29' },
  { username: 'yoga', plan: 'Free', status: 'trial', joined: '2026-11-03', attempts: 4, phone: '6281234567806', subscriptionEnds: '2026-11-10' },
  { username: 'putri', plan: 'Bulanan', status: 'active', joined: '2026-10-31', attempts: 7, phone: '6281234567807', subscriptionEnds: '2026-11-30' },
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
// Convention: options[0] is the correct answer; the generator shuffles positions.
// Parts 6-7 carry a short passage in `context`, shown above the stem.
// This is a workflow stub so the generate → QC → bank flow can be tried
// in-panel; real unique questions come from the API via scripts/.
const DRAFT_TEMPLATES: { part: number; stem: string; context?: string; options: [string, string, string, string]; why: string }[] = [
  // ---- Part 5 ----
  { part: 5, stem: 'The marketing team will _______ the new campaign results at Friday\u2019s meeting.', options: ['present', 'presentation', 'presented', 'presents'], why: 'DRAFT template — needs human review.' },
  { part: 5, stem: '_______ the delay, all shipments arrived before the deadline.', options: ['Despite', 'Although', 'Because', 'However'], why: 'DRAFT template — needs human review.' },
  { part: 5, stem: 'Employees are requested to _______ their expense reports by the end of the month.', options: ['submit', 'submission', 'submitted', 'submits'], why: 'DRAFT template — needs human review.' },
  { part: 5, stem: 'The new policy applies to _______ departments across the company.', options: ['all', 'every', 'each', 'any'], why: 'DRAFT template — needs human review.' },
  { part: 5, stem: 'Mr. Tanaka, _______ experience in logistics is extensive, will lead the project.', options: ['whose', 'who', 'whom', 'which'], why: 'DRAFT template — needs human review.' },
  { part: 5, stem: 'The conference room has been _______ for the client presentation.', options: ['reserved', 'reserve', 'reserving', 'reservation'], why: 'DRAFT template — needs human review.' },
  { part: 5, stem: 'The quarterly sales report will be _______ to all regional managers tomorrow.', options: ['distributed', 'distribute', 'distributing', 'distribution'], why: 'DRAFT template — needs human review.' },
  { part: 5, stem: '_______ the new software, the accounting team processes invoices twice as fast.', options: ['Thanks to', 'Despite', 'Because', 'Although'], why: 'DRAFT template — needs human review.' },
  { part: 5, stem: 'Candidates _______ to bring their identification cards to the interview.', options: ['are reminded', 'remind', 'reminded', 'reminding'], why: 'DRAFT template — needs human review.' },
  { part: 5, stem: 'The CEO\u2019s speech _______ the company\u2019s commitment to sustainability.', options: ['emphasized', 'emphasis', 'emphasize', 'emphatic'], why: 'DRAFT template — needs human review.' },
  // ---- Part 6 ----
  { part: 6, context: 'To: Accounting Team\nSubject: Monthly invoice review', stem: 'Please review the attached invoice and let us know if anything looks _______.', options: ['incorrect', 'incorrectly', 'correct', 'correction'], why: 'DRAFT template — needs human review.' },
  { part: 6, context: 'Internal announcement: We are pleased to share some staffing news.', stem: 'Ms. Rivera has been _______ to regional director, effective June 1.', options: ['promoted', 'promote', 'promotion', 'promoting'], why: 'DRAFT template — needs human review.' },
  { part: 6, context: 'From: HR Department\nPlease complete the onboarding paperwork.', stem: 'All employees must _______ their security badges when entering the building.', options: ['wear', 'wearing', 'wore', 'worn'], why: 'DRAFT template — needs human review.' },
  { part: 6, context: 'IT notice: Scheduled maintenance this weekend.', stem: 'The IT department will _______ the system upgrade on Saturday night.', options: ['perform', 'performance', 'performed', 'performing'], why: 'DRAFT template — needs human review.' },
  { part: 6, context: 'Thank you for attending our product launch event.', stem: 'Thank you for your _______ in our new product line.', options: ['interest', 'interesting', 'interested', 'interests'], why: 'DRAFT template — needs human review.' },
  { part: 6, context: 'Meeting update for all team members.', stem: 'The meeting has been _______ to next Thursday due to the holiday.', options: ['postponed', 'postpone', 'postponing', 'postponement'], why: 'DRAFT template — needs human review.' },
  { part: 6, context: 'From: Finance\nAttached is this quarter\u2019s budget.', stem: 'Please find _______ the quarterly budget summary for your review.', options: ['attached', 'attach', 'attachment', 'attaching'], why: 'DRAFT template — needs human review.' },
  { part: 6, context: 'Guest information: Getting to the airport.', stem: 'The hotel offers a complimentary shuttle _______ to the airport.', options: ['service', 'serve', 'serving', 'serviced'], why: 'DRAFT template — needs human review.' },
  { part: 6, context: 'Role description: Finance team duties.', stem: 'The finance team is responsible _______ preparing the annual budget.', options: ['for', 'to', 'of', 'with'], why: 'DRAFT template — needs human review.' },
  { part: 6, context: 'Store policy update, effective immediately.', stem: 'Customers can return items _______ 30 days of purchase.', options: ['within', 'inside', 'during', 'for'], why: 'DRAFT template — needs human review.' },
  // ---- Part 7 ----
  { part: 7, context: 'Memo: Please lock all windows and turn off the lights before leaving the office.', stem: 'According to the memo, what should employees do before leaving the office?', options: ['Lock windows and turn off lights', 'Submit a report', 'Call security', 'Water the plants'], why: 'DRAFT template — needs human review.' },
  { part: 7, context: 'Library notice: Closed Monday for maintenance. Books due Monday may be returned Tuesday without penalty.', stem: 'What can library users do on Tuesday?', options: ['Return books without penalty', 'Borrow new books', 'Use the reading room', 'Pay overdue fines'], why: 'DRAFT template — needs human review.' },
  { part: 7, context: 'Airline email: Your flight GA-204 on Friday is rescheduled to 8:40 a.m. Please arrive at least 2 hours early.', stem: 'What should the passenger do?', options: ['Arrive by 6:40 a.m.', 'Arrive at 8:40 a.m.', 'Cancel the flight', 'Change terminals'], why: 'DRAFT template — needs human review.' },
  { part: 7, context: 'Grand opening sale: 20% off all items this weekend only.', stem: 'When is the discount available?', options: ['This weekend', 'Next month', 'Every weekend', 'On weekdays'], why: 'DRAFT template — needs human review.' },
  { part: 7, context: 'Parking notice: The staff lot closes for repairs March 3-5. Please use the north lot.', stem: 'Where should staff park on March 4?', options: ['The north lot', 'The staff lot', 'On the street', 'In the garage'], why: 'DRAFT template — needs human review.' },
  { part: 7, context: 'Workshop "Effective Emails" — Room 301, 2 p.m. Thursday. Registration required by Wednesday.', stem: 'Where will the workshop be held?', options: ['Room 301', 'Room 103', 'Online', 'The lobby'], why: 'DRAFT template — needs human review.' },
  { part: 7, context: 'Thank you for your application. Interviews are next week; we will contact shortlisted candidates by Friday.', stem: 'Who will be contacted by Friday?', options: ['Shortlisted candidates', 'All applicants', 'New employees', 'References'], why: 'DRAFT template — needs human review.' },
  { part: 7, context: 'Conference notice: Attendees must wear their badges at all times.', stem: 'What is required of attendees?', options: ['Wear their badges', 'Register again', 'Stay in the lobby', 'Show ID at lunch'], why: 'DRAFT template — needs human review.' },
  { part: 7, context: 'Cafeteria announcement: Lunch will be served until 1:30 p.m. starting Monday.', stem: 'Until what time is lunch served?', options: ['1:30 p.m.', '12:30 p.m.', '2:30 p.m.', 'All day'], why: 'DRAFT template — needs human review.' },
  { part: 7, context: 'Company newsletter: Our new Sydney office opens April 1 with 15 staff members.', stem: 'How many staff will the Sydney office have?', options: ['15', '50', '10', '5'], why: 'DRAFT template — needs human review.' },
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
  const letters = ['A', 'B', 'C', 'D']
  const items: DraftItem[] = []
  for (let i = 0; i < count; i++) {
    const tpl = src[i % src.length] as (typeof src)[number]
    const suffix = topic ? ` [${topic}]` : ''
    // The template's correct option is options[0]; shuffle so the key is random.
    const correctText = tpl.options[0]
    const shuffled = [...tpl.options]
    for (let j = shuffled.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1))
      const tmp = shuffled[j] as string
      shuffled[j] = shuffled[k] as string
      shuffled[k] = tmp
    }
    const correctLetter = letters[shuffled.indexOf(correctText)] as string
    items.push({
      materialSlug,
      number: 0,
      part: tpl.part,
      skill: 'reading',
      stem: tpl.stem + suffix,
      options: shuffled.map((text, oi) => ({ letter: letters[oi] as string, text })),
      correctLetter,
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
  return liveAllQuestions().filter(q => q.materialSlug === slug)
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

/** Replace the whole manual material list for a package. */
export function setPackageMaterials(pkgId: string, slugs: string[]): void {
  const all = getPackageMaterials()
  all[pkgId] = [...slugs]
  write(PKG_KEY, all)
}

/** Effective materials for a package: manual picks, or all owned for Semesteran. */
export function packageMaterials(pkgId: string, ownedSlugs: string[]): string[] {
  if (pkgId === 'semesteran') return ownedSlugs
  const manual = getPackageMaterials()[pkgId]
  if (manual && manual.length > 0) return manual.filter(s => ownedSlugs.includes(s))
  return ownedSlugs.slice(0, pkgId === 'bulanan' ? 1 : 2)
}

/* ------------------------------------------------------------------ */
/* Question overrides: admin edits to bank questions (stem, options,   */
/* correct key). Keyed by `${materialSlug}-${number}` (or `free-N` for */
/* the free bank), persisted in localStorage, applied everywhere the   */
/* live bank is served. Difficulty stays in setDifficulty.              */
/* ------------------------------------------------------------------ */

import { FREE_TEST_QUESTIONS, type FreeQuestion } from '~/data/mock'

export interface QuestionOverride {
  stem?: string
  options?: { letter: string; text: string }[]
  correctLetter?: string
}

const QOVERRIDE_KEY = 'gts_admin_question_overrides'

export function getQuestionOverrides(): Record<string, QuestionOverride> {
  return read<Record<string, QuestionOverride>>(QOVERRIDE_KEY) ?? {}
}

export function setQuestionOverride(id: string, override: QuestionOverride): void {
  const all = getQuestionOverrides()
  all[id] = { ...(all[id] ?? {}), ...override }
  write(QOVERRIDE_KEY, all)
}

export function clearQuestionOverride(id: string): void {
  const all = getQuestionOverrides()
  delete all[id]
  write(QOVERRIDE_KEY, all)
}

/** Override key for a bank question as shown in the admin bank view. */
export function overrideKeyFor(materialSlug: string, number: number): string {
  return `${materialSlug}-${number}`
}

function applyOverride(q: Question, key: string): Question {
  const o = getQuestionOverrides()[key]
  if (!o) return q
  return {
    ...q,
    stem: o.stem ?? q.stem,
    options: o.options ?? q.options,
    correctLetter: o.correctLetter ?? q.correctLetter,
  }
}

/** Full live bank: static + approved AI drafts + admin edits. */
export function liveAllQuestions(): Question[] {
  return [...QUESTIONS, ...getBankAdditions()].map(q =>
    applyOverride(q, overrideKeyFor(q.materialSlug, q.number))
  )
}

export function liveFreeQuestions(): FreeQuestion[] {
  const overrides = getQuestionOverrides()
  return FREE_TEST_QUESTIONS.map(q => {
    const o = overrides[`free-${q.number}`]
    if (!o) return q
    return {
      ...q,
      stem: o.stem ?? q.stem,
      options: o.options ?? q.options,
      correctLetter: o.correctLetter ?? q.correctLetter,
    }
  })
}

/* ------------------------------------------------------------------ */
/* Volumes: a bank holds tens-to-hundreds of questions, grouped into   */
/* named volumes per subject (e.g. "TOEIC 1", "TOEIC 2"). AI-generated */
/* drafts land as draft volumes; admin approves -> active volume.      */
/* ------------------------------------------------------------------ */

export type VolumeStatus = 'active' | 'draft'
export type VolumeCategory = 'english' | 'stem'

export interface VolumeQuestionRef {
  /** materialSlug for bank questions, 'free' for the free bank. */
  scope: string
  number: number
}

export interface Volume {
  id: string
  name: string
  materialSlug: string
  category: VolumeCategory
  status: VolumeStatus
  createdAt: string
  questions: VolumeQuestionRef[]
}

const VOLUMES_KEY = 'gts_admin_volumes'

export const MATERIAL_CATEGORIES: Record<string, VolumeCategory> = {
  'toeic-lr': 'english',
  'toeic-sw': 'english',
  'toefl-ibt': 'english',
  'ielts-academic': 'english',
}

export function volumeCategoryFor(materialSlug: string): VolumeCategory {
  return MATERIAL_CATEGORIES[materialSlug] ?? 'english'
}

function qkey(scope: string, number: number): string {
  return `${scope}-${number}`
}

export function getVolumes(): Volume[] {
  const stored = read<Volume[]>(VOLUMES_KEY)
  if (stored) return stored
  // Seed from the existing bank: one active volume per material with data.
  const seed: Volume[] = []
  const now = new Date().toISOString()
  const lr = liveAllQuestions().filter(q => q.materialSlug === 'toeic-lr')
  if (lr.length > 0) {
    seed.push({
      id: 'vol-toeic-1', name: 'TOEIC 1', materialSlug: 'toeic-lr',
      category: 'english', status: 'active', createdAt: now,
      questions: lr.map(q => ({ scope: 'toeic-lr', number: q.number })),
    })
  }
  const sw = liveAllQuestions().filter(q => q.materialSlug === 'toeic-sw')
  if (sw.length > 0) {
    seed.push({
      id: 'vol-toeic-sw-1', name: 'TOEIC SW 1', materialSlug: 'toeic-sw',
      category: 'english', status: 'active', createdAt: now,
      questions: sw.map(q => ({ scope: 'toeic-sw', number: q.number })),
    })
  }
  const free = liveFreeQuestions()
  if (free.length > 0) {
    seed.push({
      id: 'vol-free-1', name: 'Free Test 1', materialSlug: 'toeic-lr',
      category: 'english', status: 'active', createdAt: now,
      questions: free.map(q => ({ scope: 'free', number: q.number })),
    })
  }
  write(VOLUMES_KEY, seed)
  return seed
}

function writeVolumes(volumes: Volume[]): void {
  write(VOLUMES_KEY, volumes)
}

export function saveVolume(volume: Volume): void {
  const all = getVolumes().filter(v => v.id !== volume.id)
  all.unshift(volume)
  writeVolumes(all)
}

export function getVolume(id: string): Volume | undefined {
  return getVolumes().find(v => v.id === id)
}

export function deleteVolume(id: string): void {
  writeVolumes(getVolumes().filter(v => v.id !== id))
}

/** Next "TOEIC N" style name for a material. */
export function nextVolumeName(materialSlug: string): string {
  const base = materialSlug === 'toeic-lr' ? 'TOEIC' : materialSlug === 'toeic-sw' ? 'TOEIC SW' : materialSlug
  const existing = getVolumes().filter(v => v.materialSlug === materialSlug)
  let n = existing.length + 1
  const names = new Set(existing.map(v => v.name))
  while (names.has(`${base} ${n}`)) n++
  return `${base} ${n}`
}

/** Create a draft volume from AI-generated items (not yet in the bank). */
export function createDraftVolume(
  name: string,
  materialSlug: string,
  part: number,
  items: DraftItem[],
): Volume {
  const id = `vol-draft-${Date.now().toString(36)}`
  // Draft items are not in the bank yet; track them by negative pseudo-numbers.
  const volume: Volume = {
    id,
    name,
    materialSlug,
    category: volumeCategoryFor(materialSlug),
    status: 'draft',
    createdAt: new Date().toISOString(),
    questions: items.map((it, i) => ({ scope: `draft:${id}`, number: -(i + 1) })),
  }
  // Stash the draft items themselves so the detail page can render them.
  write(`gts_admin_draft_items_${id}`, items)
  saveVolume(volume)
  return volume
}

export function getDraftVolumeItems(volumeId: string): DraftItem[] {
  return read<DraftItem[]>(`gts_admin_draft_items_${volumeId}`) ?? []
}

export function setDraftVolumeItems(volumeId: string, items: DraftItem[]): void {
  write(`gts_admin_draft_items_${volumeId}`, items)
}

/**
 * Activate a draft volume: approved items enter the bank with continuing
 * numbers and the volume becomes active holding the real references.
 */
export function activateVolume(volumeId: string): number {
  const volume = getVolume(volumeId)
  if (!volume || volume.status !== 'draft') return 0
  const items = getDraftVolumeItems(volumeId).filter(it => it.draftStatus === 'approved')
  if (items.length === 0) return 0
  let n = nextQuestionNumber(volume.materialSlug)
  const additions: BankAddition[] = items.map(it => {
    const { draftId: _d, draftStatus: _s, ...q } = it
    return { ...q, number: n++, source: 'ai-draft' as const }
  })
  const stored = getBankAdditions()
  write(BANK_KEY, [...stored, ...additions])
  const diffs = getDifficultyOverrides()
  // target difficulty was stored on the draft items' volume; default L3
  additions.forEach(a => {
    diffs[`lr-${a.number}`] = diffs[`lr-${a.number}`] ?? 3
  })
  try {
    localStorage.setItem(DIFF_KEY, JSON.stringify(diffs))
  } catch {
    /* noop */
  }
  volume.status = 'active'
  volume.questions = additions.map(a => ({ scope: a.materialSlug, number: a.number }))
  saveVolume(volume)
  try {
    localStorage.removeItem(`gts_admin_draft_items_${volumeId}`)
  } catch {
    /* noop */
  }
  return additions.length
}

/** Resolve a volume's questions to full question objects (with overrides). */
export function volumeQuestions(volume: Volume): Question[] {
  if (volume.status === 'draft') {
    const items = getDraftVolumeItems(volume.id)
    return items.map(it => {
      const { draftId: _d, draftStatus: _s, ...q } = it
      return q as Question
    })
  }
  const bank = liveAllQuestions()
  const free = liveFreeQuestions()
  const out: Question[] = []
  for (const ref of volume.questions) {
    if (ref.scope === 'free') {
      const fq = free.find(q => q.number === ref.number)
      if (fq) {
        out.push({
          materialSlug: 'toeic-lr',
          number: fq.number,
          part: 0,
          skill: 'reading',
          stem: fq.stem,
          options: fq.options,
          correctLetter: fq.correctLetter,
          explanation: '',
        })
      }
    } else {
      const q = bank.find(q => q.materialSlug === ref.scope && q.number === ref.number)
      if (q) out.push(q)
    }
  }
  return out
}

/** Volume stats for the Databases cards. */
export function volumeStats(): {
  total: number
  byCategory: Record<VolumeCategory, number>
  byVolume: { id: string; name: string; count: number }[]
} {
  const volumes = getVolumes().filter(v => v.status === 'active')
  const byCategory: Record<VolumeCategory, number> = { english: 0, stem: 0 }
  const byVolume: { id: string; name: string; count: number }[] = []
  let total = 0
  for (const v of volumes) {
    const count = volumeQuestions(v).length
    total += count
    byCategory[v.category] = (byCategory[v.category] ?? 0) + count
    byVolume.push({ id: v.id, name: v.name, count })
  }
  return { total, byCategory, byVolume }
}

/* ------------------------------------------------------------------ */
/* Monthly activity (demo series; local attempts feed the current mo.) */
/* ------------------------------------------------------------------ */

export interface MonthPoint {
  month: string
  visits: number
  testTakers: number
}

const MONTHS_KEY = 'gts_admin_monthly'

const SEED_MONTHS: MonthPoint[] = [
  { month: '2026-06', visits: 820, testTakers: 96 },
  { month: '2026-07', visits: 1140, testTakers: 138 },
  { month: '2026-08', visits: 1610, testTakers: 201 },
  { month: '2026-09', visits: 2230, testTakers: 284 },
  { month: '2026-10', visits: 3120, testTakers: 402 },
]

export function getMonthly(): MonthPoint[] {
  const stored = read<MonthPoint[]>(MONTHS_KEY)
  if (stored) return stored
  write(MONTHS_KEY, SEED_MONTHS)
  return SEED_MONTHS
}

/** Test takers this month = seed baseline + local attempts this month. */
export function testTakersThisMonth(): number {
  const now = new Date()
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const seed = getMonthly().find(m => m.month === prefix)?.testTakers ?? 480
  let local = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('gts_result_')) {
        const raw = localStorage.getItem(key)
        if (raw && JSON.parse(raw).finishedAt?.startsWith(prefix)) local++
      }
    }
  } catch {
    /* noop */
  }
  return seed + local
}

/* ------------------------------------------------------------------ */
/* Vouchers                                                             */
/* ------------------------------------------------------------------ */

export interface Voucher {
  id: string
  name: string
  discount: number
  maxUsers: number
  usedUsers: number
  dueDate: string
}

const VOUCHERS_KEY = 'gts_admin_vouchers'

const SEED_VOUCHERS: Voucher[] = [
  { id: 'v-1', name: 'LAUNCH20', discount: 20, maxUsers: 200, usedUsers: 47, dueDate: '2026-12-31' },
  { id: 'v-2', name: 'STUDENT15', discount: 15, maxUsers: 500, usedUsers: 132, dueDate: '2027-03-31' },
]

export function getVouchers(): Voucher[] {
  const stored = read<Voucher[]>(VOUCHERS_KEY)
  if (stored) return stored
  write(VOUCHERS_KEY, SEED_VOUCHERS)
  return SEED_VOUCHERS
}

export function saveVoucher(v: Voucher): void {
  const all = getVouchers().filter(x => x.id !== v.id)
  all.unshift(v)
  write(VOUCHERS_KEY, all)
}

export function deleteVoucher(id: string): void {
  write(VOUCHERS_KEY, getVouchers().filter(x => x.id !== id))
}

/* ------------------------------------------------------------------ */
/* Managed users (admin can add; demo users remain until backend)       */
/* ------------------------------------------------------------------ */

const ADDED_USERS_KEY = 'gts_admin_added_users'

export function getAddedUsers(): AdminUser[] {
  return read<AdminUser[]>(ADDED_USERS_KEY) ?? []
}

export function addManagedUser(u: AdminUser): void {
  const all = getAddedUsers().filter(x => x.username !== u.username)
  all.unshift(u)
  write(ADDED_USERS_KEY, all)
}

export function allManagedUsers(): AdminUser[] {
  const overrides = getUserOverrides()
  const base = [...getAddedUsers(), ...MOCK_ADMIN_USERS].map(u => {
    const o = overrides[u.username]
    return o ? { ...u, ...o } : u
  })
  // de-dupe by username, added users win
  const seen = new Set<string>()
  return base.filter(u => {
    if (seen.has(u.username)) return false
    seen.add(u.username)
    return true
  })
}

/** Find the active volume containing a bank-view question id (`lr-19`, `free-7`). */
export function findVolumeForQuestion(questionId: string): Volume | undefined {
  let scope = ''
  let number = 0
  if (questionId.startsWith('lr-')) {
    scope = 'toeic-lr'
    number = Number(questionId.slice(3))
  } else if (questionId.startsWith('free-')) {
    scope = 'free'
    number = Number(questionId.slice(5))
  } else {
    return undefined
  }
  return getVolumes().find(
    v => v.status === 'active' && v.questions.some(q => q.scope === scope && q.number === number),
  )
}
