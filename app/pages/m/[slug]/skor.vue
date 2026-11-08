<script setup lang="ts">
import { MATERIALS, getPaperOrFallback } from '~/data/mock'
import { shortPaperName } from '~/utils/unlock'
import { fetchSessionState } from '~/utils/server-auth'
import type { GlobalBoard, QuestStatus } from '~/utils/leaderboard'
import { claimQuest, fetchGlobalBoard, fetchQuestStatus } from '~/utils/leaderboard'

definePageMeta({ layout: 'material' })

const { t, locale } = useLocale()
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

/** Attempt history: every completed attempt in this material, newest
 * first — paper, date, score, kind. The journey chart plots these
 * same points. */
function attemptDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(locale.value === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}
const historyRows = computed(() => [...perf.attempts].reverse())

/* ------------------------------------------------------------------ */
/* Peringkat (leaderboard) — same board as before, now a section of   */
/* this page instead of a top-level tab.                               */
/* ------------------------------------------------------------------ */

/** Materials the user can open — one tab each on the board. */
const boardMaterials = ref<{ slug: string, name: string }[]>([])

/* ------------------------------------------------------------------ */
/* Misi Mingguan + Beruntun — the global points/streak/quest state,    */
/* moved here from the old hub (which is now just the picker).         */
/* ------------------------------------------------------------------ */

const boardMe = ref<GlobalBoard['me'] | null>(null)
const boardParticipants = ref(0)
const questState = ref<QuestStatus | null>(null)
const claiming = ref(false)

const stats = computed(() => [
  { label: t('dashboard.points'), value: boardMe.value ? boardMe.value.points.toLocaleString('en-US') : '—', sub: boardMe.value ? t('dashboard.pointsBreakdown', { t: boardMe.value.testPoints, q: boardMe.value.questPoints, s: boardMe.value.streakPoints }) : '—' },
  { label: t('dashboard.streak'), value: boardMe.value ? `${boardMe.value.streak} ${locale.value === 'id' ? 'hari' : 'days'}` : '—', sub: t('dashboard.streakSub') },
  { label: t('dashboard.rank'), value: boardMe.value?.rank ? `#${boardMe.value.rank}` : '—', sub: boardMe.value?.rank ? t('dashboard.rankOf', { n: boardParticipants.value }) : (boardMe.value ? t('leaderboard.notRanked') : '—') }
])

/** Weekly Quest — progress derived from D1 results (see
 * server/utils/leaderboard.ts), never hardcoded. */
const quests = computed(() => {
  const qs = questState.value?.quests ?? []
  return (['sim', 'score700', 'drills'] as const).map((id, i) => {
    const s = qs.find(q => q.id === id)
    return { id, label: t(`dashboard.quest${i + 1}`), done: s?.done ?? false, claimed: s?.claimed ?? false }
  })
})
const questDone = computed(() => quests.value.filter(q => q.done).length)
const claimable = computed(() => quests.value.filter(q => q.done && !q.claimed))
const claimLabel = computed(() => {
  if (claiming.value || claimable.value.length) return t('leaderboard.claimPoints')
  if (quests.value.some(q => q.claimed)) return t('leaderboard.claimed')
  return t('leaderboard.claimPoints')
})

/** Time left in the current quest week (ends Monday 00:00 UTC). */
const endsIn = computed(() => {
  if (!questState.value) return '—'
  const end = new Date(`${questState.value.weekStart}T00:00:00Z`)
  end.setUTCDate(end.getUTCDate() + 7)
  const ms = Math.max(0, end.getTime() - Date.now())
  return t('dashboard.endsIn', { d: Math.floor(ms / 86400000), h: Math.floor((ms % 86400000) / 3600000) })
})

async function refreshBoard(): Promise<void> {
  const [b, s] = await Promise.all([fetchGlobalBoard(), fetchQuestStatus()])
  if (b.ok) { boardMe.value = b.board.me; boardParticipants.value = b.board.rows.length }
  if (s.ok) questState.value = s.status
}

