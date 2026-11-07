<script setup lang="ts">
import { papersForMaterial } from '~/data/mock'
import type { PaperStatus } from '~/data/mock'
import { resolvePaperLock, shortPaperName } from '~/utils/unlock'

const { t } = useLocale()

definePageMeta({ layout: 'material' })

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const base = computed(() => `/m/${slug.value}`)

const papers = computed(() => papersForMaterial(slug.value))
const availablePapers = computed(() => papers.value.slice(0, 3))

/** New-user gates (see README § "New-user empty states"): Continue
 * shows only for a genuinely in-progress attempt in this material;
 * Playlist unlocks after any attempt here; Live Test unlocks after
 * one finished paper anywhere; the Performance card is empty until
 * a finished paper exists in this material. */
const activity = useMaterialActivity(slug.value)

/** Real performance in this material (see README § "Performance from
 * real data"): best Full Simulation → score + CEFR, one journey point
 * per completed attempt, skills from the most recent simulation's
 * per-part breakdown. Falls back to the browser's local results when
 * the server store is unreachable. */
const perf = useMaterialPerformance(slug.value)

/** Paper badge status, derived from the user's real results — never
 * the catalog (see `resolvePaperStatus` in useActivity.ts). The id
 * arrays are seeded from the browser's local snapshot at setup, so
 * the badges are right on first paint; the server fetch refines the
 * completed ids (tests finished on another device). */
const paperStatus = computed<Record<string, PaperStatus>>(() => {
  const map: Record<string, PaperStatus> = {}
  for (const p of papers.value) map[p.id] = resolvePaperStatus(p.id, activity.completedPaperIds, activity.inProgressPaperIds)
  return map
})

/** Sequential unlock per paper (see app/utils/unlock.ts) — same
 * rule as the papers list page. Only the PaperCard usage below
 * reads this; the Performance card above is untouched. */
const paperLock = computed<Record<string, { locked: boolean, unlockAfterName: string | null }>>(() => {
  const map: Record<string, { locked: boolean, unlockAfterName: string | null }> = {}
  for (const p of papers.value) {
    const lock = resolvePaperLock(p, papers.value, activity.completedPaperIds)
    map[p.id] = { locked: lock.locked, unlockAfterName: lock.unlockAfter ? shortPaperName(lock.unlockAfter.title) : null }
  }
  return map
})
const lockOf = (id: string) => paperLock.value[id] ?? { locked: false, unlockAfterName: null }
</script>

