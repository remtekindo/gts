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

export function saveNote(paperId: string, text: string): void {
  write(`gts_notes_${paperId}`, text)
}

export function getDisplayName(): string {
  return read<string>('gts_display_name') ?? ''
}

export function setDisplayName(name: string): void {
  write('gts_display_name', name)
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
