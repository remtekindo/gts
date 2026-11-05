<script setup lang="ts">
import { QUESTIONS, FREE_TEST_QUESTIONS } from '~/data/mock'
import { getReports, liveQuestionsForMaterial, testTakersThisMonth } from '~/utils/admin'
import { fetchAiUsage, fetchRealUsers, type AiUsagePeriod, type AiUsageSummary } from '~/utils/server-auth'

definePageMeta({ layout: 'admin' })

const { t, locale } = useLocale()

// Live count (bank + approved AI drafts) so Overview matches Packages.
const questionCount = ref(QUESTIONS.length + FREE_TEST_QUESTIONS.length)
const pendingReports = computed(() => getReports().filter(r => r.status === 'pending'))
const recentReports = computed(() => pendingReports.value.slice(0, 3))
const testersMonth = ref(0)
/* Registered users = real Google sign-in accounts from D1 (null while loading / on error). */
const realUserCount = ref<number | null>(null)

/* AI usage card — real numbers from the ai_usage D1 table (one row
 * per Meta API call). Period defaults to 30 days. */
const aiPeriods: Array<{ id: AiUsagePeriod, label: string }> = [
  { id: 'today', label: 'periodToday' },
  { id: '7d', label: 'period7d' },
  { id: '30d', label: 'period30d' },
  { id: 'all', label: 'periodAll' }
]
const aiPeriod = ref<AiUsagePeriod>('30d')
const aiUsage = ref<AiUsageSummary | null>(null)
const aiLoading = ref(true)
const aiError = ref<string | null>(null)

const aiMaxHourly = computed(() => Math.max(...(aiUsage.value?.hourly ?? [0]), 1))
const aiRateNote = computed(() => {
  const s = aiUsage.value
  if (!s) return ''
  const usd = (n: number) => locale.value === 'id' ? '$' + n.toFixed(2).replace('.', ',') : '$' + n.toFixed(2)
  return t('admin.dashboard.aiUsage.rateNote', {
    input: usd(s.rates.inputUsdPerMtok),
    output: usd(s.rates.outputUsdPerMtok),
    rate: s.usdIdrRate.toLocaleString('id-ID')
  })
})

function fmtInt(n: number): string {
  return n.toLocaleString('id-ID')
}

function fmtIdr(n: number): string {
  return 'Rp' + n.toLocaleString('id-ID')
}

async function loadAiUsage(): Promise<void> {
  aiLoading.value = true
  aiError.value = null
  const res = await fetchAiUsage(aiPeriod.value)
  if (res.ok) {
    aiUsage.value = res.summary
  } else {
    aiUsage.value = null
    aiError.value = res.code
  }
  aiLoading.value = false
}

function setAiPeriod(p: AiUsagePeriod): void {
  if (aiPeriod.value === p) return
  aiPeriod.value = p
  void loadAiUsage()
}

