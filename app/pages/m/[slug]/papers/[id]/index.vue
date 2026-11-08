<script setup lang="ts">
import { getPaperOrFallback, papersForMaterial, partsForMaterial, realQuestionCount } from '~/data/mock'
import { MAX_ATTEMPTS, isAttemptLocked, resolvePaperLock, shortPaperName } from '~/utils/unlock'

const { t } = useLocale()

definePageMeta({ layout: 'material' })
import type { TestResult } from '~/utils/storage'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const base = computed(() => `/m/${slug.value}`)
const paperId = computed(() => route.params.id as string)
const paper = computed(() => getPaperOrFallback(paperId.value))

const result = ref<TestResult | null>(null)

/** "Attempted" from real data — a finished result, or saved answers
 * for an unfinished attempt — never the old hardcoded catalog status.
 * The finished check reads the same server-derived ids as the paper
 * badges, so a test completed on another device counts here too. */
const activity = useMaterialActivity(slug.value)
const hasSavedAnswers = ref(false)

/** Sequential unlocking (see app/utils/unlock.ts): this paper opens
 * only after the previous Full Simulation is completed; attempt N
 * opens only after attempt N − 1. The activity state is seeded from
 * the browser's local snapshot at setup, so the locks are right on
 * first paint; the server fetch refines them. */
const materialPapers = computed(() => papersForMaterial(slug.value))
const paperLock = computed(() => resolvePaperLock(paper.value, materialPapers.value, activity.completedPaperIds))
const paperLockName = computed(() => paperLock.value.unlockAfter ? shortPaperName(paperLock.value.unlockAfter.title) : '')
const completedAttempts = computed(() => activity.completedAttempts[paper.value.id] ?? [])
const attemptLocked = (n: number): boolean => isAttemptLocked(n, completedAttempts.value)
/** First locked attempt, if any — the next one to unlock. */
const nextLockedAttempt = computed<number | null>(() => {
  for (let n = 1; n <= MAX_ATTEMPTS; n++) {
    if (attemptLocked(n)) return n
  }
  return null
})
/** Default selection: the first unlocked attempt the user has not
 * finished yet (their next attempt); attempt 1 when everything is
 * finished (a retake). Never a locked attempt. */
function defaultAttempt(): number {
  for (let n = 1; n <= MAX_ATTEMPTS; n++) {
    if (!attemptLocked(n) && !completedAttempts.value.includes(n)) return n
  }
  return 1
}
const attempt = ref(defaultAttempt())
/** Start is disabled while the paper/attempt is locked — and while
 * the bank holds no questions for this paper at all (TOEFL/IELTS
 * today): the user is told plainly the questions are being prepared,
 * never offered a test with nothing in it. */
const questionCount = computed(() => realQuestionCount(paper.value))
const noQuestions = computed(() => questionCount.value === 0)
const startDisabled = computed(() => noQuestions.value || paperLock.value.locked || attemptLocked(attempt.value))
const attempted = computed(() =>
  !!result.value || hasSavedAnswers.value || activity.completedPaperIds.includes(paper.value.id)
)

onMounted(() => {
  result.value = getResult(paper.value.id)
  hasSavedAnswers.value = listInProgressAttempts([paper.value.id]).length > 0
})

const skillLabel = (skill: string): string =>
  ({ listening: t('overview.listening'), reading: t('overview.reading'), speaking: t('take.skillSpeaking'), writing: t('take.skillWriting') })[skill] ?? skill

const skills = computed(() => {
  const bySkill = new Map<string, number[]>()
  for (const part of partsForMaterial(slug.value)) {
    const arr = bySkill.get(part.skill) ?? []
    arr.push(part.part)
    bySkill.set(part.skill, arr)
  }
  return [...bySkill.entries()].map(([skill, parts]) => ({
    name: skillLabel(skill),
    parts: `Parts ${parts.join(', ')}`,
    done: !!result.value
  }))
})

/** Instructions live HERE, inline — the take page no longer opens an
 * instructions modal first (one less tap before Q1). Listening
 * parts carry the plain "no audio" note. */
const materialParts = computed(() => partsForMaterial(slug.value))
const difficultyLabel = computed(() =>
  paper.value.difficulty === 'Beginner'
    ? t('papers.diffBeginner')
    : paper.value.difficulty === 'Intermediate'
      ? t('papers.diffIntermediate')
      : t('papers.diffAdvanced')
)
</script>

