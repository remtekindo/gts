<script setup lang="ts">
import { getPaperOrFallback, papersForMaterial, partsForMaterial, questionsForMaterial } from '~/data/mock'
import type { Paper, Question } from '~/data/mock'
import { resolvePaperLock } from '~/utils/unlock'

const { t } = useLocale()

definePageMeta({ layout: 'material' })
import type { AnswerMap, TestResult } from '~/utils/storage'
import type { MarkStatus } from '~/components/QuestionPalette.vue'

const route = useRoute()
const router = useRouter()

const slug = computed(() => route.params.slug as string)
const base = computed(() => `/m/${slug.value}`)
const paperId = computed(() => route.params.id as string)
const paper = computed(() => getPaperOrFallback(paperId.value))

const result = ref<TestResult | null>(null)
const activePart = ref(1)

/** Score display mode — the toggle moved here from the paper detail
 * page in the v2 rebuild, so the detail page never asks anything
 * before Start. */
const scoreMode = ref<'score' | 'cefr'>('score')

onMounted(() => {
  result.value = getResult(paper.value.id)
  if (!result.value) router.replace(`${base.value}/papers/${paper.value.id}`)
})

const materialQuestions = computed(() => questionsForMaterial(slug.value))
const materialParts = computed(() => partsForMaterial(slug.value))
const partQuestions = computed(() => materialQuestions.value.filter(q => q.part === activePart.value))

/**
 * The next step, directly under the score — no dead end. "Tes
 * Berikutnya" is the first unlocked paper after this one in catalog
 * order that the user has not finished yet; when there is none, the
 * button becomes "Lihat Semua Tes". "Latihan Kelemahan Saya" opens
 * the playlist — and is hidden entirely while the playlist is still
 * locked (no disabled button).
 */
const activity = useMaterialActivity(slug.value)
const nextPaper = computed(() => {
  const list = papersForMaterial(slug.value)
  const idx = list.findIndex(p => p.id === paper.value.id)
  for (let i = idx + 1; i < list.length; i++) {
    const p = list[i] as Paper
    const lock = resolvePaperLock(p, list, activity.completedPaperIds)
    if (!lock.locked && !activity.completedPaperIds.includes(p.id)) return p
  }
  return null
})

const statusMap = computed<Record<number, MarkStatus>>(() => {
  const map: Record<number, MarkStatus> = {}
  for (const q of materialQuestions.value) {
    const a = result.value?.answers[q.number]
    map[q.number] = !a ? 'unanswered' : a === q.correctLetter ? 'correct' : 'wrong'
  }
  return map
})

const paletteParts = computed(() =>
  materialParts.value.map(p => ({
    label: `Part ${p.part}`,
    numbers: materialQuestions.value.filter(q => q.part === p.part).map(q => q.number)
  }))
)

