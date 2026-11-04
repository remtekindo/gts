<script setup lang="ts">
import { getAuth, clearAuth } from '~/utils/storage'
import { getReports } from '~/utils/admin'

const route = useRoute()
const router = useRouter()
const { t } = useLocale()

const authed = ref(false)
const deniedUser = ref<string | null>(null)
const pendingCount = ref(0)

const nav = computed(() => [
  { label: t('admin.nav.dashboard'), to: '/admin' },
  { label: t('admin.nav.databases'), to: '/admin/databases' },
  { label: t('admin.nav.packages'), to: '/admin/packages' },
  { label: t('admin.nav.audits'), to: '/admin/audits' },
  { label: t('admin.nav.reports'), to: '/admin/reports' },
  { label: t('admin.nav.users'), to: '/admin/users' },
])

function isActive(to: string): boolean {
  return to === '/admin' ? route.path === '/admin' : route.path.startsWith(to)
}

function signOut(): void {
  clearAuth()
  router.replace('/auth')
}

onMounted(() => {
  const auth = getAuth()
  if (!auth) {
    router.replace('/auth?next=/admin')
    return
  }
  if (auth.role !== 'admin') {
    // Logged in as a regular user: show "access denied" instead of
    // redirecting (redirecting would loop with /auth's auto-redirect).
    deniedUser.value = auth.username
    return
  }
  authed.value = true
  pendingCount.value = getReports().filter(r => r.status === 'pending').length
})

function switchAccount(): void {
  clearAuth()
  router.replace('/auth?next=/admin')
}
</script>

<template>
  <div v-if="deniedUser" class="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
    <div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center">
      <p class="text-3xl">🔒</p>
      <h1 class="mt-2 font-extrabold text-lg">{{ t('admin.deniedTitle') }}</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.deniedSub', { user: deniedUser }) }}</p>
      <button
        class="mt-4 w-full rounded-xl bg-blue-600 text-white font-semibold py-2.5 text-sm hover:bg-blue-700 transition-colors"
        @click="switchAccount"
      >
        {{ t('admin.deniedSwitch') }}
      </button>
      <NuxtLink to="/materials" class="mt-2 block text-sm font-semibold text-slate-500 dark:text-slate-400 py-2">
        {{ t('admin.backToApp') }}
      </NuxtLink>
    </div>
  </div>
  <div v-else-if="authed" class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 md:flex">
    <!-- Desktop sidebar -->
    <aside class="hidden md:flex w-60 shrink-0 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 min-h-screen sticky top-0 h-screen">
      <div class="px-5 h-16 flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800">
        <span class="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold flex items-center justify-center text-[10px]">GTS</span>
        <div>
          <p class="text-sm font-bold leading-tight">{{ t('admin.title') }}</p>
          <p class="text-[11px] text-slate-400 dark:text-slate-500">{{ t('admin.subtitle') }}</p>
        </div>
      </div>
      <nav class="flex-1 px-3 py-4 space-y-1">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="isActive(item.to) ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'"
        >
          {{ item.label }}
          <span
            v-if="item.to === '/admin/reports' && pendingCount > 0"
            class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
          >{{ pendingCount }}</span>
        </NuxtLink>
      </nav>
      <div class="px-3 py-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <NuxtLink to="/materials" class="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
          {{ t('admin.backToApp') }}
        </NuxtLink>
        <button class="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40" @click="signOut">
          {{ t('admin.signOut') }}
        </button>
      </div>
    </aside>

    <!-- Mobile top bar -->
    <header class="md:hidden sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div class="px-4 h-14 flex items-center gap-2.5">
        <span class="w-7 h-7 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold flex items-center justify-center text-[9px]">GTS</span>
        <p class="text-sm font-bold">{{ t('admin.title') }}</p>
        <div class="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <button class="text-xs font-semibold text-red-600 dark:text-red-300 px-2 py-1.5" @click="signOut" :aria-label="t('admin.signOut')">
            {{ t('admin.signOut') }}
          </button>
        </div>
      </div>
      <nav class="flex gap-1 px-3 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800" :aria-label="t('admin.title')">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="relative whitespace-nowrap px-3 py-2.5 text-sm font-medium"
          :class="isActive(item.to) ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400'"
        >
          {{ item.label }}
          <span
            v-if="item.to === '/admin/reports' && pendingCount > 0"
            class="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
          >{{ pendingCount }}</span>
          <span v-if="isActive(item.to)" class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600" />
        </NuxtLink>
      </nav>
    </header>

    <main class="flex-1 min-w-0">
      <div class="max-w-5xl mx-auto px-4 py-6">
        <slot />
      </div>
    </main>
  </div>
</template>
