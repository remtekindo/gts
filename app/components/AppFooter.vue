<script setup lang="ts">
const { t } = useLocale()
</script>

<template>
  <footer class="bg-slate-900 text-slate-400 dark:text-slate-500 mt-12">
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <span class="w-8 h-8 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-[11px] tracking-tight">GTS</span>
          <div class="text-sm">
            <p class="font-semibold text-slate-200">Global Testing System</p>
            <p class="text-xs">{{ t('landing.titleA') }} {{ t('landing.titleB') }}</p>
          </div>
        </div>
        <nav class="flex items-center gap-5 text-sm">
          <NuxtLink to="/materials" class="hover:text-slate-200 transition-colors">{{ t('nav.materials') }}</NuxtLink>
          <NuxtLink to="/profile" class="hover:text-slate-200 transition-colors">{{ t('nav.profile') }}</NuxtLink>
        </nav>
      </div>
      <div class="mt-6 pt-5 border-t border-slate-800 flex flex-col md:flex-row justify-between gap-2 text-xs">
        <p>© 2026 GTS — Global Testing System. All rights reserved.</p>
        <p>TOEIC® is a registered trademark of ETS. This product is not endorsed or approved by ETS.</p>
      </div>
    </div>
  </footer>
</template>
