/** Typed localStorage helpers for the GTS demo (answers, results, notes). */

export interface AuthState {
  /** Email of the signed-in user (Google sign-in). UI-only copy of the
   * server session — the server never trusts this value. */
  username: string
  remember: boolean
  role: 'admin' | 'user'
  name?: string
  picture?: string
}

export type AnswerMap = Record<number, string>

export interface TestResult {
  paperId: string
  attempt: number
  score: number
  cefr: string
  correct: number
  total: number
  answers: AnswerMap
  finishedAt: string
  username?: string
  /** Seconds spent per question number — feeds the adaptive engine. */
  timings?: Record<number, number>
  /** Per-part tally computed at submit time from the bank questions —
   * { "<part>": {correct, total} }. Absent on results saved before
   * per-part tallies existed; the Performance radar stays empty for
   * those instead of guessing. */
  parts?: Record<number, { correct: number, total: number }>
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
    /* storage unavailable — demo continues in memory */
  }
}

export function getAuth(): AuthState | null {
  return read<AuthState>('gts_auth')
}

export function setAuth(auth: AuthState): void {
  write('gts_auth', auth)
}

export function clearAuth(): void {
  try {
    localStorage.removeItem('gts_auth')
  } catch {
    /* noop */
  }
}

function answersKey(paperId: string, attempt: number): string {
  return `gts_answers_${paperId}_${attempt}`
}

export function loadAnswers(paperId: string, attempt: number): AnswerMap {
  return read<AnswerMap>(answersKey(paperId, attempt)) ?? {}
}

export function saveAnswers(paperId: string, attempt: number, answers: AnswerMap): void {
  write(answersKey(paperId, attempt), answers)
}

export function clearAnswers(paperId: string, attempt: number): void {
  try {
    localStorage.removeItem(answersKey(paperId, attempt))
  } catch {
    /* noop */
  }
}

function resultKey(paperId: string): string {
  return `gts_result_${paperId}`
}

export function saveResult(result: TestResult): void {
  write(resultKey(result.paperId), result)
}

export function getResult(paperId: string): TestResult | null {
  return read<TestResult>(resultKey(paperId))
}

export function getNote(paperId: string): string {
  return read<string>(`gts_notes_${paperId}`) ?? ''
}

/** In-progress attempts saved in this browser: `gts_answers_<paperId>_<attempt>`
 * keys holding at least one answer. Answers are cleared on submit, so a
 * saved key with answers is a genuinely unfinished attempt. */
export interface InProgressAttempt {
  paperId: string
  attempt: number
  answered: number
}

export function listInProgressAttempts(paperIds: string[]): InProgressAttempt[] {
  const wanted = new Set(paperIds)
  const found: InProgressAttempt[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('gts_answers_')) continue
      const rest = key.slice('gts_answers_'.length)
      const sep = rest.lastIndexOf('_')
      if (sep <= 0) continue
      const paperId = rest.slice(0, sep)
      const attempt = Number(rest.slice(sep + 1))
      if (!wanted.has(paperId) || !Number.isInteger(attempt) || attempt < 1) continue
      const answered = Object.keys(loadAnswers(paperId, attempt)).length
      if (answered > 0) found.push({ paperId, attempt, answered })
    }
  } catch {
    /* storage unavailable — no in-progress attempts to report */
  }
  // Paper order first (as listed by the caller), then lowest attempt.
  found.sort((a, b) => paperIds.indexOf(a.paperId) - paperIds.indexOf(b.paperId) || a.attempt - b.attempt)
  return found
}

/** Completed local results among the given papers, in paper order. */
export function listLocalResults(paperIds: string[]): TestResult[] {
  const out: TestResult[] = []
  for (const id of paperIds) {
    const r = getResult(id)
    if (r) out.push(r)
  }
  return out
}

export function saveNote(paperId: string, text: string): void {
  write(`gts_notes_${paperId}`, text)
}

export function getDisplayName(): string {
  return read<string>('gts_display_name') ?? ''
}

export function setDisplayName(name: string): void {
  write('gts_display_name', name)
}

/**
 * Last material the user opened (`/m/<slug>`). The Tes home is the
 * post-login landing, so this is where "continue" goes; the picker
 * (`/materials`) is reached explicitly via "Ganti materi". One
 * active material at a time — there is no multi-material home.
 */
export function getLastMaterial(): string | null {
  try {
    return localStorage.getItem('gts_last_material')
  } catch {
    return null
  }
}

export function setLastMaterial(slug: string): void {
  try {
    localStorage.setItem('gts_last_material', slug)
  } catch {
    /* storage unavailable */
  }
}

/* Free-test (no login) pending answers, gated behind auth at result time. */
export function saveFreeAnswers(answers: AnswerMap): void {
  write('gts_free_answers', answers)
}

export function loadFreeAnswers(): AnswerMap | null {
  return read<AnswerMap>('gts_free_answers')
}

export function saveFreeTimings(timings: Record<number, number>): void {
  write('gts_free_timings', timings)
}

export function loadFreeTimings(): Record<number, number> | null {
  return read<Record<number, number>>('gts_free_timings')
}

export function clearFreeAnswers(): void {
  try {
    localStorage.removeItem('gts_free_answers')
    localStorage.removeItem('gts_free_timings')
  } catch {
    /* storage unavailable */
  }
}
