<script setup lang="ts">
const { theme, toggleTheme } = useTheme()
</script>

<template>
  <button
    type="button"
    class="w-9 h-9 rounded-full border border-slate-300 dark:border-slate-600 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 dark:hover:text-white hover:border-slate-400 transition-colors"
    :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleTheme"
  >
    <svg v-if="theme === 'dark'" class="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" />
      <path stroke-linecap="round" d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
    <svg v-else class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  </button>
</template>
