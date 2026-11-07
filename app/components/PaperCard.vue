<script setup lang="ts">
const { t } = useLocale()
import type { Paper } from '~/data/mock'
import type { PaperStatus } from '~/data/mock'

/** Status is passed in by the caller, derived from the user's real
 * results (see `resolvePaperStatus` in useActivity.ts) — the catalog
 * in mock.ts carries no status at all. */
const props = withDefaults(defineProps<{ paper: Paper; status: PaperStatus; base?: string }>(), { base: '' })

const statusStyle: Record<PaperStatus, string> = {
  'not-started': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  'in-progress': 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200'
}

const statusLabel = computed<Record<PaperStatus, string>>(() => ({
  'not-started': t('papers.statusNotStarted'),
  'in-progress': t('papers.statusInProgress'),
  completed: t('papers.statusCompleted')
}))

const cta = computed(() => {
  if (props.status === 'completed') return { label: t('papers.viewResult'), to: `${props.base}/papers/${props.paper.id}/result` }
  if (props.status === 'in-progress') return { label: t('papers.continue'), to: `${props.base}/papers/${props.paper.id}` }
  return { label: t('papers.startTest'), to: `${props.base}/papers/${props.paper.id}` }
})
</script>

<template>
  <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
    <div class="h-28 bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center relative">
      <span class="text-4xl font-extrabold text-white/90">{{ paper.title.charAt(0) }}</span>
      <span
        class="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full"
        :class="statusStyle[status]"
      >
        {{ statusLabel[status] }}
      </span>
    </div>
    <div class="p-4 flex flex-col gap-3 flex-1">
      <div>
        <p class="text-[11px] font-semibold uppercase tracking-wide text-blue-600">{{ paper.category === 'Full Simulation' ? t('papers.fullSim') : t('papers.drillPack') }}</p>
        <h3 class="mt-0.5 font-semibold text-slate-800 dark:text-slate-200 leading-snug">{{ paper.title }}</h3>
      </div>
      <dl class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
        <div class="flex items-center gap-1.5">
          <dt class="sr-only">Duration</dt>
          <dd>{{ paper.durationMinutes }} {{ t('papers.minutes') }}</dd>
        </div>
        <div class="flex items-center gap-1.5">
          <dt class="sr-only">Questions</dt>
          <dd>{{ paper.totalQuestions }} {{ t('papers.questions') }}</dd>
        </div>
        <div class="flex items-center gap-1.5">
          <dt class="sr-only">Difficulty</dt>
          <dd>{{ paper.difficulty === 'Beginner' ? t('papers.diffBeginner') : paper.difficulty === 'Intermediate' ? t('papers.diffIntermediate') : t('papers.diffAdvanced') }}</dd>
        </div>
        <div class="flex items-center gap-1.5">
          <dt class="sr-only">Enrolled</dt>
          <dd>{{ paper.enrolled.toLocaleString('en-US') }} {{ t('papers.enrolled') }}</dd>
        </div>
      </dl>
      <NuxtLink
        :to="cta.to"
        class="mt-auto w-full text-center text-sm font-semibold px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
      >
        {{ cta.label }}
      </NuxtLink>
    </div>
  </div>
</template>
