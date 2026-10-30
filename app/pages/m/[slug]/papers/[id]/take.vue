<script setup lang="ts">
import { getMaterialOrFallback, getPaperOrFallback, partsForMaterial, questionsForMaterial } from '~/data/mock'
import type { Question } from '~/data/mock'
import type { AnswerMap } from '~/utils/storage'

const { t } = useLocale()

definePageMeta({ layout: false })

const route = useRoute()
const router = useRouter()

const slug = computed(() => route.params.slug as string)
const base = computed(() => `/m/${slug.value}`)
const material = computed(() => getMaterialOrFallback(slug.value))
const materialParts = computed(() => partsForMaterial(slug.value))
const paperId = computed(() => route.params.id as string)
const paper = computed(() => getPaperOrFallback(paperId.value))
const attempt = computed(() => Number(route.query.attempt ?? 1) || 1)

const questions = computed(() => questionsForMaterial(slug.value))
const paletteParts = computed(() =>
  materialParts.value.map(p => ({
    label: `Part ${p.part}`,
    numbers: questions.value.filter(q => q.part === p.part).map(q => q.number)
  }))
)
const partInfo = computed(() => {
  const map = new Map(materialParts.value.map(p => [p.part, p]))
  return (part: number) => map.get(part)
})

const idx = ref(0)
/** idx is always kept within 0..length-1 by next/prev/goTo, so this never throws in practice. */
const current = computed((): Question => questions.value[idx.value] ?? questions.value[0] as Question)
const answers = ref<AnswerMap>({})
const submitted = ref(false)

const showInstructions = ref(true)
const openPart = ref<number | null>(1)
const notesOpen = ref(false)
const noteDraft = ref('')
const confirmSubmit = ref(false)
const confirmExit = ref(false)

const totalSeconds = computed(() => paper.value.durationMinutes * 60)
const answeredCount = computed(() => Object.keys(answers.value).length)
const progressPct = computed(() => Math.round((answeredCount.value / questions.value.length) * 100))

function skillLabel(skill: string): string {
  return { listening: 'Listening', reading: 'Reading', speaking: 'Speaking', writing: 'Writing' }[skill] ?? skill
}

onMounted(() => {
  if (!getAuth()) {
    router.replace('/auth')
    return
  }
  answers.value = loadAnswers(paper.value.id, attempt.value)
  noteDraft.value = getNote(paper.value.id)
})

watch(
  answers,
  v => saveAnswers(paper.value.id, attempt.value, v),
  { deep: true }
)

function goTo(n: number): void {
  const i = questions.value.findIndex(q => q.number === n)
  if (i >= 0) idx.value = i
}

function choose(letter: string): void {
  answers.value = { ...answers.value, [current.value.number]: letter }
}

function next(): void {
  if (idx.value < questions.value.length - 1) idx.value += 1
}

function prev(): void {
  if (idx.value > 0) idx.value -= 1
}

function gradeAndSave(): void {
  let correct = 0
  for (const q of questions.value) {
    if (answers.value[q.number] === q.correctLetter) correct += 1
  }
  const score = predictedScore(correct, questions.value.length)
  saveResult({
    paperId: paper.value.id,
    attempt: attempt.value,
    score,
    cefr: cefrLevel(score),
    correct,
    total: questions.value.length,
    answers: answers.value,
    finishedAt: new Date().toISOString()
  })
  clearAnswers(paper.value.id, attempt.value)
}

function doSubmit(): void {
  if (submitted.value) return
  submitted.value = true
  confirmSubmit.value = false
  gradeAndSave()
  router.push(`${base.value}/papers/${paper.value.id}/result`)
}

function doExit(): void {
  confirmExit.value = false
  saveNote(paper.value.id, noteDraft.value)
  router.push(`${base.value}/papers/${paper.value.id}`)
}

function onExpire(): void {
  doSubmit()
}

function saveNotes(): void {
  saveNote(paper.value.id, noteDraft.value)
}
</script>

