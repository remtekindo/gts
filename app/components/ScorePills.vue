<script setup lang="ts">
const { t } = useLocale()

/**
 * Score pills for one finished test. `mode` is the result page's
 * "Tampilkan skor sebagai" toggle (moved here from the paper detail
 * page in the v2 rebuild — the detail page must not ask anything
 * before Start): 'score' shows the numeric score, 'cefr' shows the
 * CEFR level instead. The correct/total pill always shows.
 */
withDefaults(defineProps<{
  score: number
  cefr: string
  correct: number
  total: number
  mode?: 'score' | 'cefr'
}>(), { mode: 'score' })
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span v-if="mode === 'score'" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-400 text-amber-950 text-sm font-bold">
      {{ t('result.scoreTab') }} · {{ score }}
    </span>
    <span v-else class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 text-sm font-bold">
      {{ t('result.cefrTab') }} · {{ cefr }}
    </span>
    <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-blue-500 text-blue-700 text-sm font-bold">
      {{ t('result.correctOf', { c: correct, t: total }) }}
    </span>
  </div>
</template>
