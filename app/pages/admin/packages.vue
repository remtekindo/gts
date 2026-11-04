<script setup lang="ts">
import { ownedMaterials } from '~/data/mock'
import {
  PACKAGES, MOCK_ADMIN_USERS, getAddedUsers, getPackageMaterials, setPackageMaterial,
  packageMaterials, liveQuestionsForMaterial,
  getVouchers, saveVoucher, deleteVoucher, type Voucher,
} from '~/utils/admin'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

type Tab = 'subs' | 'vouchers'
const tab = ref<Tab>('subs')
const owned = computed(() => ownedMaterials())

const pkgMats = ref<Record<string, string[]>>(getPackageMaterials())
const vouchers = ref<Voucher[]>([])

const showVoucher = ref(false)
const vName = ref('')
const vDiscount = ref(20)
const vMax = ref(100)
const vDue = ref('2026-12-31')

function refresh(): void {
  pkgMats.value = getPackageMaterials()
  vouchers.value = getVouchers()
}

function allUsers() {
  return [...MOCK_ADMIN_USERS, ...getAddedUsers()]
}

function planKey(id: string): string {
  return id === 'bulanan' ? 'Bulanan' : id === 'triwulanan' ? 'Triwulanan' : 'Semesteran'
}

function subscriberCount(pkgId: string): number {
  return allUsers().filter(u => u.plan === planKey(pkgId) && u.status === 'active').length
}

function effective(pkgId: string): string[] {
  return packageMaterials(pkgId, owned.value.map(m => m.slug))
}

function questionTotal(pkgId: string): number {
  return effective(pkgId).reduce((sum, s) => sum + liveQuestionsForMaterial(s).length, 0)
}

function toggle(pkgId: string, slug: string): void {
  if (pkgId === 'semesteran') return
  setPackageMaterial(pkgId, slug, !effective(pkgId).includes(slug))
  refresh()
}

function materialName(slug: string): string {
  return owned.value.find(m => m.slug === slug)?.name ?? slug
}

function addVoucher(): void {
  if (!vName.value.trim()) return
  saveVoucher({
    id: `v-${Date.now().toString(36)}`,
    name: vName.value.trim().toUpperCase(),
    discount: Math.min(100, Math.max(1, vDiscount.value)),
    maxUsers: Math.max(1, vMax.value),
    usedUsers: 0,
    dueDate: vDue.value,
  })
  vName.value = ''
  showVoucher.value = false
  refresh()
}

onMounted(refresh)
</script>

<template>
  <div>
    <h1 class="text-xl md:text-2xl font-extrabold">{{ t('admin.packages.heading') }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.packages.sub') }}</p>

    <!-- Subscriber cards per package -->
    <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div
        v-for="p in PACKAGES" :key="p.id"
        class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4"
      >
        <p class="text-xs text-slate-400 uppercase tracking-wide font-semibold">{{ t(`admin.packages.pkg_${p.id}`) }}</p>
        <p class="mt-1 text-2xl font-extrabold tabular-nums">{{ subscriberCount(p.id) }}</p>
        <p class="text-xs text-slate-500 dark:text-slate-400">{{ t('admin.packages.subscribers') }}</p>
        <p class="mt-2 text-sm font-bold">{{ p.priceLabel }}</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="mt-4 flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-fit">
      <button
        v-for="tb in (['subs', 'vouchers'] as const)" :key="tb"
        class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        :class="tab === tb ? 'bg-white dark:bg-slate-900 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
        @click="tab = tb"
      >{{ t(`admin.packages.tab_${tb}`) }}</button>
    </div>

    <!-- Subscriptions table -->
    <div v-if="tab === 'subs'" class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-[720px]">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th class="px-4 py-3 font-semibold">{{ t('admin.packages.colType') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.packages.colQuestions') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.packages.colChoose') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.packages.colMaterials') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.packages.colSubs') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in PACKAGES" :key="p.id" class="border-b border-slate-100 dark:border-slate-800 last:border-0">
              <td class="px-4 py-3">
                <p class="font-bold">{{ t(`admin.packages.pkg_${p.id}`) }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ p.priceLabel }}</p>
              </td>
              <td class="px-4 py-3 tabular-nums font-bold">{{ questionTotal(p.id) }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="m in owned" :key="m.slug"
                    :disabled="p.id === 'semesteran'"
                    class="text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors disabled:opacity-70"
                    :class="effective(p.id).includes(m.slug)
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'"
                    @click="toggle(p.id, m.slug)"
                  >{{ m.name }}</button>
                </div>
              </td>
              <td class="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                {{ effective(p.id).map(materialName).join(', ') || '—' }}
              </td>
              <td class="px-4 py-3 tabular-nums font-bold">{{ subscriberCount(p.id) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="px-4 py-3 text-[11px] text-slate-400 dark:text-slate-500">{{ t('admin.packages.toggleHint') }}</p>
    </div>

    <!-- Vouchers table -->
    <div v-else class="mt-4">
      <div class="flex justify-end mb-3">
        <button class="text-sm font-semibold px-4 py-2 rounded-xl bg-blue-600 text-white" @click="showVoucher = true">+ {{ t('admin.packages.addVoucher') }}</button>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm min-w-[560px]">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <th class="px-4 py-3 font-semibold">{{ t('admin.packages.colVName') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.packages.colVDisc') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.packages.colVMax') }}</th>
                <th class="px-4 py-3 font-semibold">{{ t('admin.packages.colVDue') }}</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in vouchers" :key="v.id" class="border-b border-slate-100 dark:border-slate-800 last:border-0">
                <td class="px-4 py-3 font-mono font-bold">{{ v.name }}</td>
                <td class="px-4 py-3 tabular-nums">{{ v.discount }}%</td>
                <td class="px-4 py-3 tabular-nums">{{ v.usedUsers }}/{{ v.maxUsers }}</td>
                <td class="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{{ v.dueDate }}</td>
                <td class="px-4 py-3 text-right"><button class="text-xs font-semibold text-red-500 px-2 py-1" @click="deleteVoucher(v.id); refresh()">{{ t('admin.packages.delVoucher') }}</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Add voucher modal -->
    <div v-if="showVoucher" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-slate-900/70" @click="showVoucher = false" />
      <div class="relative bg-white dark:bg-slate-800 w-full sm:rounded-2xl sm:max-w-md p-5 md:p-6 rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-600">
        <h2 class="font-bold text-lg">{{ t('admin.packages.addVoucher') }}</h2>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.packages.colVName') }}</span>
            <input v-model="vName" type="text" placeholder="HEMAT25" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 uppercase" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.packages.colVDisc') }}</span>
              <input v-model.number="vDiscount" type="number" min="1" max="100" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.packages.colVMax') }}</span>
              <input v-model.number="vMax" type="number" min="1" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
            </label>
          </div>
          <label class="block">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.packages.colVDue') }}</span>
            <input v-model="vDue" type="date" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </label>
        </div>
        <button class="mt-4 w-full text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white" @click="addVoucher">{{ t('admin.packages.saveVoucher') }}</button>
      </div>
    </div>
  </div>
</template>
