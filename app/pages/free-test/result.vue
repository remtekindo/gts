<script setup lang="ts">
import { FREE_TEST_QUESTIONS, FREE_TEST_SECTIONS } from '~/data/mock'
import { loadFreeAnswers, loadFreeTimings, clearFreeAnswers, saveResult, getResult, type AnswerMap } from '~/utils/storage'

definePageMeta({ layout: false })

const { t } = useLocale()

interface SectionScore { id: string; correct: number; total: number }

const authed = ref(false)
const answers = ref<AnswerMap | null>(null)
const sectionScores = ref<SectionScore[]>([])
const totalCorrect = ref(0)

const sectionLabel = (id: string): string =>
  ({ listening: t('freeTest.secListening'), reading: t('freeTest.secReading'), writing: t('freeTest.secWriting') })[id] ?? id

onMounted(() => {
  if (!getAuth()) {
    authed.value = false
    return
  }
  authed.value = true
  const pending = loadFreeAnswers()
  if (!pending) return
  answers.value = pending
  const scores: SectionScore[] = FREE_TEST_SECTIONS.map(s => {
    const qs = FREE_TEST_QUESTIONS.filter(q => q.section === s.id)
    const correct = qs.filter(q => pending[q.number] === q.correctLetter).length
    return { id: s.id, correct, total: qs.length }
  })
  sectionScores.value = scores
  totalCorrect.value = scores.reduce((sum, s) => sum + s.correct, 0)
  // Record the free test in the user's class history (profile -> Enroll History).
  const prev = getResult('free-test')
  saveResult({
    paperId: 'free-test',
    attempt: (prev?.attempt ?? 0) + 1,
    score: Math.round((totalCorrect.value / FREE_TEST_QUESTIONS.length) * 100),
    cefr: '',
    correct: totalCorrect.value,
    total: FREE_TEST_QUESTIONS.length,
    answers: pending,
    finishedAt: new Date().toISOString(),
    username: getAuth()?.username ?? 'guest',
    timings: loadFreeTimings() ?? {}
  })
  clearFreeAnswers()
})

const pct = computed(() => Math.round((totalCorrect.value / FREE_TEST_QUESTIONS.length) * 100))

const reviewSections = computed(() =>
  FREE_TEST_SECTIONS.map(s => ({
    id: s.id,
    label: sectionLabel(s.id),
    questions: FREE_TEST_QUESTIONS.filter(q => q.section === s.id)
  }))
)

const isCorrect = (n: number): boolean => {
  const q = FREE_TEST_QUESTIONS.find(x => x.number === n)
  return !!q && answers.value?.[n] === q.correctLetter
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col">
    <header class="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-700">
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        <NuxtLink to="/" class="flex items-center gap-2">
          <span class="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs tracking-tight">GTS</span>
          <span class="text-sm font-semibold leading-tight">Global Testing<br />System</span>
        </NuxtLink>
        <div class="ml-auto flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="flex-1">
      <!-- Login gate: result is locked until the user signs in -->
      <div v-if="!authed" class="max-w-md mx-auto px-4 py-20 text-center">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
          <span class="text-4xl">🔒</span>
          <h1 class="mt-4 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{{ t('freeTest.gateTitle') }}</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ t('freeTest.gateSub') }}</p>
          <NuxtLink
            to="/auth?next=/free-test/result"
            class="mt-6 inline-block text-sm font-semibold px-8 py-3.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {{ t('freeTest.gateBtn') }}
          </NuxtLink>
        </div>
      </div>

      <!-- No pending answers -->
      <div v-else-if="answers === null" class="max-w-md mx-auto px-4 py-20 text-center">
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('freeTest.signInToContinue') }}</p>
        <NuxtLink to="/free-test" class="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-700">
          {{ t('freeTest.startBtn') }} →
        </NuxtLink>
      </div>

      <!-- Graded result -->
      <div v-else class="max-w-3xl mx-auto px-4 py-12">
        <div class="text-center">
          <h1 class="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{{ t('freeTest.resultTitle') }}</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ t('freeTest.resultSub') }}</p>
        </div>

        <div class="mt-8 bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-8 text-white text-center">
          <p class="text-xs font-bold uppercase tracking-widest text-blue-200">{{ t('freeTest.totalScore') }}</p>
          <p class="mt-2 text-6xl font-extrabold tabular-nums">{{ totalCorrect }}<span class="text-2xl text-blue-200">/{{ FREE_TEST_QUESTIONS.length }}</span></p>
          <p class="mt-2 text-sm text-blue-200">{{ pct }}% {{ t('result.correct') }}</p>
        </div>

        <div class="mt-6 grid md:grid-cols-3 gap-3">
          <div
            v-for="s in sectionScores"
            :key="s.id"
            class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 text-center"
          >
            <p class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{{ sectionLabel(s.id) }}</p>
            <p class="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{{ s.correct }}<span class="text-lg text-slate-400 dark:text-slate-500">/{{ s.total }}</span></p>
          </div>
        </div>

        <div class="mt-10">
          <h2 class="text-xl font-extrabold text-slate-900 dark:text-slate-100">{{ t('freeTest.reviewTitle') }}</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('freeTest.reviewSub') }}</p>
          <div class="mt-5 space-y-4">
            <div
              v-for="q in FREE_TEST_QUESTIONS"
              :key="q.number"
              class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
            >
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-bold text-slate-400 dark:text-slate-500">Q{{ q.number }}</span>
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {{ sectionLabel(q.section) }}
                </span>
                <span v-if="isCorrect(q.number)" class="ml-auto text-sm font-extrabold text-emerald-600">✓</span>
                <span v-else class="ml-auto text-sm font-extrabold text-red-500">✗</span>
              </div>
              <p class="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed">{{ q.stem }}</p>
              <div class="mt-3 space-y-2">
                <div
                  v-for="opt in q.options"
                  :key="opt.letter"
                  class="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm"
                  :class="opt.letter === q.correctLetter
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                    : (answers?.[q.number] === opt.letter
                      ? 'border-red-400 bg-red-50 dark:bg-red-950/30'
                      : 'border-slate-200 dark:border-slate-700')"
                >
                  <span class="font-bold text-slate-500 dark:text-slate-400 w-5 shrink-0">{{ opt.letter }}</span>
                  <span class="text-slate-700 dark:text-slate-200">{{ opt.text }}</span>
                  <span
                    v-if="opt.letter === q.correctLetter"
                    class="ml-auto text-[11px] font-bold text-emerald-600 uppercase tracking-wide shrink-0"
                  >
                    {{ t('freeTest.correctAnswer') }}
                  </span>
                  <span
                    v-else-if="answers?.[q.number] === opt.letter"
                    class="ml-auto text-[11px] font-bold text-red-500 uppercase tracking-wide shrink-0"
                  >
                    {{ t('freeTest.yourAnswer') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <NuxtLink
            to="/free-test"
            class="text-sm font-semibold px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {{ t('freeTest.retakeBtn') }}
          </NuxtLink>
          <NuxtLink
            to="/materials"
            class="text-sm font-semibold px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {{ t('freeTest.goMaterials') }}
          </NuxtLink>
        </div>
      </div>
    </main>

    <AppFooter />
  </div>
</template>
