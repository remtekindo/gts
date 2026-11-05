<script setup lang="ts">
import { getPaperOrFallback, PARTS, QUESTIONS } from '~/data/mock'
import type { AnswerMap, TestResult } from '~/utils/storage'
import type { MarkStatus } from '~/components/QuestionPalette.vue'

const route = useRoute()
const router = useRouter()

const paperId = computed(() => route.params.id as string)
const paper = computed(() => getPaperOrFallback(paperId.value))

const result = ref<TestResult | null>(null)
const activePart = ref(1)

onMounted(() => {
  result.value = getResult(paper.value.id)
  if (!result.value) router.replace(`/papers/${paper.value.id}`)
})

const partQuestions = computed(() => QUESTIONS.filter(q => q.part === activePart.value))

const statusMap = computed<Record<number, MarkStatus>>(() => {
  const map: Record<number, MarkStatus> = {}
  for (const q of QUESTIONS) {
    const a = result.value?.answers[q.number]
    map[q.number] = !a ? 'unanswered' : a === q.correctLetter ? 'correct' : 'wrong'
  }
  return map
})

const paletteParts = computed(() =>
  PARTS.map(p => ({
    label: `Part ${p.part}`,
    numbers: QUESTIONS.filter(q => q.part === p.part).map(q => q.number)
  }))
)

function goTo(n: number): void {
  const q = QUESTIONS.find(x => x.number === n)
  if (q) {
    activePart.value = q.part
    nextTick(() => {
      document.getElementById(`q-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }
}

function optionClass(q: (typeof QUESTIONS)[number], letter: string): string {
  const base = 'w-full flex items-center gap-3 text-left rounded-xl border-2 px-4 py-3'
  const userPick = result.value?.answers[q.number]
  if (letter === q.correctLetter) return `${base} border-green-500 bg-green-50`
  if (userPick === letter) return `${base} border-red-500 bg-red-50`
  return `${base} border-slate-200 bg-white opacity-70`
}

function markPill(q: (typeof QUESTIONS)[number]): { text: string; cls: string } | null {
  const userPick = result.value?.answers[q.number]
  if (!userPick) return { text: 'Not answered', cls: 'bg-slate-100 text-slate-500' }
  if (userPick === q.correctLetter) return { text: 'Correct', cls: 'bg-green-100 text-green-700' }
  return { text: 'Wrong', cls: 'bg-red-100 text-red-700' }
}
</script>

<template>
  <div>
    <!-- Navy header -->
    <div class="bg-slate-900 text-white">
      <div class="max-w-6xl mx-auto px-4 py-8">
        <div class="flex items-center justify-between">
          <nav class="text-xs text-slate-400">
            <NuxtLink :to="`/papers/${paper.id}`" class="hover:text-white">Overview</NuxtLink>
            <span class="mx-1.5">/</span>
            <span class="text-slate-200">Result</span>
          </nav>
          <NuxtLink
            :to="`/papers/${paper.id}`"
            class="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border border-white/30 hover:bg-white/10 transition-colors"
          >
            ✕ Exit
          </NuxtLink>
        </div>
        <h1 class="mt-4 text-2xl font-extrabold">Test Result</h1>
        <p class="mt-1 text-sm text-slate-300">{{ paper.title }}</p>
        <div v-if="result" class="mt-4">
          <ScorePills :score="result.score" :cefr="result.cefr" :correct="result.correct" :total="result.total" />
        </div>
      </div>
    </div>

    <div v-if="result" class="max-w-6xl mx-auto px-4 py-6 pb-40">
      <!-- Part tabs -->
      <div class="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          v-for="p in PARTS"
          :key="p.part"
          class="shrink-0 text-xs font-semibold px-4 py-2.5 rounded-xl border transition-colors"
          :class="activePart === p.part ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-500 hover:border-slate-400'"
          @click="activePart = p.part"
        >
          Part {{ p.part }} · {{ p.label }}
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
          class="bg-white rounded-2xl border border-slate-200 p-5 scroll-mt-32"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="text-sm font-bold text-slate-700">Question {{ q.number }}</p>
            <span v-if="markPill(q)" class="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0" :class="markPill(q)!.cls">
              {{ markPill(q)!.text }}
            </span>
          </div>
          <div v-if="q.context" class="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {{ q.context }}
          </div>
          <p class="mt-3 text-sm text-slate-700 leading-relaxed">{{ q.stem }}</p>
          <div class="mt-3 space-y-2">
            <div v-for="opt in q.options" :key="opt.letter" :class="optionClass(q, opt.letter)">
              <span class="text-sm font-bold text-slate-500 w-5 shrink-0">{{ opt.letter }}</span>
              <span class="text-sm text-slate-700 flex-1">{{ opt.text }}</span>
              <span v-if="opt.letter === q.correctLetter" class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-500 text-white shrink-0">Correct</span>
              <span v-else-if="result.answers[q.number] === opt.letter" class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white shrink-0">Your pick</span>
            </div>
          </div>
          <p class="mt-3 text-xs text-slate-500 leading-relaxed"><strong class="text-slate-600">Explanation:</strong> {{ q.explanation }}</p>
        </div>
      </div>
    </div>

    <!-- Sticky bottom palette -->
    <div v-if="result" class="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div class="max-w-6xl mx-auto px-4 py-3">
        <div class="flex items-center gap-4 mb-2 text-[11px] font-semibold text-slate-500">
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-green-500 inline-block" /> Correct</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-red-500 inline-block" /> Wrong</span>
          <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-slate-200 inline-block" /> Unanswered</span>
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