async function claimAll(): Promise<void> {
  if (!claimable.value.length || claiming.value) return
  claiming.value = true
  for (const q of claimable.value) await claimQuest(q.id)
  await refreshBoard()
  claiming.value = false
}

onMounted(async () => {
  const state = await fetchSessionState()
  boardMaterials.value = MATERIALS
    .filter(m => m.status === 'owned' && state.materials.includes(m.slug))
    .map(m => ({ slug: m.slug, name: m.name }))
  void refreshBoard()
  // Old /leaderboard links land here with ?section=peringkat.
  if (route.query.section === 'peringkat') {
    nextTick(() => {
      document.getElementById('peringkat')?.scrollIntoView({ behavior: 'smooth' })
    })
  }
})
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
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ slug === 'toeic-lr' ? t('dashboard.journeySub') : t('dashboard.journeySubAccuracy') }}</p>
      <JourneyChart :attempts="perf.attempts" :mode="slug === 'toeic-lr' ? 'toeic' : 'accuracy'" class="mt-2" />
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

    <!-- Attempt history -->
    <div class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('performance.historyTitle') }}</h2>
      <ul class="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
        <li v-for="a in historyRows" :key="`${a.paperId}-${a.date}`" class="py-3 flex items-center gap-3 text-sm first:pt-0 last:pb-0">
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-slate-700 dark:text-slate-200 truncate">{{ shortPaperName(getPaperOrFallback(a.paperId).title) }}</p>
            <p class="text-xs text-slate-400 dark:text-slate-500">
              {{ attemptDate(a.date) }} · {{ a.kind === 'simulation' ? t('papers.fullSim') : t('papers.drillPack') }}
            </p>
          </div>
          <span class="text-base font-extrabold text-slate-800 dark:text-slate-200 tabular-nums">{{ a.score }}<span v-if="slug !== 'toeic-lr'" class="text-xs font-bold text-slate-400 dark:text-slate-500">%</span></span>
        </li>
      </ul>
    </div>
    </template>

    <!-- Misi Mingguan + Beruntun: global points, streak, rank, quests.
         Real monthly data from the leaderboard API — '—' until loaded,
         never a hardcoded number. -->
    <div class="mt-8">
      <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">{{ t('dashboard.questTitle') }}</h2>
      <div class="mt-3 grid grid-cols-3 gap-4">
        <StatTile v-for="s in stats" :key="s.label" :label="s.label" :value="s.value" :sub="s.sub" />
      </div>
      <div class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.questTitle') }}</h3>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">{{ endsIn }}</span>
        </div>
        <ul class="mt-4 space-y-2.5">
          <li v-for="q in quests" :key="q.label" class="flex items-center gap-3 text-sm">
            <span
              class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              :class="q.done ? 'bg-green-500 text-white' : 'border-2 border-slate-300 dark:border-slate-600 text-transparent'"
            >✓</span>
            <span :class="q.done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-600 dark:text-slate-300'">{{ q.label }}</span>
            <span v-if="q.claimed" class="ml-auto text-xs font-semibold text-amber-700">{{ t('leaderboard.claimed') }}</span>
          </li>
        </ul>
        <div class="mt-4 flex items-center justify-between">
          <p class="text-sm text-slate-500 dark:text-slate-400">{{ questDone }}/{{ quests.length }} completed</p>
          <button
            class="text-sm font-semibold px-4 py-2 rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-500 transition-colors disabled:opacity-40"
            :disabled="claiming || !claimable.length"
            @click="claimAll"
          >
            {{ claimLabel }}
          </button>
        </div>
        <div class="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div class="h-full bg-amber-400 rounded-full transition-all" :style="{ width: `${(questDone / quests.length) * 100}%` }" />
        </div>
      </div>
    </div>

    <!-- Peringkat: Global (monthly) + per-material tabs. -->
    <div id="peringkat" class="mt-8 scroll-mt-20">
      <LeaderboardBoard :preselect="slug" :materials="boardMaterials" />
    </div>
  </div>
</template>
