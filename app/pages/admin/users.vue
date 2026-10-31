<script setup lang="ts">
import { getEffectiveUsers, setUserOverride, type AdminUser } from '~/utils/admin'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

const users = ref<AdminUser[]>(getEffectiveUsers())
const selected = ref<AdminUser | null>(null)
const editEnds = ref('')

function refresh(): void {
  users.value = getEffectiveUsers()
  if (selected.value) {
    selected.value = users.value.find(u => u.username === selected.value!.username) ?? null
  }
}

function openDetail(u: AdminUser): void {
  selected.value = u
  editEnds.value = u.subscriptionEnds
}

function toggleStatus(): void {
  if (!selected.value) return
  const next = selected.value.status === 'active' ? 'expired' : 'active'
  setUserOverride(selected.value.username, { status: next })
  refresh()
}

function saveEnds(): void {
  if (!selected.value || !editEnds.value) return
  setUserOverride(selected.value.username, { subscriptionEnds: editEnds.value })
  refresh()
}

function waLink(u: AdminUser): string {
  const text = encodeURIComponent(`Hi ${u.username}, this is GTS Admin regarding your ${u.plan} subscription.`)
  return `https://wa.me/${u.phone}?text=${text}`
}

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
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colEnds') }}</th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.username" class="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td class="px-4 py-3 font-semibold">{{ u.username }}</td>
              <td class="px-4 py-3">{{ u.plan }}</td>
              <td class="px-4 py-3"><span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="statusClass(u.status)">{{ t(`admin.users.st_${u.status}`) }}</span></td>
              <td class="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{{ u.subscriptionEnds }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button class="text-xs font-semibold text-blue-600 px-2 py-1" @click="openDetail(u)">{{ t('admin.users.detail') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail modal -->
    <div v-if="selected" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-slate-900/60" @click="selected = null" />
      <div class="relative bg-white dark:bg-slate-900 w-full sm:rounded-2xl sm:max-w-md max-h-[92vh] overflow-y-auto p-5 md:p-6 rounded-t-2xl">
        <div class="flex items-start justify-between gap-3">
          <h2 class="font-bold text-lg">{{ selected.username }}</h2>
          <button class="text-slate-400 hover:text-slate-600 px-2 py-1" @click="selected = null" aria-label="Close">✕</button>
        </div>
        <dl class="mt-4 space-y-2.5 text-sm">
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">{{ t('admin.users.colPlan') }}</dt><dd class="font-semibold">{{ selected.plan }}</dd></div>
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">{{ t('admin.users.colStatus') }}</dt><dd><span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="statusClass(selected.status)">{{ t(`admin.users.st_${selected.status}`) }}</span></dd></div>
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">{{ t('admin.users.colJoined') }}</dt><dd>{{ selected.joined }}</dd></div>
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">{{ t('admin.users.colAttempts') }}</dt><dd class="tabular-nums">{{ selected.attempts }}</dd></div>
          <div class="flex justify-between items-center"><dt class="text-slate-500 dark:text-slate-400">{{ t('admin.users.colEnds') }}</dt>
            <dd class="flex items-center gap-1.5">
              <input v-model="editEnds" type="date" class="text-xs px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
              <button class="text-xs font-semibold text-blue-600 px-2 py-1" @click="saveEnds">{{ t('admin.users.save') }}</button>
            </dd>
          </div>
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">{{ t('admin.users.colPhone') }}</dt><dd class="font-mono text-xs">+{{ selected.phone }}</dd></div>
        </dl>
        <div class="mt-5 flex flex-col sm:flex-row gap-2">
          <button
            class="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-colors"
            :class="selected.status === 'active' ? 'border-red-300 dark:border-red-800 text-red-600 dark:text-red-300' : 'border-green-300 dark:border-green-800 text-green-700 dark:text-green-300'"
            @click="toggleStatus"
          >
            {{ selected.status === 'active' ? t('admin.users.deactivate') : t('admin.users.activate') }}
          </button>
          <a
            :href="waLink(selected)"
            target="_blank"
            rel="noopener"
            class="flex-1 text-center text-sm font-semibold px-4 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            {{ t('admin.users.whatsapp') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