<template>
  <div class="min-h-screen bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 pb-36">
    <!-- Dark navy header -->
    <header class="bg-slate-900 text-white sticky top-0 z-40">
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center">
        <span class="w-8 h-8 rounded-lg bg-white dark:bg-slate-900/10 font-extrabold flex items-center justify-center text-[10px] tracking-tight shrink-0">GTS</span>
        <h1 class="absolute left-1/2 -translate-x-1/2 text-sm md:text-base font-semibold truncate max-w-[50%]">
          {{ paper.title }}
        </h1>
        <div class="ml-auto flex items-center gap-2 shrink-0">
          <button
            class="text-xs font-semibold px-3.5 py-2 rounded-full border border-white/40 hover:bg-white/10 transition-colors"
            @click="confirmExit = true"
          >
            {{ t('take.saveExit') }}
          </button>
          <button
            class="text-xs font-semibold px-3.5 py-2 rounded-full bg-amber-400 text-amber-950 hover:bg-amber-500 transition-colors"
            @click="confirmSubmit = true"
          >
            {{ t('take.submitQuiz') }}
          </button>
        </div>
      </div>
      <!-- Sub-header -->
      <div class="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
        <div class="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-2 min-w-44 flex-1 max-w-xs">
            <div class="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div class="h-full bg-blue-600 rounded-full transition-all" :style="{ width: `${progressPct}%` }" />
            </div>
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">{{ answeredCount }}/{{ questions.length }} ({{ progressPct }}%)</span>
          </div>
          <div class="flex items-center gap-2 ml-auto">
            <button
              class="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
              @click="showInstructions = true"
            >
              {{ t('take.instruction') }}
            </button>
            <button
              class="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
              @click="notesOpen = true"
            >
              {{ t('take.notes') }}
            </button>
            <CountdownTimer :total-seconds="totalSeconds" @expire="onExpire" />
          </div>
        </div>
      </div>
    </header>

    <!-- Question card -->
    <main class="max-w-3xl mx-auto px-4 pt-6">
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 md:p-8">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <p class="text-xs font-bold uppercase tracking-widest text-blue-600">
            Part {{ current.part }} · {{ partInfo(current.part)?.label }}
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

        <p class="mt-4 text-sm font-semibold text-slate-400 dark:text-slate-500">{{ t('take.questionOf', { n: current.number, total: questions.length }) }}</p>

        <div v-if="current.audioNote" class="mt-3">
          <AudioPlayer />
        </div>

        <div v-if="current.context" class="mt-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
          {{ current.context }}
        </div>

        <p class="mt-4 text-base font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{{ current.stem }}</p>

        <div class="mt-5 space-y-2.5" role="radiogroup" :aria-label="t('take.questionOf', { n: current.number, total: questions.length })">
          <button
            v-for="opt in current.options"
            :key="opt.letter"
            role="radio"
            :aria-checked="answers[current.number] === opt.letter"
            class="w-full flex items-center gap-3 text-left rounded-xl border-2 px-4 py-3.5 transition-colors"
            :class="answers[current.number] === opt.letter
              ? 'border-blue-600 bg-blue-50 dark:bg-blue-950 dark:bg-blue-950'
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
      <p class="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">{{ t('take.demoNote') }}</p>
    </main>

    <!-- Fixed bottom palette -->
    <div class="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div class="max-w-6xl mx-auto px-4 py-3">
        <QuestionPalette
          :parts="paletteParts"
          :current="current.number"
          :answered="answers"
          @select="goTo"
        />
      </div>
    </div>

    <!-- Instructions modal -->
    <Teleport to="body">
      <div v-if="showInstructions" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60" />
        <div class="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
          <div class="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
            <h2 class="text-lg font-extrabold text-slate-800 dark:text-slate-200">{{ t('take.instructionsTitle') }}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ paper.title }} · {{ paper.durationMinutes }} {{ t('overview.minutes') }} · {{ questions.length }} {{ t('take.demoQuestions') }}</p>
          </div>
          <div class="overflow-y-auto px-6 py-4 space-y-2 flex-1">
            <div v-for="p in materialParts" :key="p.part" class="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <button
                class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                @click="openPart = openPart === p.part ? null : p.part"
              >
                <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Part {{ p.part }} — {{ p.label }}
                  <span class="ml-2 text-xs font-medium text-slate-400 dark:text-slate-500">{{ skillLabel(p.skill) }}</span>
                </span>
                <span class="text-slate-400 dark:text-slate-500 transition-transform" :class="openPart === p.part ? 'rotate-180' : ''">▾</span>
              </button>
              <div v-if="openPart === p.part" class="px-4 pb-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {{ p.description }}
                <p v-if="p.skill === 'listening' || p.skill === 'speaking'" class="mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  Demo note: listening audio is a placeholder in this build — read the transcript in each question.
                </p>
              </div>
            </div>
          </div>
          <div class="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
            <button
              class="text-sm font-semibold px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              @click="showInstructions = false"
            >
              {{ t('take.closeStart') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <NotesDrawer v-model:open="notesOpen" v-model:model-value="noteDraft" @save="saveNotes" />

    <ConfirmModal
      :open="confirmSubmit"
      :title="t('take.confirmSubmitTitle')"
      :message="t('take.confirmSubmitMsg', { a: answeredCount, t: questions.length, p: progressPct })"
      :confirm-text="t('take.submitAnyway')"
      :cancel-text="t('take.keepWorking')"
      @confirm="doSubmit"
      @cancel="confirmSubmit = false"
    />

    <ConfirmModal
      :open="confirmExit"
      :title="t('take.confirmExitTitle')"
      :message="t('take.confirmExitMsg')"
      :confirm-text="t('take.exitAnyway')"
      :cancel-text="t('take.stayHere')"
      @confirm="doExit"
      @cancel="confirmExit = false"
    />
  </div>
</template>
