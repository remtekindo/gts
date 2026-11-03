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
