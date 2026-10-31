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
  { username: 'budi', plan: 'Bulanan', status: 'active', joined: '2026-10-28', attempts: 12 },
  { username: 'sari', plan: 'Triwulanan', status: 'active', joined: '2026-10-25', attempts: 31 },
  { username: 'agus', plan: 'Free', status: 'trial', joined: '2026-10-30', attempts: 3 },
  { username: 'dewi', plan: 'Semesteran', status: 'active', joined: '2026-10-20', attempts: 47 },
  { username: 'rudi', plan: 'Bulanan', status: 'expired', joined: '2026-09-15', attempts: 8 },
]

// ---- Attempts recorded in this browser ----

export interface AttemptSummary {
  paperId: string
  score: number
  correct: number
  total: number
  finishedAt: string
}

export function getLocalAttempts(): AttemptSummary[] {
  const out: AttemptSummary[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('gts_result_')) {
        const raw = localStorage.getItem(key)
        if (!raw) continue
        const r = JSON.parse(raw) as { paperId: string; score: number; correct: number; total: number; finishedAt: string }
        out.push({ paperId: r.paperId, score: r.score, correct: r.correct, total: r.total, finishedAt: r.finishedAt })
      }
    }
  } catch {
    /* noop */
  }
  return out.sort((a, b) => (b.finishedAt > a.finishedAt ? 1 : -1))
}
