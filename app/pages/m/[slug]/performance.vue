<script setup lang="ts">
definePageMeta({ layout: 'material' })

const { t } = useLocale()
const route = useRoute()
const slug = computed(() => route.params.slug as string)
const base = computed(() => `/m/${slug.value}`)

/** Real performance in this material (see README § "Performance from
 * real data"): best Full Simulation → score + CEFR, one journey point
 * per completed attempt, skills from the most recent simulation's
 * per-part breakdown. Empty for a new user: no finished paper in this
 * material means no journey, no score, no radar — just an honest empty
 * state. Falls back to the browser's local results when the server
 * store is unreachable. */
const perf = useMaterialPerformance(slug.value)

const activeTab = ref<'insights' | 'analytics'>('insights')
const dateRange = ref('30')
const skillFilter = ref('all')

/** Per-skill accuracy % from the most recent Full Simulation that has
 * a per-part breakdown — never demo values. */
const skillRows = computed(() => [
  { name: t('overview.listening'), pct: perf.skills?.listening ?? null },
  { name: t('overview.reading'), pct: perf.skills?.reading ?? null }
])

const analyticsBars = computed(() => [
  { name: t('overview.listening'), pct: perf.skills?.listening ?? null },
  { name: t('overview.reading'), pct: perf.skills?.reading ?? null },
  { name: t('performance.grammar'), pct: perf.skills?.grammar ?? null },
  { name: t('performance.vocab'), pct: perf.skills?.vocabulary ?? null }
])

/** 4-axis radar (Listening top, Reading right, Grammar bottom,
 * Vocabulary left) from the same real skill accuracies. No Speed axis
 * — there is no per-part source for it, so it is dropped rather than
 * invented. Null when there is no breakdown to draw from. The viewBox
 * is wider than tall (144×120) so the side labels fit without
 * clipping. */
