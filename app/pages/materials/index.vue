<script setup lang="ts">
const { t, locale } = useLocale()
import { MATERIALS, papersForMaterial } from '~/data/mock'
import { fetchSessionState } from '~/utils/server-auth'
import type { GlobalBoard, QuestStatus } from '~/utils/leaderboard'
import { claimQuest, fetchGlobalBoard, fetchQuestStatus } from '~/utils/leaderboard'

const router = useRouter()
const auth = ref<AuthState | null>(null)
/** Material slugs this user can open — resolved by the server. */
const allowed = ref<Set<string> | null>(null)

const owned = computed(() => MATERIALS.filter(m => m.status === 'owned'))
const comingSoon = computed(() => MATERIALS.filter(m => m.status === 'coming-soon'))

const displayName = computed(() => auth.value?.name || auth.value?.username || t('common.guest'))

/** Global learner stats — real monthly points/streak/rank from the
 * leaderboard API (D1). '—' until loaded: never a hardcoded number. */
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

/** Best accuracy % in a material (all-time, from D1 results) — '—'
 * when the user has no result there yet. */
function scoreOf(slug: string): string {
  const s = boardMe.value?.scores.find(x => x.slug === slug)
  return s?.bestAccuracy !== null && s?.bestAccuracy !== undefined ? `${s.bestAccuracy}%` : '—'
}

/** Owned materials the user can open — the score summary covers these. */
const openable = computed(() => owned.value.filter(m => canOpen(m.slug)))

function paperCount(slug: string): number {
  return papersForMaterial(slug).length
}

function canOpen(slug: string): boolean {
  return allowed.value?.has(slug) ?? false
}

onMounted(async () => {
  // Server session first (see layouts/default.vue): the localStorage
  // mirror may be missing while the cookie is valid — never redirect
  // on the mirror alone. The mirror is display-only here.
  const state = await fetchSessionState()
  if (!state.username) { router.replace('/auth'); return }
  auth.value = getAuth() ?? {
    username: state.username,
    remember: false,
    role: state.role,
    name: state.name ?? undefined,
    picture: state.picture ?? undefined,
  }
  allowed.value = new Set(state.materials)
  void refreshBoard()
})
</script>

<template>
  <div class="py-8">
    <!-- Greeting banner: the hub is the home, global analytics live here -->
    <div class="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white">
      <p class="text-blue-200 text-sm">{{ t('hub.welcomeBack') }}</p>
      <h1 class="text-2xl font-extrabold mt-0.5">{{ displayName }}</h1>
      <p class="text-blue-200 text-sm mt-1">{{ t('hub.sub') }}</p>
    </div>

    <!-- Global learner stats -->
    <div class="mt-5 grid grid-cols-3 gap-4">
      <StatTile v-for="s in stats" :key="s.label" :label="s.label" :value="s.value" :sub="s.sub" />
    </div>
    <div class="mt-3 flex justify-end">
      <NuxtLink to="/leaderboard" class="text-sm font-semibold text-blue-600 hover:text-blue-700">{{ t('hub.viewLeaderboard') }} →</NuxtLink>
    </div>

    <!-- Weekly Quest -->
    <div class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.questTitle') }}</h2>
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

    <!-- Per-material score summary (compact chips, not full cards) -->
    <div v-if="allowed !== null && openable.length" class="mt-8">
      <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">{{ t('hub.scoresTitle') }}</h2>
      <div class="mt-3 flex flex-wrap gap-3">
        <!-- Best accuracy % per material, from D1 results (all-time). -->
        <div v-for="m in openable" :key="m.slug" class="flex items-baseline gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5">
          <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ m.name }}</span>
          <span class="text-sm font-extrabold text-slate-900 dark:text-slate-100">{{ scoreOf(m.slug) }}</span>
        </div>
      </div>
    </div>

    <h2 class="mt-8 text-lg font-bold text-slate-900 dark:text-slate-100">{{ t('hub.title') }}</h2>

    <p v-if="allowed === null" class="mt-4 text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>

    <div v-else class="mt-4 grid gap-5 md:grid-cols-2">
      <template v-for="m in owned" :key="m.slug">
        <NuxtLink
          v-if="canOpen(m.slug)"
          :to="`/m/${m.slug}`"
          class="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="w-12 h-12 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm">{{ m.badge }}</span>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">{{ t('hub.active') }}</span>
          </div>
          <h2 class="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-700">{{ m.name }}</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ m.description }}</p>
          <div class="mt-4 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span class="font-medium">{{ paperCount(m.slug) }} {{ t('hub.papers') }}</span>
            <span v-for="c in m.credits" :key="c.label" class="font-semibold text-amber-700">{{ c.label }} · {{ c.balance }} {{ t('hub.credits') }}</span>
          </div>
          <span class="mt-5 inline-flex text-sm font-semibold text-blue-600 group-hover:gap-2.5 gap-1.5 transition-all">
            {{ t('hub.open') }} <span aria-hidden="true">→</span>
          </span>
        </NuxtLink>
        <!-- Locked: no grant (and no subscription yet) for this material -->
        <div
          v-else
          class="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-6 opacity-90"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold flex items-center justify-center text-sm">{{ m.badge }}</span>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">🔒 {{ t('hub.locked') }}</span>
          </div>
          <h2 class="mt-4 text-lg font-bold text-slate-700 dark:text-slate-200">{{ m.name }}</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ m.description }}</p>
          <p class="mt-4 text-xs text-slate-500 dark:text-slate-400">{{ t('hub.lockedNote') }}</p>
        </div>
      </template>
    </div>

    <h2 class="mt-12 text-lg font-bold text-slate-900 dark:text-slate-100">{{ t('hub.comingSoon') }}</h2>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('hub.comingSoonSub') }}</p>
    <div class="mt-4 grid gap-5 md:grid-cols-2">
      <div
        v-for="m in comingSoon"
        :key="m.slug"
        class="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-6 opacity-80"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 dark:text-slate-400 font-extrabold flex items-center justify-center text-sm">{{ m.badge }}</span>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{{ t('hub.comingSoon') }}</span>
        </div>
        <h3 class="mt-4 text-lg font-bold text-slate-700 dark:text-slate-200">{{ m.name }}</h3>
        <p class="mt-1 text-sm text-slate-400 dark:text-slate-500">{{ m.description }}</p>
      </div>
    </div>
  </div>
</template>
