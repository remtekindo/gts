<script setup lang="ts">
/**
 * Old URL, kept alive: the Performance page moved into Skor Saya in
 * the v2 rebuild (7 Nov 2026). Redirects to /m/<slug>/skor.
 */
definePageMeta({
  layout: 'material',
  redirect: (to) => `/m/${to.params.slug as string}/skor`
})
</script>

<template>
  <p class="text-sm text-slate-400 dark:text-slate-500" />
</template>
