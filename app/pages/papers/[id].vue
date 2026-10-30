<script setup lang="ts">
import { getPaperOrFallback } from '~/data/mock'
import type { TestResult } from '~/utils/storage'

const route = useRoute()
const paperId = computed(() => route.params.id as string)
const paper = computed(() => getPaperOrFallback(paperId.value))

const result = ref<TestResult | null>(null)
const attempt = ref(1)
const scoreMode = ref<'score' | 'cefr'>('score')

onMounted(() => {
  result.value = getResult(paper.value.id)
})

const skills = computed(() => [
  {
    name: 'Listening',
    parts: 'Parts 1–4',
    duration: '45 minutes',
    questions: '100 questions',
    done: !!result.value
  },
  {
    name: 'Reading',
    parts: 'Parts 5–7',
    duration: '75 minutes',
    questions: '100 questions',
    done: !!result.value
  }
])
</script>

<template>
  <div>
    <!-- Dark navy hero -->
    <div class="bg-slate-900 text-white">
      <div class="max-w-6xl mx-auto px-4 py-8">
        <div class="flex items-center justify-between">
          <nav class="text-xs text-slate-400">
            <NuxtLink to="/papers" class="hover:text-white">Papers</NuxtLink>
            <span class="mx-1.5">/</span>
            <span class="text-slate-200">Overview</span>
          </nav>
          <NuxtLink
            to="/papers"
            class="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full border border-white/30 hover:bg-white/10 transition-colors"
          >
            ✕ Exit
          </NuxtLink>
        </div>
        <p class="mt-4 text-[11px] font-semibold uppercase tracking-widest text-blue-300">{{ paper.category }}</p>
        <h1 class="mt-1 text-2xl md:text-3xl font-extrabold">{{ paper.title }}</h1>
        <p class="mt-2 text-sm text-slate-300">
          {{ paper.durationMinutes }} minutes · {{ paper.totalQuestions }} questions · {{ paper.difficulty }} ·
          {{ paper.enrolled.toLocaleString('en-US') }} enrolled
        </p>
      </div>
    </div>

    <div class="max-w-6xl mx-auto px-4 pb-10">
      <!-- Ready to try card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 -mt-6 relative">
        <div class="flex flex-wrap items-center gap-4 justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-800">Ready to try?</h2>
            <p class="mt-1 text-sm text-slate-500">
              {{ paper.status === 'not-started' ? 'You have not attempted this paper yet.' : 'You have attempted this paper before.' }}
              This attempt costs <strong class="text-slate-700">{{ paper.creditsRequired }} LR credits</strong>
              (balance: <strong class="text-slate-700">12</strong>).
            </p>
          </div>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5" role="group" aria-label="Attempt">
              <button
                v-for="n in 3"
                :key="n"
                class="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors"
                :class="attempt === n ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 text-slate-500 hover:border-blue-400'"
                @click="attempt = n"
              >
                Attempt {{ n }}
              </button>
            </div>
            <NuxtLink
              :to="`/papers/${paper.id}/take?attempt=${attempt}`"
              class="text-sm font-semibold px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Start Test
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Score / CEFR toggle -->
      <div class="mt-6 flex items-center gap-3">
        <span class="text-sm font-medium text-slate-500">Show scores as:</span>
        <div class="inline-flex rounded-xl border border-slate-300 overflow-hidden text-sm font-semibold">
          <button
            class="px-4 py-2 transition-colors"
            :class="scoreMode === 'score' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:text-slate-700'"
            @click="scoreMode = 'score'"
          >
            TOEIC Score
          </button>
          <button
            class="px-4 py-2 transition-colors"
            :class="scoreMode === 'cefr' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:text-slate-700'"
            @click="scoreMode = 'cefr'"
          >
            CEFR Level
          </button>
        </div>
      </div>

      <!-- Per-skill cards -->
      <div class="mt-4 grid md:grid-cols-2 gap-4">
        <div v-for="s in skills" :key="s.name" class="bg-white rounded-2xl border border-slate-200 p-5">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-bold text-slate-800">{{ s.name }}</h3>
              <p class="text-xs text-slate-400 mt-0.5">{{ s.parts }}</p>
            </div>
            <span
              class="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              :class="s.done ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'"
            >
              {{ s.done ? 'Attempted' : 'Not attempted' }}
            </span>
          </div>
          <dl class="mt-3 text-sm text-slate-500 space-y-1">
            <div class="flex justify-between"><dt>Duration</dt><dd class="font-medium text-slate-700">{{ s.duration }}</dd></div>
            <div class="flex justify-between"><dt>Questions</dt><dd class="font-medium text-slate-700">{{ s.questions }}</dd></div>
            <div class="flex justify-between items-center">
              <dt>{{ scoreMode === 'score' ? 'Predicted score' : 'CEFR level' }}</dt>
              <dd>
                <span v-if="result" class="inline-block text-sm font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800">
                  {{ scoreMode === 'score' ? result.score : result.cefr }}
                </span>
                <span v-else class="text-slate-300 font-bold">—</span>
              </dd>
            </div>
          </dl>
          <NuxtLink
            v-if="result"
            :to="`/papers/${paper.id}/result`"
            class="mt-4 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors"
          >
            View Result
          </NuxtLink>
          <button
            v-else
            disabled
            class="mt-4 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-300 cursor-not-allowed"
          >
            View Result
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
