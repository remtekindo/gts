<script setup lang="ts">
import { getMaterialOrFallback, partsForMaterial } from '~/data/mock'

const { t } = useLocale()

definePageMeta({ layout: 'material' })

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const material = computed(() => getMaterialOrFallback(slug.value))
const base = computed(() => `/m/${slug.value}`)
const parts = computed(() => partsForMaterial(slug.value))

interface LiveOption {
  letter: string
  text: string
}

interface LiveQuestion {
  stem: string
  context?: string
  options: LiveOption[]
  correctLetter: string
  explanation: string
}

interface AnsweredQuestion extends LiveQuestion {
  qid: string
  picked: string | null
}

type Phase = 'setup' | 'loading' | 'answering' | 'batchDone' | 'finished'

const phase = ref<Phase>('setup')
const part = ref(5)
const difficulty = ref(3)
const error = ref('')

const batchNo = ref(0)
const batch = ref<AnsweredQuestion[]>([])
const idx = ref(0)
const answers = ref<Record<string, string>>({})
const history = ref<AnsweredQuestion[]>([])

const current = computed((): AnsweredQuestion | null => batch.value[idx.value] ?? null)
const answeredInBatch = computed(() => batch.value.filter(q => answers.value[q.qid]).length)
const allBatchAnswered = computed(() => batch.value.length > 0 && answeredInBatch.value === batch.value.length)

const batchCorrect = computed(() => batch.value.filter(q => q.picked === q.correctLetter).length)
const totalCorrect = computed(() => history.value.filter(q => q.picked === q.correctLetter).length)
const accuracy = computed(() => {
  if (history.value.length === 0) return 0
  return Math.round((totalCorrect.value / history.value.length) * 100)
})

function skillForPart(p: number): string {
  return p <= 4 ? 'listening' : 'reading'
}

async function fetchBatch(): Promise<void> {
  phase.value = 'loading'
  error.value = ''
  try {
    const res = await $fetch<{ questions: LiveQuestion[] }>('/api/live-test/generate', {
      method: 'POST',
      body: {
        part: part.value,
        skill: skillForPart(part.value),
        difficulty: difficulty.value,
        count: 5,
        excludeStems: history.value.map(q => q.stem)
      }
    })
    batchNo.value += 1
    const n = batchNo.value
    batch.value = res.questions.map((q, i) => ({
      ...q,
      qid: `${n}-${i}`,
      picked: null
    }))
    idx.value = 0
    phase.value = 'answering'
  } catch (e) {
    const status = (e as { response?: { status?: number }, statusCode?: number }).response?.status
      ?? (e as { statusCode?: number }).statusCode
    error.value = status === 503 ? t('liveTest.errorKey') : t('liveTest.errorGen')
    phase.value = 'setup'
  }
}

function start(): void {
  history.value = []
  answers.value = {}
  batchNo.value = 0
  fetchBatch()
}

function choose(letter: string): void {
  const q = current.value
  if (!q) return
  answers.value = { ...answers.value, [q.qid]: letter }
  batch.value = batch.value.map(b => (b.qid === q.qid ? { ...b, picked: letter } : b))
}

function next(): void {
  if (idx.value < batch.value.length - 1) idx.value += 1
}

function prev(): void {
  if (idx.value > 0) idx.value -= 1
}

function finishBatch(): void {
  history.value = [...history.value, ...batch.value]
  phase.value = 'batchDone'
}

function nextBatch(): void {
  fetchBatch()
}

function finishAll(): void {
  phase.value = 'finished'
}

