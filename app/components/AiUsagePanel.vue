<script setup lang="ts">
import { fetchAiUsage, type AiUsagePeriod, type AiUsageSummary, type AiUsageRow } from '~/utils/server-auth'

/**
 * AI usage panel — the Overview card and the Reports "Konsumsi AI"
 * tab share this component so both always show the same numbers
 * (same endpoint, same summary). `detailed` adds the per-call rows
 * table and the "why is the output 1,500++ tokens?" explainer.
 * Reasoning tokens are a subset of completion tokens (never extra),
 * so totals and cost stay prompt + completion. A null reasoning
 * value means "not recorded" and renders as "—", never 0.
 */

const props = withDefaults(defineProps<{ detailed?: boolean }>(), { detailed: false })

const { t, locale } = useLocale()

const aiPeriods: Array<{ id: AiUsagePeriod, label: string }> = [
  { id: 'today', label: 'periodToday' },
  { id: '7d', label: 'period7d' },
  { id: '30d', label: 'period30d' },
  { id: 'all', label: 'periodAll' }
]
const aiPeriod = ref<AiUsagePeriod>('30d')
const aiUsage = ref<AiUsageSummary | null>(null)
const aiRows = ref<AiUsageRow[]>([])
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

/** Per-call cost estimate (same rates as the summary, rounded to whole Rp). */
function rowCostIdr(row: AiUsageRow): number {
  const s = aiUsage.value
  if (!s) return 0
  const usd = (row.promptTokens / 1_000_000) * s.rates.inputUsdPerMtok
    + (row.completionTokens / 1_000_000) * s.rates.outputUsdPerMtok
  return Math.round(usd * s.usdIdrRate)
}

/** UTC 'YYYY-MM-DD HH:MM:SS' → WIB date + time. */
function fmtWib(iso: string): string {
  const ms = Date.parse(iso.replace(' ', 'T') + 'Z')
  if (Number.isNaN(ms)) return iso
  return new Date(ms).toLocaleString(locale.value === 'id' ? 'id-ID' : 'en-GB', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function endpointLabel(endpoint: string): string {
  if (endpoint === 'audit-chat') return t('admin.reports.aiUsage.endpointAudit')
  if (endpoint === 'live-test') return t('admin.reports.aiUsage.endpointLiveTest')
  return endpoint
}

async function loadAiUsage(): Promise<void> {
  aiLoading.value = true
  aiError.value = null
  const res = await fetchAiUsage(aiPeriod.value, { rows: props.detailed })
  if (res.ok) {
    aiUsage.value = res.summary
    aiRows.value = res.summary.rows ?? []
  } else {
    aiUsage.value = null
    aiRows.value = []
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
  void loadAiUsage()
})
</script>

<template>
  <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="font-bold">{{ t('admin.dashboard.aiUsage.heading') }}</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{{ t('admin.dashboard.aiUsage.sub') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <NuxtLink
          v-if="!detailed"
          to="/admin/reports?tab=ai-usage"
          class="text-xs font-semibold text-blue-600 hover:underline"
        >{{ t('admin.dashboard.aiUsage.details') }} →</NuxtLink>
        <div class="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
          <button
            v-for="p in aiPeriods" :key="p.id"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            :class="aiPeriod === p.id ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
            @click="setAiPeriod(p.id)"
          >{{ t(`admin.dashboard.aiUsage.${p.label}`) }}</button>
        </div>
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

      <!-- Detail-only: explainer + per-call rows -->
      <template v-if="detailed">
        <div class="mt-6 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
          <h3 class="text-sm font-bold">{{ t('admin.reports.aiUsage.explainerTitle') }}</h3>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{{ t('admin.reports.aiUsage.explainerBody') }}</p>
        </div>

        <h3 class="mt-6 text-sm font-bold">{{ t('admin.reports.aiUsage.rowsTitle') }}</h3>
        <div v-if="aiRows.length === 0" class="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {{ t('admin.reports.aiUsage.rowsEmpty') }}
        </div>
        <div v-else class="mt-3 overflow-x-auto">
          <table class="w-full text-sm min-w-[760px]">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th class="px-2 py-3 font-semibold">{{ t('admin.reports.aiUsage.colTime') }}</th>
                <th class="px-2 py-3 font-semibold">{{ t('admin.reports.aiUsage.colEndpoint') }}</th>
                <th class="px-2 py-3 font-semibold">{{ t('admin.reports.aiUsage.colModel') }}</th>
                <th class="px-2 py-3 font-semibold text-right">{{ t('admin.reports.aiUsage.colPrompt') }}</th>
                <th class="px-2 py-3 font-semibold text-right">{{ t('admin.reports.aiUsage.colCompletion') }}</th>
                <th class="px-2 py-3 font-semibold text-right">{{ t('admin.reports.aiUsage.colReasoning') }}</th>
                <th class="px-2 py-3 font-semibold text-right">{{ t('admin.reports.aiUsage.colTotal') }}</th>
                <th class="px-2 py-3 font-semibold text-right">{{ t('admin.reports.aiUsage.colCost') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in aiRows" :key="r.id" class="border-b border-slate-100 dark:border-slate-800 last:border-0">
                <td class="px-2 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400">{{ fmtWib(r.createdAt) }}</td>
                <td class="px-2 py-3 font-semibold">{{ endpointLabel(r.endpoint) }}</td>
                <td class="px-2 py-3 font-mono text-xs break-all">{{ r.model }}</td>
                <td class="px-2 py-3 text-right tabular-nums">{{ fmtInt(r.promptTokens) }}</td>
                <td class="px-2 py-3 text-right tabular-nums">{{ fmtInt(r.completionTokens) }}</td>
                <td class="px-2 py-3 text-right tabular-nums">{{ r.reasoningTokens === null ? '—' : fmtInt(r.reasoningTokens) }}</td>
                <td class="px-2 py-3 text-right tabular-nums font-bold">{{ fmtInt(r.promptTokens + r.completionTokens) }}</td>
                <td class="px-2 py-3 text-right tabular-nums">{{ fmtIdr(rowCostIdr(r)) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>
