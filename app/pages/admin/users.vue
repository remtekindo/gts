<script setup lang="ts">
import { MOCK_ADMIN_USERS } from '~/utils/admin'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

function statusClass(s: string): string {
  if (s === 'active') return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
  if (s === 'trial') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
}
</script>

<template>
  <div>
    <h1 class="text-xl md:text-2xl font-extrabold">{{ t('admin.users.heading') }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.users.sub') }} {{ t('admin.users.demoNote') }}</p>

    <div class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-[620px]">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colUser') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colPlan') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colStatus') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colJoined') }}</th>
              <th class="px-4 py-3 font-semibold text-right">{{ t('admin.users.colAttempts') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in MOCK_ADMIN_USERS" :key="u.username" class="border-b border-slate-100 dark:border-slate-800 last:border-0">
              <td class="px-4 py-3 font-semibold">{{ u.username }}</td>
              <td class="px-4 py-3">{{ u.plan }}</td>
              <td class="px-4 py-3"><span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="statusClass(u.status)">{{ t(`admin.users.st_${u.status}`) }}</span></td>
              <td class="px-4 py-3 text-slate-500 dark:text-slate-400">{{ u.joined }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ u.attempts }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