function playAgain(): void {
  start()
}
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Setup -->
    <div v-if="phase === 'setup'" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 md:p-8">
      <h1 class="text-2xl font-extrabold text-slate-800 dark:text-slate-200">{{ t('liveTest.title') }}</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{{ t('liveTest.sub') }}</p>

      <div class="mt-6 grid sm:grid-cols-2 gap-4">
        <label class="block">
          <span class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{{ t('liveTest.part') }}</span>
          <select v-model="part" class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option v-for="p in parts" :key="p.part" :value="p.part">
              Part {{ p.part }} — {{ p.label }}
            </option>
          </select>
        </label>
        <label class="block">
          <span class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{{ t('liveTest.difficulty') }}</span>
          <select v-model="difficulty" class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option v-for="n in 5" :key="n" :value="n">
              {{ n }}
            </option>
          </select>
          <span class="mt-1 block text-xs text-slate-400 dark:text-slate-500">{{ t('liveTest.diffHint') }}</span>
        </label>
      </div>

      <p v-if="error" class="mt-5 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-xl px-3.5 py-2.5">{{ error }}</p>

      <button
        class="mt-6 w-full sm:w-auto text-sm font-semibold px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        @click="start"
      >
        {{ t('liveTest.start') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="phase === 'loading'" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
      <div class="mx-auto w-10 h-10 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 animate-spin" />
      <p class="mt-4 font-semibold text-slate-800 dark:text-slate-200">{{ t('liveTest.generating') }}</p>
      <p class="mt-1 text-sm text-slate-400 dark:text-slate-500">{{ t('liveTest.generatingSub') }}</p>
    </div>

    <!-- Answering -->
    <div v-if="phase === 'answering' && current" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 md:p-8">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <p class="text-xs font-bold uppercase tracking-widest text-blue-600">
          {{ t('liveTest.batch', { n: batchNo }) }} · Part {{ part }}
        </p>
        <div class="flex items-center gap-2">
          <button
            :disabled="idx === 0"
            class="text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:border-blue-400 hover:text-blue-600 transition-colors"
            @click="prev"
          >
            {{ t('take.prev') }}
          </button>
          <button
            :disabled="idx === batch.length - 1"
            class="text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:border-blue-400 hover:text-blue-600 transition-colors"
            @click="next"
          >
            {{ t('take.next') }}
          </button>
        </div>
      </div>

      <p class="mt-4 text-sm font-semibold text-slate-400 dark:text-slate-500">
        {{ t('liveTest.questionOf', { n: idx + 1, total: batch.length }) }} · {{ answeredInBatch }}/{{ batch.length }} {{ t('liveTest.answered') }}
      </p>
      <div class="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div class="h-full bg-blue-600 rounded-full transition-all" :style="{ width: `${Math.round((answeredInBatch / batch.length) * 100)}%` }" />
      </div>

      <div v-if="current.context" class="mt-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
        {{ current.context }}
      </div>

      <p class="mt-4 text-base font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{{ current.stem }}</p>

      <div class="mt-5 space-y-2.5" role="radiogroup" :aria-label="t('liveTest.questionOf', { n: idx + 1, total: batch.length })">
        <button
          v-for="opt in current.options"
          :key="opt.letter"
          role="radio"
          :aria-checked="answers[current.qid] === opt.letter"
          class="w-full flex items-center gap-3 text-left rounded-xl border-2 px-4 py-3.5 transition-colors"
          :class="answers[current.qid] === opt.letter
            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
            : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 bg-white dark:bg-slate-900'"
          @click="choose(opt.letter)"
        >
          <span
            class="w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center"
            :class="answers[current.qid] === opt.letter ? 'border-blue-600' : 'border-slate-300 dark:border-slate-600'"
          >
            <span v-if="answers[current.qid] === opt.letter" class="w-3 h-3 rounded-full bg-blue-600" />
          </span>
          <span class="text-sm font-bold text-slate-500 dark:text-slate-400 w-5 shrink-0">{{ opt.letter }}</span>
          <span class="text-sm text-slate-700 dark:text-slate-200">{{ opt.text }}</span>
        </button>
      </div>

      <p v-if="!allBatchAnswered" class="mt-4 text-xs text-slate-400 dark:text-slate-500">{{ t('liveTest.answerAllHint') }}</p>
      <button
        :disabled="!allBatchAnswered"
        class="mt-4 w-full sm:w-auto text-sm font-semibold px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40"
        @click="finishBatch"
      >
        {{ t('liveTest.finishBatch') }}
      </button>
    </div>

    <!-- Batch result -->
    <div v-if="phase === 'batchDone'" class="space-y-5">
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 class="text-xl font-extrabold text-slate-800 dark:text-slate-200">{{ t('liveTest.batchScore') }}</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ t('liveTest.correctOf', { c: batchCorrect, t: batch.length }) }}
        </p>
        <div class="mt-5 flex flex-wrap gap-3">
          <button
            class="text-sm font-semibold px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            @click="nextBatch"
          >
            {{ t('liveTest.nextBatch') }}
          </button>
          <button
            class="text-sm font-semibold px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            @click="finishAll"
          >
            {{ t('liveTest.finish') }}
          </button>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 class="font-bold text-slate-800 dark:text-slate-200">{{ t('liveTest.review') }}</h3>
        <ul class="mt-4 space-y-5">
          <li v-for="q in batch" :key="q.qid" class="text-sm">
            <p class="font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{{ q.stem }}</p>
            <p class="mt-1.5 text-slate-500 dark:text-slate-400">
              {{ t('liveTest.yourAnswer') }}: <strong :class="q.picked === q.correctLetter ? 'text-green-600' : 'text-red-600'">{{ q.picked ?? '—' }}</strong>
              · {{ t('liveTest.correctAnswer') }}: <strong class="text-green-600">{{ q.correctLetter }}</strong>
            </p>
            <p class="mt-1 text-slate-500 dark:text-slate-400 leading-relaxed">{{ q.explanation }}</p>
          </li>
        </ul>
      </div>
    </div>

    <!-- Final result -->
    <div v-if="phase === 'finished'" class="space-y-5">
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 class="text-xl font-extrabold text-slate-800 dark:text-slate-200">{{ t('liveTest.finalTitle') }}</h2>
        <div class="mt-4 grid grid-cols-3 gap-4">
          <StatTile :label="t('liveTest.totalQuestions')" :value="String(history.length)" />
          <StatTile :label="t('liveTest.correct')" :value="String(totalCorrect)" />
          <StatTile :label="t('liveTest.accuracy')" :value="`${accuracy}%`" />
        </div>
        <div class="mt-5 flex flex-wrap gap-3">
          <button
            class="text-sm font-semibold px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            @click="playAgain"
          >
            {{ t('liveTest.playAgain') }}
          </button>
          <NuxtLink
            :to="base"
            class="text-sm font-semibold px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {{ t('liveTest.backDashboard') }}
          </NuxtLink>
        </div>
      </div>

      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 class="font-bold text-slate-800 dark:text-slate-200">{{ t('liveTest.review') }}</h3>
        <ul class="mt-4 space-y-5">
          <li v-for="q in history" :key="q.qid" class="text-sm">
            <p class="font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{{ q.stem }}</p>
            <p class="mt-1.5 text-slate-500 dark:text-slate-400">
              {{ t('liveTest.yourAnswer') }}: <strong :class="q.picked === q.correctLetter ? 'text-green-600' : 'text-red-600'">{{ q.picked ?? '—' }}</strong>
              · {{ t('liveTest.correctAnswer') }}: <strong class="text-green-600">{{ q.correctLetter }}</strong>
            </p>
            <p class="mt-1 text-slate-500 dark:text-slate-400 leading-relaxed">{{ q.explanation }}</p>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
