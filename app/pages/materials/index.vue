<script setup lang="ts">
const { t } = useLocale()
import { MATERIALS, papersForMaterial } from '~/data/mock'
import { fetchSessionState } from '~/utils/server-auth'

const router = useRouter()
const auth = ref<AuthState | null>(null)
/** Material slugs this user can open — resolved by the server. */
const allowed = ref<Set<string> | null>(null)

const owned = computed(() => MATERIALS.filter(m => m.status === 'owned'))
const comingSoon = computed(() => MATERIALS.filter(m => m.status === 'coming-soon'))

function paperCount(slug: string): number {
  return papersForMaterial(slug).length
}

function canOpen(slug: string): boolean {
  return allowed.value?.has(slug) ?? false
}

onMounted(async () => {
  auth.value = getAuth()
  if (!auth.value) { router.replace('/auth'); return }
  const state = await fetchSessionState()
  if (!state.username) { router.replace('/auth'); return }
  allowed.value = new Set(state.materials)
})
</script>

<template>
  <div class="py-8">
    <p class="text-sm text-slate-500 dark:text-slate-400">{{ t('hub.welcomeBack') }} {{ auth?.username || t('common.guest') }}</p>
    <h1 class="mt-1 text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100">{{ t('hub.title') }}</h1>
    <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ t('hub.sub') }}</p>

    <p v-if="allowed === null" class="mt-8 text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>

    <div v-else class="mt-8 grid gap-5 md:grid-cols-2">
      <template v-for="m in owned" :key="m.slug">
        <NuxtLink
          v-if="canOpen(m.slug)"
          :to="`/m/${m.slug}`"
          class="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="w-12 h-12 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm">{{ m.badge }}</span>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">{{ t('hub.active') }}</span>
          </div>
          <h2 class="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-700">{{ m.name }}</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ m.description }}</p>
          <div class="mt-4 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span class="font-medium">{{ paperCount(m.slug) }} {{ t('hub.papers') }}</span>
            <span v-for="c in m.credits" :key="c.label" class="font-semibold text-amber-700">{{ c.label }} · {{ c.balance }} {{ t('hub.credits') }}</span>
          </div>
          <span class="mt-5 inline-flex text-sm font-semibold text-blue-600 group-hover:gap-2.5 gap-1.5 transition-all">
            {{ t('hub.open') }} <span aria-hidden="true">→</span>
          </span>
        </NuxtLink>
        <!-- Locked: no grant (and no subscription yet) for this material -->
        <div
          v-else
          class="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-6 opacity-90"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold flex items-center justify-center text-sm">{{ m.badge }}</span>
            <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">🔒 {{ t('hub.locked') }}</span>
          </div>
          <h2 class="mt-4 text-lg font-bold text-slate-700 dark:text-slate-200">{{ m.name }}</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ m.description }}</p>
          <p class="mt-4 text-xs text-slate-500 dark:text-slate-400">{{ t('hub.lockedNote') }}</p>
        </div>
      </template>
    </div>

    <h2 class="mt-12 text-lg font-bold text-slate-900 dark:text-slate-100">{{ t('hub.comingSoon') }}</h2>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('hub.comingSoonSub') }}</p>
    <div class="mt-4 grid gap-5 md:grid-cols-2">
      <div
        v-for="m in comingSoon"
        :key="m.slug"
        class="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-6 opacity-80"
      >
        <div class="flex items-start justify-between gap-3">
          <span class="w-12 h-12 rounded-xl bg-slate-200 text-slate-500 dark:text-slate-400 font-extrabold flex items-center justify-center text-sm">{{ m.badge }}</span>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{{ t('hub.comingSoon') }}</span>
        </div>
        <h3 class="mt-4 text-lg font-bold text-slate-700 dark:text-slate-200">{{ m.name }}</h3>
        <p class="mt-1 text-sm text-slate-400 dark:text-slate-500">{{ m.description }}</p>
      </div>
    </div>
  </div>
</template>
