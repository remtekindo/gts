<script setup lang="ts">
import { getStoredModelKey, setStoredModelKey, clearStoredModelKey, maskModelKey } from '~/utils/model-key'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

const keyInput = ref('')
const showKey = ref(false)
const savedKey = ref('')
const notice = ref('')

function refresh(): void {
  savedKey.value = getStoredModelKey()
  keyInput.value = ''
}

function save(): void {
  if (!keyInput.value.trim()) return
  setStoredModelKey(keyInput.value)
  notice.value = t('admin.settings.saved')
  refresh()
}

function clear(): void {
  clearStoredModelKey()
  notice.value = t('admin.settings.cleared')
  refresh()
}

onMounted(() => {
  refresh()
})
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="text-xl md:text-2xl font-extrabold">{{ t('admin.settings.heading') }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.settings.sub') }}</p>

    <div class="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 md:p-6">
      <h2 class="font-bold">{{ t('admin.settings.keyTitle') }}</h2>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.settings.keySub') }}</p>

      <div class="mt-4 flex items-center gap-2 text-sm">
        <span
          class="w-2.5 h-2.5 rounded-full"
          :class="savedKey ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'"
        />
        <span v-if="savedKey" class="font-semibold">
          {{ t('admin.settings.configured') }} · <code class="text-xs bg-slate-100 dark:bg-slate-800 rounded px-1.5 py-0.5">{{ maskModelKey(savedKey) }}</code>
        </span>
        <span v-else class="text-slate-500 dark:text-slate-400">{{ t('admin.settings.notConfigured') }}</span>
      </div>

      <label class="mt-5 block">
        <span class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{{ t('admin.settings.keyLabel') }}</span>
        <div class="flex gap-2">
          <input
            v-model="keyInput"
            :type="showKey ? 'text' : 'password'"
            :placeholder="t('admin.settings.keyPh')"
            autocomplete="off"
            class="flex-1 min-w-0 rounded-xl border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            class="shrink-0 text-xs font-semibold px-3 rounded-xl border border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            @click="showKey = !showKey"
          >{{ showKey ? t('admin.settings.hide') : t('admin.settings.show') }}</button>
        </div>
      </label>

      <div class="mt-4 flex flex-wrap gap-2">
        <button
          :disabled="!keyInput.trim()"
          class="text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40"
          @click="save"
        >{{ t('admin.settings.save') }}</button>
        <button
          v-if="savedKey"
          class="text-sm font-semibold px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-red-600 dark:text-red-300 hover:border-red-400 transition-colors"
          @click="clear"
        >{{ t('admin.settings.clear') }}</button>
      </div>

      <p v-if="notice" class="mt-4 text-sm font-semibold text-green-700 dark:text-green-300">{{ notice }}</p>

      <p class="mt-5 text-xs leading-relaxed text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-xl px-3.5 py-3">
        {{ t('admin.settings.demoNote') }}
      </p>
    </div>
  </div>
</template>
