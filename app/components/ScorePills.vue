<script setup lang="ts">
defineProps<{
  score: number
  cefr: string
  correct: number
  total: number
}>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-400 text-amber-950 text-sm font-bold">
      Predicted Score · {{ score }}
    </span>
    <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-bold">
      CEFR · {{ cefr }}
    </span>
    <span class="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border-2 border-blue-500 text-blue-700 text-sm font-bold">
      {{ correct }}/{{ total }} marks
    </span>
  </div>
</template>
