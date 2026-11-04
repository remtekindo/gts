<script setup lang="ts">
import {
  getReports, setReportStatus, findVolumeForQuestion,
  getLocalAttempts, type AdminReport, type AttemptSummary,
} from '~/utils/admin'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

type Tab = 'qc' | 'results'
const tab = ref<Tab>('qc')

function volumeQuery(questionId: string): Record<string, string> {
  const v = findVolumeForQuestion(questionId)
  return v ? { volume: v.id, q: questionId } : {}
}

const statusFilter = ref<'all' | AdminReport['status']>('all')
const reports = ref<AdminReport[]>(getReports())

const filtered = computed(() => {
  if (statusFilter.value === 'all') return reports.value
  return reports.value.filter(r => r.status === statusFilter.value)
})

function setStatus(id: string, status: AdminReport['status']): void {
  setReportStatus(id, status)
  reports.value = getReports()
}

function statusClass(s: AdminReport['status']): string {
  if (s === 'pending') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
  if (s === 'resolved') return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
}

const attempts = ref<AttemptSummary[]>(getLocalAttempts())
const cert = ref<AttemptSummary | null>(null)

function certId(a: AttemptSummary): string {
  const d = new Date(a.finishedAt)
  const ymd = isNaN(d.getTime()) ? '00000000' : d.toISOString().slice(0, 10).replace(/-/g, '')
  return `GTS-${a.paperId.toUpperCase()}-${ymd}-${String(a.score).padStart(3, '0')}`
}

function printCert(): void {
  window.print()
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}
</script>

<template>
  <div>
    <h1 class="text-xl md:text-2xl font-extrabold">{{ t('admin.reports.heading') }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.reports.sub') }}</p>

    <div class="mt-4 flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
      <button
        v-for="tb in (['qc', 'results'] as const)" :key="tb"
        class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        :class="tab === tb ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
        @click="tab = tb"
      >{{ t(`admin.reports.tab_${tb}`) }}</button>
    </div>

    <!-- QC reports -->
    <template v-if="tab === 'qc'">
      <div class="mt-5 flex gap-1.5">
        <button
          v-for="s in (['all', 'pending', 'resolved', 'dismissed'] as const)"
          :key="s"
          class="text-xs font-semibold px-3.5 py-2 rounded-full border transition-colors"
          :class="statusFilter === s ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'"
          @click="statusFilter = s"
        >{{ t(`admin.reports.status_${s}`) }}</button>
      </div>

      <div v-if="filtered.length === 0" class="mt-4 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center">
        {{ t('admin.reports.empty') }}
      </div>

      <ul v-else class="mt-4 space-y-3">
        <li v-for="r in filtered" :key="r.id" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 md:p-5">
          <div class="flex flex-wrap items-center gap-2">
            <NuxtLink :to="{ path: '/admin/databases', query: volumeQuery(r.questionId) }" class="font-mono text-xs text-blue-600 hover:underline">{{ r.questionId }}</NuxtLink>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="statusClass(r.status)">{{ t(`admin.reports.status_${r.status}`) }}</span>
            <span class="ml-auto text-xs text-slate-400 dark:text-slate-500">{{ formatDate(r.createdAt) }}</span>
          </div>
          <p class="mt-2 text-sm">{{ r.reason }}</p>
          <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">{{ t('admin.reports.reporter') }}: {{ r.reporter }}</p>
          <div v-if="r.status === 'pending'" class="mt-3 flex gap-2">
            <NuxtLink :to="{ path: '/admin/databases', query: volumeQuery(r.questionId) }" class="text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600">
              {{ t('admin.reports.viewQuestion') }}
            </NuxtLink>
            <button class="text-xs font-semibold px-3.5 py-2 rounded-xl bg-green-600 text-white" @click="setStatus(r.id, 'resolved')">
              {{ t('admin.reports.resolve') }}
            </button>
            <button class="text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400" @click="setStatus(r.id, 'dismissed')">
              {{ t('admin.reports.dismiss') }}
            </button>
          </div>
        </li>
      </ul>
    </template>

    <!-- Test results -->
    <template v-else>
      <div v-if="attempts.length === 0" class="mt-4 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center">
        {{ t('admin.results.empty') }}
      </div>
      <div v-else class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm min-w-[680px]">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th class="px-4 py-3 font-semibold">{{ t('admin.results.colUser') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.results.colPaper') }}</th>
                <th class="px-4 py-3 font-semibold text-right">{{ t('admin.results.colScore') }}</th>
                <th class="px-4 py-3 font-semibold text-right">{{ t('admin.results.colCorrect') }}</th>
                <th class="px-4 py-3 font-semibold text-right">{{ t('admin.results.colDate') }}</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in attempts" :key="a.paperId + a.finishedAt" class="border-b border-slate-100 dark:border-slate-800 last:border-0">
                <td class="px-4 py-3 font-semibold">{{ a.username ?? '—' }}</td>
                <td class="px-4 py-3 font-mono text-xs">{{ a.paperId }}</td>
                <td class="px-4 py-3 text-right font-bold tabular-nums">{{ a.score }}</td>
                <td class="px-4 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">{{ a.correct }}/{{ a.total }}</td>
                <td class="px-4 py-3 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap">{{ formatDate(a.finishedAt) }}</td>
                <td class="px-4 py-3 text-right whitespace-nowrap">
                  <button class="text-xs font-semibold text-blue-600 px-2 py-1" @click="cert = a">{{ t('admin.results.certificate') }}</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p class="mt-3 text-xs text-slate-400 dark:text-slate-500">{{ t('admin.results.browserNote') }}</p>
    </template>

    <!-- Certificate modal -->
    <div v-if="cert" class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-slate-900/70 print:hidden" @click="cert = null" />
      <div class="relative w-full max-w-2xl">
        <div id="gts-certificate" class="bg-white text-slate-900 rounded-2xl p-10 md:p-14 text-center border-8 border-double border-blue-800 shadow-2xl">
          <p class="text-xs font-bold tracking-[0.3em] text-blue-800">GLOBAL TESTING SYSTEM</p>
          <h2 class="mt-4 text-3xl md:text-4xl font-extrabold">Certificate of Achievement</h2>
          <p class="mt-6 text-sm text-slate-500">This certifies that</p>
          <p class="mt-2 text-2xl md:text-3xl font-bold">{{ cert.username ?? '—' }}</p>
          <p class="mt-4 text-sm text-slate-500">has completed</p>
          <p class="mt-1 text-lg font-bold">{{ cert.paperId }}</p>
          <p class="mt-4 text-sm text-slate-500">with a score of</p>
          <p class="mt-1 text-4xl font-extrabold text-blue-800 tabular-nums">{{ cert.score }}</p>
          <p class="mt-1 text-sm text-slate-500 tabular-nums">{{ cert.correct }}/{{ cert.total }} correct</p>
          <div class="mt-8 flex items-center justify-between text-xs text-slate-500">
            <span>{{ formatDate(cert.finishedAt) }}</span>
            <span class="font-mono">{{ certId(cert) }}</span>
          </div>
        </div>
        <div class="mt-4 flex gap-2 justify-end print:hidden">
          <button class="text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600" @click="cert = null">
            {{ t('admin.results.close') }}
          </button>
          <button class="text-sm font-semibold px-4 py-2.5 rounded-xl bg-blue-600 text-white" @click="printCert">
            {{ t('admin.results.printPdf') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  body * {
    visibility: hidden;
  }
  #gts-certificate,
  #gts-certificate * {
    visibility: visible;
  }
  #gts-certificate {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    border-radius: 0;
  }
}
</style>
