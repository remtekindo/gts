<script setup lang="ts">
defineProps<{ label?: string }>()
</script>

<template>
  <!-- Decorative demo player: there is no real audio in this build. -->
  <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" :title="label || 'Audio placeholder'">
    <div class="flex items-center gap-3">
      <button
        class="w-10 h-10 shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
        aria-label="Play audio (placeholder)"
        title="Audio placeholder — no recording in this demo"
      >
        <svg class="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
      <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between text-xs text-slate-500 tabular-nums mb-1.5">
          <span>00:00</span>
          <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Demo audio placeholder</span>
          <span>00:00</span>
        </div>
        <input type="range" min="0" max="100" value="0" disabled class="w-full accent-blue-600 opacity-60 cursor-not-allowed" aria-label="Seek (disabled in demo)" />
      </div>
      <div class="hidden sm:flex items-center gap-2 shrink-0">
        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5 6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7" />
        </svg>
        <input type="range" min="0" max="100" value="70" disabled class="w-20 accent-blue-600 opacity-60 cursor-not-allowed" aria-label="Volume (disabled in demo)" />
      </div>
    </div>
  </div>
</template>
