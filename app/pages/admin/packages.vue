<script setup lang="ts">
import { MATERIALS, ownedMaterials } from '~/data/mock'
import {
  PACKAGES, getPackageMaterials, setPackageMaterial, packageMaterials,
  liveQuestionsForMaterial, getEffectiveUsers,
} from '~/utils/admin'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const owned = computed(() => ownedMaterials())
const pkgMats = ref<Record<string, string[]>>(getPackageMaterials())

function refresh(): void {
  pkgMats.value = getPackageMaterials()
}

function isIncluded(pkgId: string, slug: string): boolean {
  if (pkgId === 'semesteran') return true
  return packageMaterials(pkgId, owned.value.map(m => m.slug)).includes(slug)
}

function toggle(pkgId: string, slug: string): void {
  if (pkgId === 'semesteran') return
  setPackageMaterial(pkgId, slug, !isIncluded(pkgId, slug))
  refresh()
}

function questionCount(pkgId: string): number {
  return packageMaterials(pkgId, owned.value.map(m => m.slug))
    .reduce((s, slug) => s + liveQuestionsForMaterial(slug).length, 0)
}

function subscriberCount(pkgId: string): number {
  const planName = pkgId === 'bulanan' ? 'Bulanan' : pkgId === 'triwulanan' ? 'Triwulanan' : 'Semesteran'
  return getEffectiveUsers().filter(u => u.plan === planName && u.status !== 'expired').length
}

function limitLabel(pkgId: string): string {
  const p = PACKAGES.find(x => x.id === pkgId)
  if (!p) return ''
  return p.materialLimit === 'all' ? t('admin.packages.allMaterials') : t('admin.packages.nMaterials', { n: p.materialLimit })
}

onMounted(refresh)
</script>

<template>
  <div>
    <h1 class="text-xl md:text-2xl font-extrabold">{{ t('admin.packages.heading') }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.packages.sub') }}</p>

    <div class="mt-5 grid gap-4 lg:grid-cols-3">
      <div
        v-for="p in PACKAGES"
        :key="p.id"
        class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5"
      >
        <div class="flex items-baseline justify-between">
          <h2 class="font-bold">{{ t(`admin.packages.pkg_${p.id}`) }}</h2>
          <span class="text-lg font-extrabold text-blue-600">{{ p.priceLabel }}</span>
        </div>
        <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ limitLabel(p.id) }}</p>
        <div class="mt-3 flex gap-4 text-sm">
          <div>
            <p class="text-2xl font-extrabold">{{ questionCount(p.id) }}</p>
            <p class="text-xs text-slate-400">{{ t('admin.packages.questions') }}</p>
          </div>
          <div>
            <p class="text-2xl font-extrabold">{{ subscriberCount(p.id) }}</p>
            <p class="text-xs text-slate-400">{{ t('admin.packages.subscribers') }}</p>
          </div>
        </div>
        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <p class="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{{ t('admin.packages.materialsIn') }}</p>
          <ul class="space-y-1.5">
            <li v-for="m in MATERIALS" :key="m.slug" class="flex items-center justify-between text-sm">
              <span :class="m.status === 'owned' ? '' : 'text-slate-400'">{{ m.name }}</span>
              <button
                v-if="m.status === 'owned'"
                class="w-6 h-6 rounded-md border text-xs font-bold transition-colors"
                :class="isIncluded(p.id, m.slug)
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-blue-400'"
                :disabled="p.id === 'semesteran'"
                :title="p.id === 'semesteran' ? t('admin.packages.lockedAll') : ''"
                @click="toggle(p.id, m.slug)"
              >✓</button>
              <span v-else class="text-[10px] text-slate-400">{{ t('admin.packages.soon') }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
    <p class="mt-4 text-xs text-slate-400 dark:text-slate-500">{{ t('admin.packages.note') }}</p>
  </div>
</template>
