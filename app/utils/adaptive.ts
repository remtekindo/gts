/**
 * Adaptive engine v1 — the behind-the-scenes "AI" in Rey's masterplan.
 *
 * It does NOT generate questions live and never talks to the customer.
 * It reads what the customer already did (test results + practice attempts),
 * measures accuracy per part (strong vs weak areas), and groups bank
 * questions into a personal "playlist" — like Spotify grouping songs.
 *
 * Plain algorithms (free). The LLM is only used to *create* questions.
 */
import { QUESTIONS, getPaper, type Question } from '~/data/mock'
import { getBankAdditions, getDifficultyOverrides, liveAllQuestions, bankViewId } from './admin'

export interface PartAbility {
  part: number
  skill: string
  answered: number
  correct: number
  /** 0..1, null when the user never touched this part. */
  accuracy: number | null
  /** 1..5 adaptive level for this part. */
  level: 1 | 2 | 3 | 4 | 5
  /** Weakness weight = 1 - accuracy; drives playlist share. */
  weight: number
}

export interface PlaylistBreakdown {
  part: number
  count: number
  accuracy: number | null
  level: number
}

function isClient(): boolean {
  return typeof localStorage !== 'undefined'
}

function liveBank(): Question[] {
  return liveAllQuestions()
}

function questionByNumber(materialSlug: string, number: number): Question | undefined {
  return liveBank().find(q => q.materialSlug === materialSlug && q.number === number)
}

interface StoredResult {
  paperId: string
  answers?: Record<string, string>
  username?: string
}

interface PracticeAttempt {
  materialSlug: string
  number: number
  correct: boolean
  username?: string
  at: string
}

/** Per-part correct/answered from real test results + practice drills. */
export function analyzeAbility(materialSlug: string, username?: string): PartAbility[] {
  const stats = new Map<number, { correct: number; answered: number; skill: string }>()
  if (!isClient()) return []

  const bump = (part: number, skill: string, ok: boolean) => {
    const s = stats.get(part) ?? { correct: 0, answered: 0, skill }
    s.answered += 1
    if (ok) s.correct += 1
    stats.set(part, s)
  }

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('gts_result_')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const r = JSON.parse(raw) as StoredResult
      if (username && r.username && r.username !== username) continue
      const paper = getPaper(r.paperId)
      if (!paper || paper.materialSlug !== materialSlug) continue
      const answers = r.answers ?? {}
      for (const [numStr, chosen] of Object.entries(answers)) {
        const q = questionByNumber(materialSlug, Number(numStr))
        if (!q) continue
        bump(q.part, q.skill, chosen === q.correctLetter)
      }
    }
    const pracRaw = localStorage.getItem(`gts_practice_${materialSlug}`)
    if (pracRaw) {
      const attempts = JSON.parse(pracRaw) as PracticeAttempt[]
      for (const a of attempts) {
        if (username && a.username && a.username !== username) continue
        const q = questionByNumber(a.materialSlug, a.number)
        if (!q) continue
        bump(q.part, q.skill, a.correct)
      }
    }
  } catch {
    /* corrupted storage — treat as no data */
  }

  const parts = [...new Set(liveBank().filter(q => q.materialSlug === materialSlug).map(q => q.part))].sort((a, b) => a - b)
  return parts.map(part => {
    const s = stats.get(part)
    const answered = s?.answered ?? 0
    const correct = s?.correct ?? 0
    const accuracy = answered > 0 ? correct / answered : null
    // Level moves with accuracy: >=80% up, <50% down (spec v1).
    const level = (answered === 0 ? 3 : accuracy !== null && accuracy >= 0.8 ? 4 : accuracy !== null && accuracy < 0.5 ? 2 : 3) as 1 | 2 | 3 | 4 | 5
    // Weakness weighting; unseen parts get a fixed exploration share.
    const weight = accuracy === null ? 0.5 : Math.min(1, Math.max(0.1, 1 - accuracy))
    return { part, skill: s?.skill ?? 'reading', answered, correct, accuracy, level, weight }
  })
}

export interface BuiltPlaylist {
  questions: Question[]
  breakdown: PlaylistBreakdown[]
  totalWeight: number
}

/**
 * Build a personal practice playlist: question share per part is
 * proportional to weakness weight (min 10%, max 60% per part),
 * preferring questions near the user's level for that part.
 */
export function buildPlaylist(materialSlug: string, count = 10, username?: string): BuiltPlaylist {
  const abilities = analyzeAbility(materialSlug, username)
  const bank = liveBank().filter(q => q.materialSlug === materialSlug)
  const diffs = getDifficultyOverrides()

  if (bank.length === 0 || abilities.length === 0) {
    return { questions: [], breakdown: [], totalWeight: 0 }
  }

  const totalWeight = abilities.reduce((s, a) => s + a.weight, 0) || 1
  // Clamp share per part to [10%, 60%], then largest-remainder to hit count.
  const shares = abilities.map(a => Math.min(0.6, Math.max(0.1, a.weight / totalWeight)))
  const shareSum = shares.reduce((s, x) => s + x, 0) || 1
  const exact = shares.map(s => (s / shareSum) * count)
  const base = exact.map(Math.floor)
  let rest = count - base.reduce((s, x) => s + x, 0)
  const order = exact.map((e, i) => i).sort((a, b) => exact[b]! - exact[a]! - (base[b]! - base[a]!))
  for (const i of order) {
    if (rest <= 0) break
    base[i]! += 1
    rest -= 1
  }

  const picked: Question[] = []
  const breakdown: PlaylistBreakdown[] = []
  abilities.forEach((a, i) => {
    const need = base[i] ?? 0
    const level = a.level
    const candidates = bank
      .filter(q => q.part === a.part && !picked.includes(q))
      .map(q => ({ q, d: Math.abs((diffs[bankViewId(q.materialSlug, q.number)] ?? 3) - level) }))
      .sort((x, y) => x.d - y.d || x.q.number - y.q.number)
      .slice(0, Math.max(need, 0))
      .map(x => x.q)
    picked.push(...candidates)
    breakdown.push({ part: a.part, count: candidates.length, accuracy: a.accuracy, level: a.level })
  })

  // Shuffle the final order so parts interleave like a real playlist.
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = picked[i]!
    picked[i] = picked[j]!
    picked[j] = t
  }
  return { questions: picked, breakdown, totalWeight }
}

/** Persist a practice attempt so the next playlist adapts. */
export function recordPracticeAttempt(materialSlug: string, number: number, correct: boolean, username?: string): void {
  if (!isClient()) return
  try {
    const key = `gts_practice_${materialSlug}`
    const raw = localStorage.getItem(key)
    const arr = raw ? (JSON.parse(raw) as PracticeAttempt[]) : []
    arr.push({ materialSlug, number, correct, username, at: new Date().toISOString() })
    localStorage.setItem(key, JSON.stringify(arr))
  } catch {
    /* noop */
  }
}

/** Persist the built playlist (question numbers) for the practice runner. */
export function savePlaylist(materialSlug: string, questions: Question[]): void {
  if (!isClient()) return
  try {
    localStorage.setItem(`gts_playlist_${materialSlug}`, JSON.stringify(questions.map(q => q.number)))
  } catch {
    /* noop */
  }
}

export function loadPlaylist(materialSlug: string): Question[] {
  if (!isClient()) return []
  try {
    const raw = localStorage.getItem(`gts_playlist_${materialSlug}`)
    if (!raw) return []
    const nums = JSON.parse(raw) as number[]
    return nums
      .map(n => questionByNumber(materialSlug, n))
      .filter((q): q is Question => !!q)
  } catch {
    return []
  }
}