const RADAR_CX = 72
const RADAR_CY = 60
const RADAR_R = 45
const radarPoints = computed(() => {
  if (!perf.skills) return null
  const vals = [perf.skills.listening, perf.skills.reading, perf.skills.grammar, perf.skills.vocabulary]
  if (vals.every(v => v === null)) return null
  const angles = [-90, 0, 90, 180]
  return vals.map((v, i) => {
    const r = RADAR_R * ((v ?? 0) / 100)
    const a = (angles[i] as number) * Math.PI / 180
    return `${(RADAR_CX + r * Math.cos(a)).toFixed(1)},${(RADAR_CY + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
})

const legend = computed(() => [
  { label: t('performance.strongTitle'), range: '75–100', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200 border-green-200' },
  { label: t('performance.weakTitle'), range: '0–74', cls: 'bg-amber-100 text-amber-700 border-amber-200' }
])

function barColor(pct: number): string {
  if (pct >= 75) return 'bg-green-500'
  if (pct >= 51) return 'bg-amber-400'
  return 'bg-red-500'
}

function downloadReport(): void {
  window.print()
}
</script>

<template>
  <div>
    <!-- Banner -->
    <div class="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white">
      <h1 class="text-2xl font-extrabold">{{ t('performance.title') }}</h1>
      <p class="mt-1 text-sm text-blue-200">{{ t('performance.sub') }}</p>
    </div>

    <!-- Loading: performance is still being read — show nothing yet
         rather than flashing the empty state at a user with results. -->
    <p v-if="perf.loading" class="mt-5 text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>

    <!-- Empty: no finished paper in this material yet. -->
    <div v-else-if="perf.attempts.length === 0" class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
      <h2 class="text-lg font-extrabold text-slate-800 dark:text-slate-200">{{ t('dashboard.noResultsTitle') }}</h2>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{{ t('dashboard.noResultsText') }}</p>
      <NuxtLink
        :to="`${base}/papers`"
        class="mt-5 inline-block text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
      >
        {{ t('papers.startTest') }}
      </NuxtLink>
    </div>

    <template v-else>
    <!-- Filter row -->
    <div class="mt-5 flex flex-wrap gap-3">
      <label class="text-sm flex items-center gap-2">
        <span class="text-slate-500 dark:text-slate-400 font-medium">{{ t('performance.period') }}</span>
        <select v-model="dateRange" class="rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="7">{{ t('performance.last7') }}</option>
          <option value="30">{{ t('performance.last30') }}</option>
          <option value="90">{{ t('performance.last90') }}</option>
        </select>
      </label>
      <label class="text-sm flex items-center gap-2">
        <span class="text-slate-500 dark:text-slate-400 font-medium">{{ t('performance.skill') }}</span>
        <select v-model="skillFilter" class="rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">{{ t('performance.allSkills') }}</option>
          <option value="listening">{{ t('overview.listening') }}</option>
          <option value="reading">{{ t('overview.reading') }}</option>
        </select>
      </label>
    </div>

    <!-- Journey: one point per completed attempt, chronological. -->
    <div class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.journey') }}</h2>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('dashboard.journeySub') }}</p>
      <JourneyChart :attempts="perf.attempts" class="mt-2" />
    </div>

    <!-- Tabs -->
    <div class="mt-4 flex gap-2 border-b border-slate-200 dark:border-slate-700">
      <button
        class="relative px-4 py-3 text-sm font-semibold"
        :class="activeTab === 'insights' ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'"
        @click="activeTab = 'insights'"
      >
        {{ t('performance.quickTitle') }}
        <span v-if="activeTab === 'insights'" class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600" />
      </button>
      <button
        class="relative px-4 py-3 text-sm font-semibold"
        :class="activeTab === 'analytics' ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'"
        @click="activeTab = 'analytics'"
      >
        {{ t('performance.fullTitle') }}
        <span v-if="activeTab === 'analytics'" class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600" />
      </button>
    </div>

    <!-- Quick insights -->
    <div v-if="activeTab === 'insights'" class="mt-5 grid md:grid-cols-2 gap-4">
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('performance.avgScore') }}</h2>
        <!-- Per-skill accuracy from the most recent simulation's
             breakdown; honest empty state when there is none. -->
        <template v-if="perf.skills">
          <ul class="mt-4 space-y-3">
            <li v-for="s in skillRows" :key="s.name">
              <div class="flex justify-between text-sm mb-1.5">
                <span class="text-slate-500 dark:text-slate-400 font-medium">{{ s.name }}</span>
                <strong class="text-slate-800 dark:text-slate-200 tabular-nums">{{ s.pct }}%</strong>
              </div>
              <div class="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div class="h-full rounded-full bg-blue-600" :style="{ width: `${s.pct ?? 0}%` }" />
              </div>
            </li>
          </ul>
        </template>
        <div v-else class="mt-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-4 text-center">
          <p class="font-bold text-slate-800 dark:text-slate-200">{{ t('performance.noSkillsTitle') }}</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('performance.noSkillsText') }}</p>
        </div>
        <!-- Best Full Simulation → overall score + CEFR. Drills only:
             a journey but no score — a Full Simulation is required. -->
        <div v-if="perf.bestSim" class="mt-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
          <div>
            <p class="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">{{ t('performance.total') }}</p>
            <p class="text-3xl font-extrabold text-slate-800 dark:text-slate-200">{{ perf.bestSim.score }}</p>
            <p class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{{ t('dashboard.scoreEstimate') }}</p>
          </div>
          <span class="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">CEFR · {{ perf.bestSim.cefr }}</span>
        </div>
        <p v-else class="mt-5 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2">
          {{ t('dashboard.noSimScore') }}
        </p>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 flex flex-col">
        <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('performance.radar') }}</h2>
        <svg v-if="radarPoints" viewBox="0 0 144 120" class="w-44 h-44 mx-auto mt-2" role="img" aria-label="Skill radar">
          <polygon points="72,15 117,60 72,105 27,60" fill="none" stroke="#e2e8f0" stroke-width="1.5" />
          <polygon :points="radarPoints" fill="rgba(37,99,235,0.18)" stroke="#2563eb" stroke-width="2" />
          <g font-size="7" fill="#94a3b8" text-anchor="middle">
            <text x="72" y="10">{{ t('overview.listening') }}</text>
            <text x="130" y="62" font-size="6">{{ t('overview.reading') }}</text>
            <text x="72" y="114">{{ t('performance.grammar') }}</text>
            <text x="14" y="62" font-size="6">{{ t('performance.vocab') }}</text>
          </g>
        </svg>
        <div v-else class="mt-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-4 text-center">
          <p class="font-bold text-slate-800 dark:text-slate-200">{{ t('performance.noSkillsTitle') }}</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('performance.noSkillsText') }}</p>
        </div>
        <button
          class="mt-auto w-full text-sm font-semibold px-4 py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 transition-colors"
          @click="downloadReport"
        >
          {{ t('performance.download') }}
        </button>
      </div>
    </div>

    <!-- Full analytics -->
    <div v-else class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('performance.fullTitle') }}</h2>
      <div class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="l in legend"
          :key="l.label"
          class="text-[11px] font-bold px-3 py-1.5 rounded-full border"
          :class="l.cls"
        >
          {{ l.label }} · {{ l.range }}
        </span>
      </div>
      <template v-if="perf.skills">
        <ul class="mt-5 space-y-4">
          <li v-for="b in analyticsBars" :key="b.name">
            <div class="flex justify-between text-sm mb-1.5">
              <span class="text-slate-600 dark:text-slate-300 font-medium">{{ b.name }}</span>
              <strong class="text-slate-800 dark:text-slate-200 tabular-nums">{{ b.pct }}%</strong>
            </div>
            <div class="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div class="h-full rounded-full transition-all" :class="barColor(b.pct ?? 0)" :style="{ width: `${b.pct ?? 0}%` }" />
            </div>
          </li>
        </ul>
      </template>
      <div v-else class="mt-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-4 text-center">
        <p class="font-bold text-slate-800 dark:text-slate-200">{{ t('performance.noSkillsTitle') }}</p>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('performance.noSkillsText') }}</p>
      </div>
    </div>
    </template>
  </div>
</template>