<template>
  <div class="grid lg:grid-cols-3 gap-5">
    <!-- Left column -->
    <div class="lg:col-span-2 space-y-5">
      <!-- Performance: journey + skills in one section -->
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.performance') }}</h2>
          <NuxtLink :to="`${base}/performance`" class="text-sm font-medium text-blue-600 hover:text-blue-700">{{ t('dashboard.seeAnalytics') }}</NuxtLink>
        </div>
        <!-- Loading: performance is still being read — show nothing yet
             rather than flashing the empty state at a user with results. -->
        <p v-if="perf.loading" class="mt-5 text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
        <!-- Empty: no finished paper in this material yet. -->
        <div v-else-if="perf.attempts.length === 0" class="mt-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-5 text-center">
          <p class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.noResultsTitle') }}</p>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('dashboard.noResultsText') }}</p>
          <NuxtLink
            :to="`${base}/papers`"
            class="mt-4 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {{ t('papers.startTest') }}
          </NuxtLink>
        </div>
        <template v-else>
          <p class="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{{ t('dashboard.journey') }}</p>
          <JourneyChart :attempts="perf.attempts" class="mt-2" />
          <!-- Best Full Simulation → overall score + CEFR. Drills only:
               a journey but no score — a Full Simulation is required. -->
          <div v-if="perf.bestSim" class="mt-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
            <div>
              <p class="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">Overall Score</p>
              <p class="text-2xl font-extrabold text-slate-800 dark:text-slate-200">{{ perf.bestSim.score }} <span class="text-sm font-medium text-slate-400 dark:text-slate-500">/ 990</span></p>
              <p class="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{{ t('dashboard.scoreEstimate') }}</p>
            </div>
            <span class="text-xs font-bold px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">CEFR · {{ perf.bestSim.cefr }}</span>
          </div>
          <p v-else class="mt-3 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2">
            {{ t('dashboard.noSimScore') }}
          </p>
        </template>
      </div>

    </div>

    <!-- Right column -->
    <div class="space-y-5">
      <!-- Action cards: stacked -->
      <!-- Continue — renders ONLY for a genuinely in-progress attempt
           in this material (saved answers, not yet submitted). -->
      <div
        v-if="!activity.loading && activity.inProgress"
        class="rounded-2xl border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 dark:bg-blue-950 p-5"
      >
        <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.continueTitle') }}</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ activity.inProgress.title }} · {{ t('dashboard.continueSub') }}</p>
        <NuxtLink
          :to="`${base}/papers/${activity.inProgress.paperId}/take?attempt=${activity.inProgress.attempt}`"
          class="mt-3 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {{ t('dashboard.resume') }}
        </NuxtLink>
      </div>

      <!-- Live test with AI — unlocks after one finished paper
           anywhere (see GET /api/results/activity). Disabled, never
           hidden, until then. -->
      <div
        class="rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 p-5"
        :class="(!activity.loading && !activity.hasCompleted) ? 'opacity-60' : ''"
      >
        <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('liveTest.cardTitle') }}</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('liveTest.cardSub') }}</p>
        <p v-if="!activity.loading && !activity.hasCompleted" class="mt-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2">
          {{ t('dashboard.liveTestLocked') }}
        </p>
        <NuxtLink
          v-if="activity.loading || activity.hasCompleted"
          :to="`${base}/live-test`"
          class="mt-3 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
        >
          {{ t('liveTest.cardCta') }}
        </NuxtLink>
        <button
          v-else
          disabled
          class="mt-3 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl bg-emerald-600 text-white opacity-40 cursor-not-allowed"
        >
          {{ t('liveTest.cardCta') }}
        </button>
      </div>

      <!-- Personal playlist (adaptive) — unlocks after any attempt in
           this material. Disabled, never hidden, until then. -->
      <div
        class="rounded-2xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950 p-5"
        :class="(!activity.loading && !activity.hasStarted) ? 'opacity-60' : ''"
      >
        <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.playlistTitle') }}</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('dashboard.playlistSub') }}</p>
        <p v-if="!activity.loading && !activity.hasStarted" class="mt-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 rounded-xl px-3 py-2">
          {{ t('dashboard.playlistLocked') }}
        </p>
        <NuxtLink
          v-if="activity.loading || activity.hasStarted"
          :to="`${base}/playlist`"
          class="mt-3 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
        >
          {{ t('dashboard.playlistCta') }}
        </NuxtLink>
        <button
          v-else
          disabled
          class="mt-3 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl bg-violet-600 text-white opacity-40 cursor-not-allowed"
        >
          {{ t('dashboard.playlistCta') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Available papers: 3-column grid -->
  <div class="mt-5">
    <!-- Available papers -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.availablePapers') }}</h2>
        <NuxtLink :to="`${base}/papers`" class="text-sm font-medium text-blue-600 hover:text-blue-700">{{ t('dashboard.viewAll') }}</NuxtLink>
      </div>
      <div class="grid sm:grid-cols-3 gap-4">
        <PaperCard v-for="p in availablePapers" :key="p.id" :paper="p" :status="paperStatus[p.id] ?? 'not-started'" :locked="lockOf(p.id).locked" :unlock-after="lockOf(p.id).unlockAfterName ?? ''" :base="base" />
      </div>
    </div>
  </div>
</template>
