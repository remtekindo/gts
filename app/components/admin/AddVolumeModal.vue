<script setup lang="ts">
import { ownedMaterials } from '~/data/mock'
import {
  nextVolumeName, createDraftVolume, mockGenerateDraftItems,
  type DifficultyLevel,
} from '~/utils/admin'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [], created: [volumeId: string] }>()

const { t } = useLocale()

const avName = ref('')
const avMaterial = ref('toeic-lr')
const avPart = ref(5)
const avCount = ref(10)
const avDiff = ref<DifficultyLevel>(3)
const avTopic = ref('')

watch(() => props.show, (show) => {
  if (show) {
    avName.value = nextVolumeName(avMaterial.value)
    avTopic.value = ''
  }
})

function doAddVolume(): void {
  const { draftId, items } = mockGenerateDraftItems(
    avMaterial.value, avPart.value,
    Math.min(30, Math.max(1, avCount.value)), avDiff.value, avTopic.value.trim(),
  )
  void draftId
  const name = avName.value.trim() || nextVolumeName(avMaterial.value)
  const v = createDraftVolume(name, avMaterial.value, avPart.value, items)
  emit('created', v.id)
  emit('close')
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
    <div class="absolute inset-0 bg-slate-900/70" @click="emit('close')" />
    <div class="relative bg-white dark:bg-slate-900 w-full sm:rounded-2xl sm:max-w-lg max-h-[92vh] overflow-y-auto p-5 md:p-6 rounded-t-2xl shadow-2xl">
      <div class="flex items-start justify-between gap-3">
        <h2 class="font-bold text-lg">{{ t('admin.databases.generateTitle') }}</h2>
        <button class="text-slate-400 hover:text-slate-600 px-2 py-1" @click="emit('close')" aria-label="Close">✕</button>
      </div>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.databases.generateSub') }}</p>
      <div class="mt-4 grid grid-cols-2 gap-3">
        <label class="block col-span-2">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.databases.fName') }}</span>
          <input v-model="avName" type="text" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
        </label>
        <label class="block">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.databases.fMaterial') }}</span>
          <select v-model="avMaterial" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" @change="avName = nextVolumeName(avMaterial)">
            <option v-for="m in ownedMaterials()" :key="m.slug" :value="m.slug">{{ m.name }}</option>
          </select>
        </label>
        <label class="block">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.generate.part') }}</span>
          <select v-model.number="avPart" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
            <option :value="5">Part 5</option><option :value="6">Part 6</option><option :value="7">Part 7</option>
          </select>
        </label>
        <label class="block">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.generate.count') }}</span>
          <input v-model.number="avCount" type="number" min="1" max="30" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
        </label>
        <label class="block">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.generate.difficulty') }}</span>
          <select v-model.number="avDiff" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
            <option v-for="n in [1, 2, 3, 4, 5]" :key="n" :value="n">L{{ n }}</option>
          </select>
        </label>
        <label class="block col-span-2">
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.generate.topic') }}</span>
          <input v-model="avTopic" type="text" :placeholder="t('admin.generate.topicPh')" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
        </label>
      </div>
      <button class="mt-4 w-full text-sm font-semibold px-5 py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700" @click="doAddVolume">{{ t('admin.databases.generateVolume') }}</button>
      <p class="mt-2 text-[11px] text-slate-400 dark:text-slate-500">{{ t('admin.generate.stubNote') }}</p>
    </div>
  </div>
</template>
