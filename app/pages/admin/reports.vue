<script setup lang="ts">
import { getReports, setReportStatus, type AdminReport } from '~/utils/admin'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

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
          <NuxtLink :to="{ path: '/admin/questions', query: { q: r.questionId } }" class="font-mono text-xs text-blue-600 hover:underline">{{ r.questionId }}</NuxtLink>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="statusClass(r.status)">{{ t(`admin.reports.status_${r.status}`) }}</span>
          <span class="ml-auto text-xs text-slate-400 dark:text-slate-500">{{ formatDate(r.createdAt) }}</span>
        </div>
        <p class="mt-2 text-sm">{{ r.reason }}</p>
        <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">{{ t('admin.reports.reporter') }}: {{ r.reporter }}</p>
        <div v-if="r.status === 'pending'" class="mt-3 flex gap-2">
          <NuxtLink :to="{ path: '/admin/questions', query: { q: r.questionId } }" class="text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600">
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
  </div>
</template>
