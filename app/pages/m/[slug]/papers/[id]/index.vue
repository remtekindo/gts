<script setup lang="ts">
import { getMaterialOrFallback, getPaperOrFallback, partsForMaterial } from '~/data/mock'

const { t } = useLocale()

definePageMeta({ layout: 'material' })
import type { TestResult } from '~/utils/storage'

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const base = computed(() => `/m/${slug.value}`)
const material = computed(() => getMaterialOrFallback(slug.value))
const paperId = computed(() => route.params.id as string)
const paper = computed(() => getPaperOrFallback(paperId.value))

const result = ref<TestResult | null>(null)
const attempt = ref(1)
const scoreMode = ref<'score' | 'cefr'>('score')

/** "Attempted" from real data — a finished result, or saved answers
 * for an unfinished attempt — never the old hardcoded catalog status.
 * The finished check reads the same server-derived ids as the paper
 * badges, so a test completed on another device counts here too. */
const activity = useMaterialActivity(slug.value)
const hasSavedAnswers = ref(false)
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
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 -mt-6 relative">
        <div class="flex flex-wrap items-center gap-4 justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-200">{{ t('overview.readyTitle') }}</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ attempted ? t('overview.attempted') : t('overview.notStarted') }}
              {{ t('overview.attemptCosts') }} <strong class="text-slate-700 dark:text-slate-200">{{ paper.creditsRequired }} {{ material.credits[0]?.label ?? "" }} {{ t('overview.credits') }}</strong>
              (balance: <strong class="text-slate-700 dark:text-slate-200">12</strong>).
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-1.5" role="group" :aria-label="t('overview.attempt')">
              <button
                v-for="n in 3"
                :key="n"
                class="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors"
                :class="attempt === n ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-blue-400'"
                @click="attempt = n"
              >
                {{ t('overview.attempt') }} {{ n }}
              </button>
            </div>
            <NuxtLink
              :to="`${base}/papers/${paper.id}/take?attempt=${attempt}`"
              class="w-full sm:w-auto text-center text-sm font-semibold px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {{ t('overview.startTest') }}
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Score / CEFR toggle -->
      <div class="mt-6 flex items-center gap-3">
        <span class="text-sm font-medium text-slate-500 dark:text-slate-400">Show scores as:</span>
        <div class="inline-flex rounded-xl border border-slate-300 dark:border-slate-600 overflow-hidden text-sm font-semibold">
          <button
            class="px-4 py-2 transition-colors"
            :class="scoreMode === 'score' ? 'bg-slate-800 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700'"
            @click="scoreMode = 'score'"
          >
            {{ t('overview.scoreTab') }}
          </button>
          <button
            class="px-4 py-2 transition-colors"
            :class="scoreMode === 'cefr' ? 'bg-slate-800 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-700'"
            @click="scoreMode = 'cefr'"
          >
            {{ t('overview.cefrTab') }}
          </button>
        </div>
      </div>

      <!-- Per-skill cards -->
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
              <dt>{{ scoreMode === 'score' ? t('overview.predictedScore') : t('overview.cefrTab') }}</dt>
              <dd>
                <span v-if="result" class="inline-block text-sm font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                  {{ scoreMode === 'score' ? result.score : result.cefr }}
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
            View Result
          </NuxtLink>
          <button
            v-else
            disabled
            class="mt-4 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-300 cursor-not-allowed"
          >
            View Result
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