onMounted(() => {
  questionCount.value =
    liveQuestionsForMaterial('toeic-lr').length +
    liveQuestionsForMaterial('toeic-sw').length +
    FREE_TEST_QUESTIONS.length
  testersMonth.value = testTakersThisMonth()
  void loadAiUsage()
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

    <!-- AI usage card -->
    <div class="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-bold">{{ t('admin.dashboard.aiUsage.heading') }}</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ t('admin.dashboard.aiUsage.sub') }}</p>
        </div>
        <div class="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
          <button
            v-for="p in aiPeriods" :key="p.id"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            :class="aiPeriod === p.id ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
            @click="setAiPeriod(p.id)"
          >{{ t(`admin.dashboard.aiUsage.${p.label}`) }}</button>
        </div>
      </div>

      <div v-if="aiLoading" class="mt-4 text-sm text-slate-500 dark:text-slate-400">…</div>
      <div v-else-if="aiError" class="mt-4 text-sm text-slate-500 dark:text-slate-400">
        {{ t('admin.dashboard.aiUsage.unavailable') }}
      </div>
      <div v-else-if="aiUsage">
        <div class="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{{ t('admin.dashboard.aiUsage.calls') }}</p>
            <p class="mt-1 text-xl font-extrabold tabular-nums">{{ fmtInt(aiUsage.totalCalls) }}</p>
          </div>
          <div class="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{{ t('admin.dashboard.aiUsage.tokens') }}</p>
            <p class="mt-1 text-xl font-extrabold tabular-nums">{{ fmtInt(aiUsage.totalTokens) }}</p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">{{ t('admin.dashboard.aiUsage.promptTokens') }} {{ fmtInt(aiUsage.totalPromptTokens) }} · {{ t('admin.dashboard.aiUsage.completionTokens') }} {{ fmtInt(aiUsage.totalCompletionTokens) }}</p>
          </div>
          <div class="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{{ t('admin.dashboard.aiUsage.cost') }}</p>
            <p class="mt-1 text-xl font-extrabold tabular-nums">{{ fmtIdr(aiUsage.totalCostIdr) }}</p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">${{ aiUsage.totalCostUsd.toFixed(4) }}</p>
          </div>
          <div class="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3">
            <p class="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{{ t('admin.dashboard.aiUsage.peakHour') }}</p>
            <p class="mt-1 text-xl font-extrabold tabular-nums">
              {{ aiUsage.peakHour === null ? '—' : t('admin.dashboard.aiUsage.peakHourValue', { h: aiUsage.peakHour, h2: (aiUsage.peakHour + 1) % 24 }) }}
            </p>
            <p class="text-[11px] text-slate-400 dark:text-slate-500">{{ aiUsage.peakHour === null ? '' : fmtInt(aiUsage.hourly[aiUsage.peakHour] ?? 0) + ' ' + t('admin.dashboard.aiUsage.calls').toLowerCase() }}</p>
          </div>
        </div>

        <div v-if="aiUsage.totalCalls === 0" class="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {{ t('admin.dashboard.aiUsage.empty') }}
        </div>
        <div v-else>
          <div class="mt-5 overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <th class="py-2 pr-3 font-bold">{{ t('admin.dashboard.aiUsage.model') }}</th>
                  <th class="py-2 pr-3 font-bold text-right">{{ t('admin.dashboard.aiUsage.calls') }}</th>
                  <th class="py-2 pr-3 font-bold text-right">{{ t('admin.dashboard.aiUsage.tokens') }}</th>
                  <th class="py-2 font-bold text-right">{{ t('admin.dashboard.aiUsage.cost') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in aiUsage.byModel" :key="m.model" class="border-b border-slate-50 dark:border-slate-800/60">
                  <td class="py-2 pr-3 font-mono text-xs break-all">{{ m.model }}</td>
                  <td class="py-2 pr-3 text-right tabular-nums">{{ fmtInt(m.calls) }}</td>
                  <td class="py-2 pr-3 text-right tabular-nums">{{ fmtInt(m.promptTokens + m.completionTokens) }}</td>
                  <td class="py-2 text-right tabular-nums">{{ fmtIdr(m.costIdr) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="mt-5 text-sm font-bold">{{ t('admin.dashboard.aiUsage.hourlyTitle') }}</h3>
          <div class="mt-3 flex items-end gap-1 h-24">
            <div v-for="(c, h) in aiUsage.hourly" :key="h" class="flex-1 flex flex-col items-center justify-end h-full">
              <div
                class="w-full max-w-6 rounded-t bg-violet-500/80"
                :style="{ height: Math.max(c > 0 ? 4 : 1, (c / aiMaxHourly) * 100) + '%' }"
                :title="`${h}:00 WIB — ${c}`"
              />
              <span v-if="h % 3 === 0" class="mt-1 text-[9px] text-slate-400 dark:text-slate-500">{{ h }}</span>
              <span v-else class="mt-1 text-[9px] text-transparent">·</span>
            </div>
          </div>
        </div>
        <p class="mt-4 text-[11px] text-slate-400 dark:text-slate-500">{{ aiRateNote }}</p>
      </div>
    </div>

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
