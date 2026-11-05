<script setup lang="ts">
import type { Locale } from '~/i18n'

const { locale, setLocale } = useLocale()

const options: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'id', label: 'ID' }
]
</script>

<template>
  <div class="flex items-center rounded-full border border-slate-300 dark:border-slate-600 dark:border-slate-600 overflow-hidden text-xs font-semibold" role="group" aria-label="Language">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      class="px-2.5 py-1.5 transition-colors"
      :class="locale === o.value ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 dark:hover:text-white'"
      :aria-pressed="locale === o.value"
      @click="setLocale(o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>
