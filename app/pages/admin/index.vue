<script setup lang="ts">
import { QUESTIONS, FREE_TEST_QUESTIONS } from '~/data/mock'
import { getReports, liveQuestionsForMaterial, testTakersThisMonth } from '~/utils/admin'
import { fetchRealUsers } from '~/utils/server-auth'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

// Live count (bank + approved AI drafts) so Overview matches Packages.
const questionCount = ref(QUESTIONS.length + FREE_TEST_QUESTIONS.length)
const pendingReports = computed(() => getReports().filter(r => r.status === 'pending'))
const recentReports = computed(() => pendingReports.value.slice(0, 3))
const testersMonth = ref(0)
/* Registered users = real Google sign-in accounts from D1 (null while loading / on error). */
const realUserCount = ref<number | null>(null)

onMounted(() => {
  questionCount.value =
    liveQuestionsForMaterial('toeic-lr').length +
    liveQuestionsForMaterial('toeic-sw').length +
    FREE_TEST_QUESTIONS.length
  testersMonth.value = testTakersThisMonth()
  void (async () => {
    const list = await fetchRealUsers()
    realUserCount.value = list ? list.length : null
  })()
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
      <StatTile :label="t('admin.dashboard.statUsers')" :value="realUserCount === null ? '—' : String(realUserCount)" :sub="t('admin.dashboard.statUsersSub')" />
    </div>

    <!-- AI usage card — shared with the Reports "Konsumsi AI" tab (AiUsagePanel) -->
    <AiUsagePanel class="mt-6" />

    <!-- Monthly visits: no data source yet — visits are not tracked
         anywhere, so no chart is drawn (see README "Admin panel audit"). -->
    <div class="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <h2 class="font-bold">{{ t('admin.dashboard.visitsTitle') }}</h2>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.dashboard.visitsNotConnected') }}</p>
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