function goTo(n: number): void {
  const q = materialQuestions.value.find(x => x.number === n)
  if (q) {
    activePart.value = q.part
    nextTick(() => {
      document.getElementById(`q-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }
}

function optionClass(q: Question, letter: string): string {
  const base = 'w-full flex items-center gap-3 text-left rounded-xl border-2 px-4 py-3'
  const userPick = result.value?.answers[q.number]
  if (letter === q.correctLetter) return `${base} border-green-500 bg-green-50 dark:bg-green-950/60`
  if (userPick === letter) return `${base} border-red-500 bg-red-50 dark:bg-red-950/60`
  return `${base} border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 opacity-70`
}

function markPill(q: Question): { text: string; cls: string } | null {
  const userPick = result.value?.answers[q.number]
  if (!userPick) return { text: t('result.notAnswered'), cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' }
  if (userPick === q.correctLetter) return { text: t('result.correct'), cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200' }
  return { text: t('result.wrong'), cls: 'bg-red-100 text-red-700' }
}
</script>

<template>
  <div>
    <!-- Navy header -->
    <div class="bg-slate-900 text-white">
      <div class="max-w-6xl mx-auto px-4 py-8">
        <div class="flex items-center justify-between">
          <nav class="text-xs text-slate-400 dark:text-slate-500">
            <NuxtLink :to="`${base}/papers/${paper.id}`" class="hover:text-white">{{ t('result.crumbOverview') }}</NuxtLink>
            <span class="mx-1.5">/</span>
            <span class="text-slate-200">{{ t('result.crumbResult') }}</span>
          </nav>
          <NuxtLink
            :to="`${base}/papers/${paper.id}`"
            class="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border border-white/30 hover:bg-white/10 transition-colors"
          >
            ✕ {{ t('result.exit') }}
          </NuxtLink>
        </div>
        <h1 class="mt-4 text-2xl font-extrabold">{{ t('result.title') }}</h1>
        <p class="mt-1 text-sm text-slate-300">{{ paper.title }}</p>
      </div>
    </div>

    <div v-if="result" class="max-w-6xl mx-auto px-4 py-6 pb-40">
      <!-- Score + display toggle -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <ScorePills :score="result.score" :cefr="result.cefr" :correct="result.correct" :total="result.total" :mode="scoreMode" />
        <div class="mt-4 flex items-center gap-3">
          <span class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ t('result.scoreAs') }}</span>
          <div class="inline-flex rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden text-sm font-semibold">
            <button
              class="px-4 py-2 transition-colors"
              :class="scoreMode === 'score' ? 'bg-slate-800 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700'"
              @click="scoreMode = 'score'"
            >
              {{ t('result.scoreTab') }}
            </button>
            <button
              class="px-4 py-2 transition-colors"
              :class="scoreMode === 'cefr' ? 'bg-slate-800 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700'"
              @click="scoreMode = 'cefr'"
            >
              {{ t('result.cefrTab') }}
            </button>
          </div>
        </div>
      </div>

      <!-- Next step — directly under the score, unmissable. -->
      <div class="mt-4 flex flex-wrap gap-3">
        <NuxtLink
          v-if="nextPaper"
          :to="`${base}/papers/${nextPaper.id}`"
          class="text-sm font-semibold px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {{ t('result.nextTest') }} →
        </NuxtLink>
        <NuxtLink
          v-else
          :to="`${base}/papers`"
          class="text-sm font-semibold px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {{ t('result.viewAllTests') }} →
        </NuxtLink>
        <NuxtLink
          v-if="!activity.loading && activity.hasStarted"
          :to="`${base}/playlist`"
          class="text-sm font-semibold px-6 py-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
        >
          {{ t('result.practiceWeakness') }}
        </NuxtLink>
      </div>

      <!-- Part tabs -->
      <div class="mt-6 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          v-for="p in materialParts"
          :key="p.part"
          class="shrink-0 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-colors"
          :class="activePart === p.part ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-400'"
          @click="activePart = p.part"
        >
          {{ t('result.part') }} {{ p.part }} · {{ p.label }}
        </button>
      </div>

      <div v-if="activePart <= 4" class="mt-4">
        <AudioPlayer />
      </div>

      <!-- Question review blocks -->
      <div class="mt-4 space-y-4">
        <div
          v-for="q in partQuestions"
          :id="`q-${q.number}`"
          :key="q.number"
          class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 scroll-mt-32"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ t('take.questionOf', { n: q.number, total: result.total }) }}</p>
            <span v-if="markPill(q)" class="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0" :class="markPill(q)!.cls">
              {{ markPill(q)!.text }}
            </span>
          </div>
          <div v-if="q.context" class="mt-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {{ q.context }}
          </div>
          <p class="mt-3 text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{{ q.stem }}</p>
          <div class="mt-3 space-y-2">
            <div v-for="opt in q.options" :key="opt.letter" :class="optionClass(q, opt.letter)">
              <span class="text-sm font-bold text-slate-500 dark:text-slate-400 w-5 shrink-0">{{ opt.letter }}</span>
              <span class="text-sm text-slate-700 dark:text-slate-200 flex-1">{{ opt.text }}</span>
              <span v-if="opt.letter === q.correctLetter" class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-500 text-white shrink-0">{{ t('result.correct') }}</span>
              <span v-else-if="result.answers[q.number] === opt.letter" class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white shrink-0">{{ t('result.yourAnswer') }}</span>
            </div>
          </div>
          <p class="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed"><strong class="text-slate-600 dark:text-slate-300">{{ t('result.explanation') }}:</strong> {{ q.explanation }}</p>
        </div>
      </div>
    </div>

    <!-- Sticky bottom palette -->
    <div v-if="result" class="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div class="max-w-6xl mx-auto px-4 py-3">
        <div class="flex items-center gap-4 mb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-green-500 inline-block" /> {{ t('result.correct') }}</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-red-500 inline-block" /> {{ t('result.wrong') }}</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-slate-200 inline-block" /> {{ t('result.notAnswered') }}</span>
        </div>
        <QuestionPalette
          :parts="paletteParts"
          :current="-1"
          :answered="result.answers"
          :status="statusMap"
          @select="goTo"
        />
      </div>
    </div>
  </div>
</template>
