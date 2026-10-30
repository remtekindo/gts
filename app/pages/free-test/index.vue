<script setup lang="ts">
import { FREE_TEST_QUESTIONS, FREE_TEST_SECTIONS } from '~/data/mock'
import { saveFreeAnswers, type AnswerMap } from '~/utils/storage'

definePageMeta({ layout: false })

const { t } = useLocale()
const router = useRouter()

const started = ref(false)
const idx = ref(0)
const answers = ref<AnswerMap>({})
const confirmSubmit = ref(false)

const questions = FREE_TEST_QUESTIONS
const current = computed(() => questions[idx.value] ?? questions[0]!)
const answeredCount = computed(() => Object.keys(answers.value).length)
const progressPct = computed(() => Math.round((answeredCount.value / questions.length) * 100))

const sectionLabel = (id: string): string =>
  ({ listening: t('freeTest.secListening'), reading: t('freeTest.secReading'), writing: t('freeTest.secWriting') })[id] ?? id

const paletteParts = computed(() =>
  FREE_TEST_SECTIONS.map(s => ({
    label: sectionLabel(s.id),
    numbers: questions.filter(q => q.section === s.id).map(q => q.number)
  }))
)

function goTo(n: number): void {
  const i = questions.findIndex(q => q.number === n)
  if (i >= 0) idx.value = i
}

function choose(letter: string): void {
  answers.value = { ...answers.value, [current.value.number]: letter }
}

function next(): void {
  if (idx.value < questions.length - 1) idx.value += 1
}

function prev(): void {
  if (idx.value > 0) idx.value -= 1
}

function doSubmit(): void {
  confirmSubmit.value = false
  saveFreeAnswers(answers.value)
  router.push('/auth?next=/free-test/result')
}

function onExpire(): void {
  doSubmit()
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col">
    <!-- Simple public header -->
    <header class="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-700">
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
        <NuxtLink to="/" class="flex items-center gap-2">
          <span class="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs tracking-tight">GTS</span>
          <span class="text-sm font-semibold leading-tight">Global Testing<br />System</span>
        </NuxtLink>
        <div class="ml-auto flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
          <NuxtLink
            to="/auth"
            class="text-sm font-semibold px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {{ t('nav.signIn') }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Intro -->
    <div v-if="!started" class="flex-1">
      <div class="max-w-3xl mx-auto px-4 py-14 text-center">
        <span class="inline-flex text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
          {{ t('freeTest.heroBadge') }}
        </span>
        <h1 class="mt-5 text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          {{ t('freeTest.titleA') }}<br />{{ t('freeTest.titleB') }}
        </h1>
        <p class="mt-4 text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{{ t('freeTest.subtitle') }}</p>

        <div class="mt-8 grid grid-cols-3 gap-3 max-w-xl mx-auto">
          <div
            v-for="s in FREE_TEST_SECTIONS"
            :key="s.id"
            class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4"
          >
            <p class="font-bold text-slate-800 dark:text-slate-200">{{ sectionLabel(s.id) }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ t('freeTest.secSub', { n: s.count }) }}</p>
          </div>
        </div>

        <div class="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-left max-w-xl mx-auto">
          <h2 class="font-bold text-slate-900 dark:text-slate-100">{{ t('freeTest.instructionsTitle') }}</h2>
          <ul class="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li class="flex gap-2"><span class="text-blue-600 font-bold">·</span>{{ t('freeTest.i1') }}</li>
            <li class="flex gap-2"><span class="text-blue-600 font-bold">·</span>{{ t('freeTest.i2') }}</li>
            <li class="flex gap-2"><span class="text-blue-600 font-bold">·</span>{{ t('freeTest.i3') }}</li>
          </ul>
        </div>

        <button
          class="mt-8 text-sm font-semibold px-8 py-3.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          @click="started = true"
        >
          {{ t('freeTest.beginBtn') }}
        </button>
        <p class="mt-3 text-xs text-slate-400 dark:text-slate-500">{{ t('freeTest.howNote') }}</p>
      </div>
    </div>

    <!-- Test interface -->
    <div v-else class="flex-1 pb-44">
      <div class="bg-slate-900 text-white sticky top-16 z-30">
        <div class="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-2 min-w-44 flex-1 max-w-xs">
            <div class="flex-1 h-2 rounded-full bg-white/15 overflow-hidden">
              <div class="h-full bg-blue-500 rounded-full transition-all" :style="{ width: `${progressPct}%` }" />
            </div>
            <span class="text-xs font-semibold text-slate-300 tabular-nums whitespace-nowrap">{{ answeredCount }}/{{ questions.length }} ({{ progressPct }}%)</span>
          </div>
          <div class="ml-auto flex items-center gap-2">
            <CountdownTimer :total-seconds="1800" @expire="onExpire" />
            <button
              class="text-xs font-semibold px-4 py-2 rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-500 transition-colors"
              @click="confirmSubmit = true"
            >
              {{ t('take.submitQuiz') }}
            </button>
          </div>
        </div>
      </div>

      <main class="max-w-3xl mx-auto px-4 pt-6">
        <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 md:p-8">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <p class="text-xs font-bold uppercase tracking-widest text-blue-600">
              {{ sectionLabel(current.section) }}
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
                :disabled="idx === questions.length - 1"
                class="text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 disabled:opacity-40 hover:border-blue-400 hover:text-blue-600 transition-colors"
                @click="next"
              >
                {{ t('take.next') }}
              </button>
            </div>
          </div>

          <p class="mt-4 text-sm font-semibold text-slate-400 dark:text-slate-500">
            {{ t('take.questionOf', { n: current.number, total: questions.length }) }}
          </p>
          <p class="mt-4 text-base font-medium text-slate-800 dark:text-slate-100 leading-relaxed">{{ current.stem }}</p>

          <div class="mt-5 space-y-2.5" role="radiogroup" :aria-label="t('take.questionOf', { n: current.number, total: questions.length })">
            <button
              v-for="opt in current.options"
              :key="opt.letter"
              role="radio"
              :aria-checked="answers[current.number] === opt.letter"
              class="w-full flex items-center gap-3 text-left rounded-xl border-2 px-4 py-3.5 transition-colors"
              :class="answers[current.number] === opt.letter
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 bg-white dark:bg-slate-900'"
              @click="choose(opt.letter)"
            >
              <span
                class="w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center"
                :class="answers[current.number] === opt.letter ? 'border-blue-600' : 'border-slate-300 dark:border-slate-600'"
              >
                <span v-if="answers[current.number] === opt.letter" class="w-3 h-3 rounded-full bg-blue-600" />
              </span>
              <span class="text-sm font-bold text-slate-500 dark:text-slate-400 w-5 shrink-0">{{ opt.letter }}</span>
              <span class="text-sm text-slate-700 dark:text-slate-200">{{ opt.text }}</span>
            </button>
          </div>
        </div>

      </main>

      <div class="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div class="max-w-6xl mx-auto px-4 py-3">
          <QuestionPalette :parts="paletteParts" :current="current.number" :answered="answers" @select="goTo" />
        </div>
      </div>
    </div>

    <ConfirmModal
      :open="confirmSubmit"
      :title="t('take.confirmSubmitTitle')"
      :message="t('take.confirmSubmitMsg', { a: answeredCount, t: questions.length, p: progressPct })"
      :confirm-text="t('take.submitAnyway')"
      :cancel-text="t('take.keepWorking')"
      @confirm="doSubmit"
      @cancel="confirmSubmit = false"
    />

    <AppFooter />
  </div>
</template>
