<script setup lang="ts">
import { MATERIALS } from '~/data/mock'
import { fetchSessionState } from '~/utils/server-auth'

const { t } = useLocale()
const route = useRoute()
const router = useRouter()

/** Materials the user can open — one tab each. */
const materials = ref<{ slug: string, name: string }[]>([])
const ready = ref(false)

/** ?material=<slug> preselects that tab (used by the material page's Leaderboard tab). */
const preselect = computed(() => {
  const raw = route.query.material
  const slug = typeof raw === 'string' ? raw : ''
  return materials.value.some(m => m.slug === slug) ? slug : null
})

onMounted(async () => {
  const state = await fetchSessionState()
  if (!state.username) { router.replace('/auth'); return }
  materials.value = MATERIALS
    .filter(m => m.status === 'owned' && state.materials.includes(m.slug))
    .map(m => ({ slug: m.slug, name: m.name }))
  ready.value = true
})
</script>

<template>
  <div class="py-8">
    <LeaderboardBoard v-if="ready" :preselect="preselect" :materials="materials" />
    <p v-else class="text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
  </div>
</template>
