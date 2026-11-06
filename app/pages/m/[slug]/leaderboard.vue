<script setup lang="ts">
import { MATERIALS } from '~/data/mock'
import { fetchSessionState } from '~/utils/server-auth'

definePageMeta({ layout: 'material' })

const { t } = useLocale()
const route = useRoute()
const router = useRouter()

const slug = computed(() => route.params.slug as string)

/**
 * The material page's Leaderboard tab renders the same board as the
 * global /leaderboard page — Global tab + one tab per material the
 * user can open — with this material's tab preselected. One
 * component, no duplicated board logic.
 */
const materials = ref<{ slug: string, name: string }[]>([])
const ready = ref(false)

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
    <LeaderboardBoard
      v-if="ready"
      :preselect="slug"
      :materials="materials"
    />
    <p v-else class="text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
  </div>
</template>
