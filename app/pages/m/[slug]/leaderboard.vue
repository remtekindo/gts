<script setup lang="ts">
/**
 * Old URL, kept alive: the material Leaderboard tab moved into Skor
 * Saya in the v2 rebuild (7 Nov 2026) — same board, now the
 * "Peringkat" section of that page. Redirects there, scrolled to
 * the section.
 */
definePageMeta({
  layout: 'material',
  redirect: (to) => `/m/${to.params.slug as string}/skor?section=peringkat`
})
</script>

<template>
  <p class="text-sm text-slate-400 dark:text-slate-500" />
</template>
