<script setup lang="ts">
import { getLocalAttempts } from '~/utils/admin'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const attempts = ref(getLocalAttempts())

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}
</script>

<template>
  <div>
    <h1 class="text-xl md:text-2xl font-extrabold">{{ t('admin.results.heading') }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.results.sub') }}</p>

    <div v-if="attempts.length === 0" class="mt-4 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center">
      {{ t('admin.results.empty') }}
    </div>

    <div v-else class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-[560px]">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th class="px-4 py-3 font-semibold">{{ t('admin.results.colPaper') }}</th>
              <th class="px-4 py-3 font-semibold text-right">{{ t('admin.results.colScore') }}</th>
              <th class="px-4 py-3 font-semibold text-right">{{ t('admin.results.colCorrect') }}</th>
              <th class="px-4 py-3 font-semibold text-right">{{ t('admin.results.colDate') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in attempts" :key="a.paperId + a.finishedAt" class="border-b border-slate-100 dark:border-slate-800 last:border-0">
              <td class="px-4 py-3 font-mono text-xs">{{ a.paperId }}</td>
              <td class="px-4 py-3 text-right font-bold tabular-nums">{{ a.score }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-500 dark:text-slate-400">{{ a.correct }}/{{ a.total }}</td>
              <td class="px-4 py-3 text-right text-slate-500 dark:text-slate-400 whitespace-nowrap">{{ formatDate(a.finishedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="mt-3 text-xs text-slate-400 dark:text-slate-500">{{ t('admin.results.browserNote') }}</p>
  </div>
</template>
