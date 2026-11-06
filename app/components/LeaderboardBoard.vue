<script setup lang="ts">
import type { GlobalBoard, MaterialBoard } from '~/utils/leaderboard'
import { fetchGlobalBoard, fetchMaterialBoard } from '~/utils/leaderboard'

const { t, locale } = useLocale()

const props = defineProps<{
  /** Material slug to preselect, or null for the Global tab. */
  preselect?: string | null
  /** Materials the user can open — one tab each. */
  materials: { slug: string, name: string }[]
}>()

/** 'global' or a material slug. */
const active = ref<string>('global')
const globalBoard = ref<GlobalBoard | null>(null)
const materialBoards = ref<Record<string, MaterialBoard>>({})
const loading = ref(true)
const loadError = ref(false)

const activeMaterial = computed(() => props.materials.find(m => m.slug === active.value) ?? null)
const activeMaterialBoard = computed(() => (active.value === 'global' ? null : materialBoards.value[active.value] ?? null))

/** 'November 2026' from a 'YYYY-MM' season key, in the UI locale. */
function seasonLabel(month: string): string {
  const d = new Date(`${month}-01T00:00:00Z`)
  return d.toLocaleDateString(locale.value === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' })
}

function rankClass(rank: number): string {
  if (rank === 1) return 'bg-amber-400 text-amber-950'
  if (rank === 2) return 'bg-slate-300 text-slate-700 dark:text-slate-200'
  if (rank === 3) return 'bg-orange-300 text-orange-900'
  return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
}

async function loadGlobal(): Promise<void> {
  const res = await fetchGlobalBoard()
  if (!res.ok) { loadError.value = true; return }
  globalBoard.value = res.board
}

async function loadMaterial(slug: string): Promise<void> {
  if (materialBoards.value[slug]) return
  const res = await fetchMaterialBoard(slug)
  if (!res.ok) { loadError.value = true; return }
  materialBoards.value = { ...materialBoards.value, [slug]: res.board }
}

async function select(tab: string): Promise<void> {
  active.value = tab
  loadError.value = false
  if (tab === 'global') await loadGlobal()
  else await loadMaterial(tab)
}

onMounted(async () => {
  if (props.preselect && props.materials.some(m => m.slug === props.preselect)) {
    active.value = props.preselect as string
    await loadMaterial(props.preselect as string)
  } else {
    await loadGlobal()
  }
  // The Global tab's "me" (points/streak/rank) is also what the hub
  // tiles show — load it in the background when a material tab opens
  // first, so switching to Global is instant.
  if (active.value !== 'global' && !globalBoard.value) await loadGlobal()
  loading.value = false
})
</script>

<template>
  <div class="pb-28">
    <div class="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white">
      <h1 class="text-2xl font-extrabold">{{ t('leaderboard.title') }}</h1>
      <p class="mt-1 text-sm text-blue-200">
        {{ active === 'global' ? t('leaderboard.sub') : t('leaderboard.subMaterial', { name: activeMaterial?.name ?? '' }) }}
      </p>
    </div>

    <!-- Tabs: Global + one per material the user can open -->
    <div class="mt-5 flex gap-2 overflow-x-auto pb-1">
      <button
        class="shrink-0 text-sm font-semibold px-4 py-2 rounded-full transition-colors"
        :class="active === 'global' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
        @click="select('global')"
      >
        {{ t('leaderboard.tabsGlobal') }}
      </button>
      <button
        v-for="m in materials"
        :key="m.slug"
        class="shrink-0 text-sm font-semibold px-4 py-2 rounded-full transition-colors"
        :class="active === m.slug ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'"
        @click="select(m.slug)"
      >
        {{ m.name }}
      </button>
    </div>

    <p v-if="loading" class="mt-6 text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
    <p v-else-if="loadError" class="mt-6 text-sm text-red-600 dark:text-red-400">{{ t('leaderboard.loadError') }}</p>

    <template v-else-if="active === 'global' && globalBoard">
      <!-- Season label: the global board is monthly -->
      <p class="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {{ t('leaderboard.season') }} · {{ seasonLabel(globalBoard.month) }}
      </p>

      <!-- Your position -->
      <div class="mt-3 bg-slate-900 text-white rounded-2xl shadow-lg px-5 py-4 flex items-center gap-4">
        <span class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{{ t('leaderboard.yourRanking') }}</span>
        <span class="w-9 h-9 shrink-0 rounded-full bg-blue-600 text-sm font-extrabold flex items-center justify-center">
          {{ globalBoard.me.rank ? `#${globalBoard.me.rank}` : '—' }}
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold">
            {{ globalBoard.me.rank ? `${globalBoard.me.points.toLocaleString('en-US')} ${t('dashboard.points').toLowerCase()}` : t('leaderboard.notRanked') }}
          </p>
          <p class="text-xs text-slate-400 dark:text-slate-500">
            {{ t('leaderboard.testPoints') }} {{ globalBoard.me.testPoints }} · {{ t('leaderboard.questPoints') }} {{ globalBoard.me.questPoints }} · {{ t('leaderboard.streakPoints') }} {{ globalBoard.me.streakPoints }} · 🔥 {{ globalBoard.me.streak }}d
          </p>
        </div>
      </div>

      <div v-if="globalBoard.rows.length === 0" class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center">
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('leaderboard.emptyGlobal') }}</p>
      </div>
      <div v-else class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 overflow-hidden">
        <div
          v-for="e in globalBoard.rows"
          :key="e.rank"
          class="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800"
          :class="e.isMe ? 'bg-blue-50 dark:bg-blue-950' : ''"
        >
          <span
            class="w-9 h-9 shrink-0 rounded-full text-sm font-extrabold flex items-center justify-center"
            :class="rankClass(e.rank)"
          >
            {{ e.rank }}
          </span>
          <span class="w-10 h-10 shrink-0 rounded-full bg-slate-200 text-slate-500 dark:text-slate-400 text-sm font-bold flex items-center justify-center">
            {{ e.name.charAt(0) }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-slate-800 dark:text-slate-200">
              {{ e.name }}
              <span v-if="e.isMe" class="ml-1 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-600 text-white align-middle">{{ t('leaderboard.you') }}</span>
            </p>
            <p class="text-xs text-slate-400 dark:text-slate-500">🔥 {{ e.streak }}d {{ t('dashboard.streak').toLowerCase() }}</p>
          </div>
          <p class="text-sm font-extrabold text-slate-800 dark:text-slate-200 tabular-nums">{{ e.points.toLocaleString('en-US') }} <span class="font-medium text-slate-400 dark:text-slate-500">pts</span></p>
        </div>
      </div>
      <p v-if="globalBoard.rows.length === 1 && globalBoard.rows[0]?.isMe" class="mt-4 text-center text-sm text-slate-400 dark:text-slate-500">{{ t('leaderboard.onlyYou') }}</p>
    </template>

    <template v-else-if="active !== 'global' && activeMaterialBoard">
      <!-- Your position on this material -->
      <div class="mt-4 bg-slate-900 text-white rounded-2xl shadow-lg px-5 py-4 flex items-center gap-4">
        <span class="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{{ t('leaderboard.yourRanking') }}</span>
        <span class="w-9 h-9 shrink-0 rounded-full bg-blue-600 text-sm font-extrabold flex items-center justify-center">
          {{ activeMaterialBoard.me.rank ? `#${activeMaterialBoard.me.rank}` : '—' }}
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold">
            {{ activeMaterialBoard.me.accuracy !== null ? `${activeMaterialBoard.me.accuracy}% ${t('leaderboard.accuracy').toLowerCase()}` : t('leaderboard.notRanked') }}
          </p>
          <p class="text-xs text-slate-400 dark:text-slate-500">
            {{ activeMaterialBoard.me.sims }} {{ t('leaderboard.sims').toLowerCase() }}
          </p>
        </div>
      </div>

      <div v-if="activeMaterialBoard.rows.length === 0" class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center">
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ t('leaderboard.emptyMaterial') }}</p>
        <p class="mt-1 text-sm text-slate-400 dark:text-slate-500">{{ t('leaderboard.completeSimFirst') }}</p>
      </div>
      <div v-else class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 overflow-hidden">
        <div
          v-for="e in activeMaterialBoard.rows"
          :key="e.rank"
          class="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800"
          :class="e.isMe ? 'bg-blue-50 dark:bg-blue-950' : ''"
        >
          <span
            class="w-9 h-9 shrink-0 rounded-full text-sm font-extrabold flex items-center justify-center"
            :class="rankClass(e.rank)"
          >
            {{ e.rank }}
          </span>
          <span class="w-10 h-10 shrink-0 rounded-full bg-slate-200 text-slate-500 dark:text-slate-400 text-sm font-bold flex items-center justify-center">
            {{ e.name.charAt(0) }}
          </span>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-slate-800 dark:text-slate-200">
              {{ e.name }}
              <span v-if="e.isMe" class="ml-1 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-600 text-white align-middle">{{ t('leaderboard.you') }}</span>
            </p>
            <p class="text-xs text-slate-400 dark:text-slate-500">{{ e.sims }} {{ t('leaderboard.sims').toLowerCase() }}</p>
          </div>
          <p class="text-sm font-extrabold text-slate-800 dark:text-slate-200 tabular-nums">{{ e.accuracy }}%</p>
        </div>
      </div>
      <p v-if="activeMaterialBoard.rows.length === 1 && activeMaterialBoard.rows[0]?.isMe" class="mt-4 text-center text-sm text-slate-400 dark:text-slate-500">{{ t('leaderboard.onlyYou') }}</p>
    </template>
  </div>
</template>
