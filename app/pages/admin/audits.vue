<script setup lang="ts">
import { getAudits, type AuditReport } from '~/utils/ai-assistant'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

const audits = ref<AuditReport[]>([])
const openId = ref<string | null>(null)

onMounted(() => {
  audits.value = getAudits()
})

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}
</script>

<template>
  <div>
    <h1 class="text-xl md:text-2xl font-extrabold">{{ t('admin.audits.heading') }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.audits.sub') }}</p>

    <p v-if="audits.length === 0" class="mt-5 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
      {{ t('admin.audits.empty') }}
    </p>

    <div v-else class="mt-5 space-y-3">
      <div
        v-for="a in audits"
        :key="a.id"
        class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        <button class="w-full text-left p-4 flex items-center justify-between gap-3" @click="openId = openId === a.id ? null : a.id">
          <div>
            <p class="font-bold text-sm">{{ a.title }}</p>
            <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{{ fmtDate(a.createdAt) }} · {{ a.summary }}</p>
          </div>
          <span class="text-slate-400">{{ openId === a.id ? '▾' : '▸' }}</span>
        </button>
        <div v-if="openId === a.id" class="px-4 pb-4">
          <ul class="text-sm space-y-1 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
            <li v-for="(d, i) in a.details" :key="i">{{ d }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
