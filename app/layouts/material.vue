<script setup lang="ts">
import { getMaterialOrFallback } from '~/data/mock'
import { fetchSessionState } from '~/utils/server-auth'

const { t } = useLocale()

const route = useRoute()
const router = useRouter()

const material = computed(() => getMaterialOrFallback(route.params.slug as string))

/**
 * Material access is decided by the server (GET /api/auth/session
 * returns the materials this user can open — admin, or a grant).
 * The page content is not rendered until the verdict arrives, so a
 * locked material never flashes its dashboard. Note the content
 * itself still lives in the browser (localStorage bank); full
 * server-side content gating waits for the D1 question-bank
 * migration — see README § Auth.
 */
const allowed = ref<boolean | null>(null)

onMounted(async () => {
  // Server session is the source of truth (see layouts/default.vue).
  const state = await fetchSessionState()
  if (!state.username) { router.replace('/auth'); return }
  allowed.value = state.admin || state.materials.includes(route.params.slug as string)
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col">
    <MaterialTopBar :material="material" />
    <main class="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
      <div v-if="allowed === false" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
        <p class="text-3xl">🔒</p>
        <h1 class="mt-2 text-xl font-extrabold">{{ t('access.lockedTitle', { name: material.name }) }}</h1>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('access.lockedSub') }}</p>
        <NuxtLink to="/materials" class="mt-5 inline-block text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          {{ t('access.backToMaterials') }}
        </NuxtLink>
      </div>
      <p v-else-if="allowed === null" class="text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
      <slot v-else />
    </main>
    <AppFooter />
  </div>
</template>