<template>
  <div>
    <!-- Dark navy hero -->
    <div class="bg-slate-900 text-white">
      <div class="max-w-6xl mx-auto px-4 py-8">
        <div class="flex items-center justify-between">
          <nav class="text-xs text-slate-400 dark:text-slate-500">
            <NuxtLink :to="`${base}/papers`" class="hover:text-white">{{ t('overview.crumbPapers') }}</NuxtLink>
            <span class="mx-1.5">/</span>
            <span class="text-slate-200">{{ t('overview.crumbOverview') }}</span>
          </nav>
          <NuxtLink
            :to="`${base}/papers`"
            class="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border border-white/30 hover:bg-white/10 transition-colors"
          >
            ✕ {{ t('overview.exit') }}
          </NuxtLink>
        </div>
        <p class="mt-4 text-[11px] font-semibold uppercase tracking-widest text-blue-300">{{ paper.category === 'Full Simulation' ? t('papers.fullSim') : t('papers.drillPack') }}</p>
        <h1 class="mt-1 text-2xl md:text-3xl font-extrabold">{{ paper.title }}</h1>
        <p class="mt-2 text-sm text-slate-300">
          {{ paper.durationMinutes }} {{ t('overview.minutes') }} · <span v-if="noQuestions" class="font-semibold text-amber-300">{{ t('papers.noQuestionsYet') }}</span><span v-else>{{ questionCount }} {{ t('overview.questions') }}</span> · {{ difficultyLabel }}
        </p>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 pb-10">
      <!-- Ready to try card: ONE Start button. The attempt buttons
           default to the next unlocked attempt; no credit line (no
           credit system exists) and no score-mode toggle (that choice
           moved to the result page). -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 -mt-6 relative">
        <div class="flex flex-wrap items-center gap-4 justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-200">{{ t('overview.readyTitle') }}</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ attempted ? t('overview.attempted') : t('overview.notStarted') }}
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-1.5" role="group" :aria-label="t('overview.attempt')">
              <button
                v-for="n in MAX_ATTEMPTS"
                :key="n"
                :disabled="paperLock.locked || attemptLocked(n)"
                class="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                :class="attempt === n ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-400'"
                @click="attempt = n"
              >
                {{ t('overview.attempt') }} {{ n }}
              </button>
            </div>
            <p v-if="noQuestions" class="w-full text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2">
              {{ t('papers.noQuestionsYet') }}
            </p>
            <p v-else-if="paperLock.locked" class="w-full text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2">
              {{ t('papers.lockedReason', { name: paperLockName }) }}
            </p>
            <p v-else-if="nextLockedAttempt" class="w-full text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2">
              {{ t('overview.attemptLockedReason', { prev: nextLockedAttempt - 1, next: nextLockedAttempt }) }}
            </p>
            <NuxtLink
              v-if="!startDisabled"
              :to="`${base}/papers/${paper.id}/take?attempt=${attempt}`"
              class="w-full sm:w-auto text-center text-sm font-semibold px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {{ t('overview.startTest') }}
            </NuxtLink>
            <button
              v-else
              disabled
              class="w-full sm:w-auto text-center text-sm font-semibold px-6 py-3 rounded-xl bg-blue-600 text-white opacity-40 cursor-not-allowed"
            >
              {{ t('overview.startTest') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Instructions, inline: what each part asks, before Start. -->
      <div class="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('overview.instructionsTitle') }}</h2>
        <ul class="mt-3 space-y-3">
          <li v-for="p in materialParts" :key="p.part" class="text-sm">
            <p class="font-semibold text-slate-700 dark:text-slate-200">
              Part {{ p.part }} — {{ p.label }}
              <span class="ml-2 text-xs font-medium text-slate-400 dark:text-slate-500">{{ skillLabel(p.skill) }}</span>
            </p>
            <p class="mt-0.5 text-slate-500 dark:text-slate-400 leading-relaxed">{{ p.description }}</p>
            <p v-if="p.skill === 'listening' || p.skill === 'speaking'" class="mt-1.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2">
              {{ t('overview.noAudioNote') }}
            </p>
          </li>
        </ul>
      </div>

      <!-- Per-skill cards: last result's score AND CEFR, both shown —
           no toggle to answer before Start. -->
      <div class="mt-4 grid md:grid-cols-2 gap-4">
        <div v-for="s in skills" :key="s.name" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-bold text-slate-800 dark:text-slate-200">{{ s.name }}</h3>
              <p class="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{{ s.parts }}</p>
            </div>
            <span
              class="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              :class="s.done ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'"
            >
              {{ s.done ? t('papers.statusCompleted') : t('papers.statusNotStarted') }}
            </span>
          </div>
          <dl class="mt-3 text-sm text-slate-500 dark:text-slate-400 space-y-1">
            <div class="flex justify-between items-center">
              <dt>{{ t('overview.predictedScore') }}</dt>
              <dd>
                <span v-if="result" class="inline-block text-sm font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  {{ result.score }}
                </span>
                <span v-else class="text-slate-300 font-bold">—</span>
              </dd>
            </div>
            <div class="flex justify-between items-center">
              <dt>Level CEFR</dt>
              <dd>
                <span v-if="result" class="inline-block text-sm font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  {{ result.cefr }}
                </span>
                <span v-else class="text-slate-300 font-bold">—</span>
              </dd>
            </div>
          </dl>
          <NuxtLink
            v-if="result"
            :to="`${base}/papers/${paper.id}/result`"
            class="mt-4 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors"
          >
            {{ t('overview.viewResult') }}
          </NuxtLink>
          <button
            v-else
            disabled
            class="mt-4 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-300 cursor-not-allowed"
          >
            {{ t('overview.viewResult') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
