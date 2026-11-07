<script setup lang="ts">
import { getPaperOrFallback, papersForMaterial, realQuestionCount } from '~/data/mock'
import type { Paper } from '~/data/mock'
import { resolvePaperLock } from '~/utils/unlock'
import { fetchSessionState } from '~/utils/server-auth'

const { t } = useLocale()

definePageMeta({ layout: 'material' })

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const base = computed(() => `/m/${slug.value}`)

const papers = computed(() => papersForMaterial(slug.value))

/** New-user gates (see README § "New-user empty states"): the
 * Continue card shows only for a genuinely in-progress attempt in
 * this material; Latihan Saya unlocks after any attempt here; Live
 * Test unlocks after one finished paper anywhere. */
const activity = useMaterialActivity(slug.value)

/** Last score + CEFR, from the best Full Simulation in this material
 * (see README § "Performance from real data"). Nothing here until
 * the user has finished a simulation. */
const perf = useMaterialPerformance(slug.value)

/** Real name from the server session — the localStorage mirror may
 * be missing while the cookie is valid. */
const displayName = ref('')
onMounted(async () => {
  const state = await fetchSessionState()
  displayName.value = state.name ?? state.email ?? getAuth()?.name ?? getAuth()?.username ?? t('common.guest')
})

/**
 * The ONE primary action: the next test in sequence. An in-progress
 * attempt wins — resuming it is the next thing to do. Otherwise the
 * first unlocked paper the user has not finished yet, in catalog
 * order; when everything is finished, the first paper again (a
 * retake). The card shows the paper name and the REAL question count
 * the user will answer — never the old 200-question catalog claim.
 */
interface NextAction {
  paper: Paper
  to: string
  label: string
  eyebrow: string
}

const nextAction = computed<NextAction | null>(() => {
  if (activity.inProgress) {
    const p = getPaperOrFallback(activity.inProgress.paperId)
    return {
      paper: p,
      to: `${base.value}/papers/${p.id}/take?attempt=${activity.inProgress.attempt}`,
      label: t('dashboard.resume'),
      eyebrow: t('dashboard.continueTitle')
    }
  }
  for (const p of papers.value) {
    const lock = resolvePaperLock(p, papers.value, activity.completedPaperIds)
    if (!lock.locked && !activity.completedPaperIds.includes(p.id)) {
      return { paper: p, to: `${base.value}/papers/${p.id}`, label: t('papers.startTest'), eyebrow: t('dashboard.nextTest') }
    }
  }
  const first = papers.value[0]
  if (!first) return null
  return { paper: first, to: `${base.value}/papers/${first.id}`, label: t('papers.startTest'), eyebrow: t('dashboard.nextTest') }
})
</script>

<template>
  <div>
    <!-- Greeting: real name, last score + CEFR if any. No points,
         streak, rank, or quest widgets here — those live under
         Skor Saya. -->
    <div class="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white">
      <p class="text-blue-200 text-sm">{{ t('dashboard.welcomeBack') }}</p>
      <h1 class="text-2xl font-extrabold mt-0.5">{{ displayName || t('access.loading') }}</h1>
      <p v-if="perf.bestSim" class="text-blue-200 text-sm mt-1">
        {{ t('dashboard.lastScore') }}: {{ perf.bestSim.score }} / 990 · Level CEFR {{ perf.bestSim.cefr }}
      </p>
      <p v-else-if="!perf.loading" class="text-blue-200 text-sm mt-1">{{ t('dashboard.noScoreYet') }}</p>
    </div>

    <!-- ONE primary action: the next test. -->
    <div class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <template v-if="nextAction">
        <p class="text-xs font-bold uppercase tracking-widest text-blue-600">{{ nextAction.eyebrow }}</p>
        <h2 class="mt-1 text-xl font-extrabold text-slate-800 dark:text-slate-200">{{ nextAction.paper.title }}</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ realQuestionCount(nextAction.paper) }} {{ t('papers.questions') }} · {{ nextAction.paper.durationMinutes }} {{ t('papers.minutes') }}
        </p>
        <NuxtLink
          :to="nextAction.to"
          class="mt-4 inline-block text-sm font-semibold px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          {{ nextAction.label }}
        </NuxtLink>
      </template>
      <p v-else class="text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
    </div>

    <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2">
      <NuxtLink :to="`${base}/papers`" class="text-sm font-semibold text-blue-600 hover:text-blue-700">
        {{ t('dashboard.seeAllTests') }} →
      </NuxtLink>
      <NuxtLink to="/materials" class="text-sm font-semibold text-blue-600 hover:text-blue-700">
        {{ t('nav.changeMaterial') }} →
      </NuxtLink>
    </div>

    <!-- Live Test with AI — unlocks after one finished paper
         anywhere (see GET /api/results/activity). The card renders
         ONLY when unlocked; before that, one small hint line, never
         a big dead card with a disabled button. -->
    <div
      v-if="!activity.loading && activity.hasCompleted"
      class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 p-5"
    >
      <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('liveTest.cardTitle') }}</h2>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('liveTest.cardSub') }}</p>
      <NuxtLink
        :to="`${base}/live-test`"
        class="mt-3 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
      >
        {{ t('liveTest.cardCta') }}
      </NuxtLink>
    </div>
    <p v-else-if="!activity.loading" class="mt-5 text-sm text-slate-500 dark:text-slate-400">
      {{ t('dashboard.liveTestLocked') }}
    </p>

    <!-- Latihan Saya (adaptive playlist) — unlocks after any attempt
         in this material. Hidden entirely until then. -->
    <div
      v-if="!activity.loading && activity.hasStarted"
      class="mt-5 rounded-2xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950 p-5"
    >
      <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('dashboard.playlistTitle') }}</h2>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('dashboard.playlistSub') }}</p>
      <NuxtLink
        :to="`${base}/playlist`"
        class="mt-3 inline-block text-sm font-semibold px-4 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
      >
        {{ t('dashboard.playlistCta') }}
      </NuxtLink>
    </div>
  </div>
</template>
