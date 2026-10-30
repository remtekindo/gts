<script setup lang="ts">
defineProps<{
  label: string
  value: string
  sub?: string
}>()
</script>

<template>
  <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
    <p class="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">{{ label }}</p>
    <p class="mt-1 text-2xl font-extrabold text-slate-800 dark:text-slate-200">{{ value }}</p>
    <p v-if="sub" class="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{{ sub }}</p>
  </div>
</template>
