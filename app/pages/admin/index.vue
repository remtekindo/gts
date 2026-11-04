<script setup lang="ts">
import { QUESTIONS, FREE_TEST_QUESTIONS } from '~/data/mock'
import { getReports, MOCK_ADMIN_USERS, liveQuestionsForMaterial, getMonthly, testTakersThisMonth } from '~/utils/admin'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

// Live count (bank + approved AI drafts) so Overview matches Packages.
const questionCount = ref(QUESTIONS.length + FREE_TEST_QUESTIONS.length)
const pendingReports = computed(() => getReports().filter(r => r.status === 'pending'))
const recentReports = computed(() => pendingReports.value.slice(0, 3))
const monthly = ref(getMonthly())
const testersMonth = ref(0)

const maxVisits = computed(() => Math.max(...monthly.value.map(m => m.visits), 1))

function monthLabel(m: string): string {
  const [y, mo] = m.split('-')
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${names[Number(mo) - 1]} ${String(y).slice(2)}`
}

onMounted(() => {
  questionCount.value =
    liveQuestionsForMaterial('toeic-lr').length +
    liveQuestionsForMaterial('toeic-sw').length +
    FREE_TEST_QUESTIONS.length
  testersMonth.value = testTakersThisMonth()
})
</script>

<template>
  <div>
    <h1 class="text-xl md:text-2xl font-extrabold">{{ t('admin.dashboard.heading') }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.dashboard.sub') }}</p>

    <div class="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <StatTile :label="t('admin.dashboard.statQuestions')" :value="String(questionCount)" />
      <StatTile :label="t('admin.dashboard.statTesters')" :value="String(testersMonth)" :sub="t('admin.dashboard.statTestersSub')" />
      <StatTile :label="t('admin.dashboard.statReports')" :value="String(pendingReports.length)" :sub="t('admin.dashboard.statReportsSub')" />
      <StatTile :label="t('admin.dashboard.statUsers')" :value="String(MOCK_ADMIN_USERS.length)" :sub="t('admin.dashboard.statUsersSub')" />
    </div>

    <!-- Monthly visits chart -->
    <div class="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <h2 class="font-bold">{{ t('admin.dashboard.visitsTitle') }}</h2>
      <div class="mt-4 flex items-end gap-2 md:gap-3 h-40">
        <div v-for="m in monthly" :key="m.month" class="flex-1 flex flex-col items-center justify-end h-full">
          <span class="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">{{ m.visits >= 1000 ? (m.visits / 1000).toFixed(1) + 'k' : m.visits }}</span>
          <div
            class="mt-1 w-full max-w-10 rounded-t-lg bg-blue-500/80 hover:bg-blue-500 transition-all"
            :style="{ height: Math.max(4, (m.visits / maxVisits) * 100) + '%' }"
            :title="`${monthLabel(m.month)}: ${m.visits}`"
          />
          <span class="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{{ monthLabel(m.month) }}</span>
        </div>
      </div>
    </div>

    <div class="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div class="flex items-center justify-between">
        <h2 class="font-bold">{{ t('admin.dashboard.recentReports') }}</h2>
        <NuxtLink to="/admin/reports" class="text-sm font-semibold text-blue-600">{{ t('admin.dashboard.viewAll') }}</NuxtLink>
      </div>
      <div v-if="recentReports.length === 0" class="mt-3 text-sm text-slate-500 dark:text-slate-400">
        {{ t('admin.dashboard.noReports') }}
      </div>
      <ul v-else class="mt-3 space-y-2.5">
        <li v-for="r in recentReports" :key="r.id" class="text-sm flex items-start gap-2">
          <span class="mt-0.5 w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span class="text-slate-600 dark:text-slate-300"><strong class="font-mono text-xs">{{ r.questionId }}</strong> — {{ r.reason }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
