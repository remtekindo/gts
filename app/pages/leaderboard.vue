<script setup lang="ts">
import { getLastMaterial } from '~/utils/storage'

const { t } = useLocale()
const router = useRouter()

/**
 * Old URL, kept alive: the global /leaderboard page moved into Skor
 * Saya in the v2 rebuild (7 Nov 2026) — same board, now the
 * "Peringkat" section of that page. Sends the user to their active
 * material's Skor Saya (or the picker, with no last material yet).
 */
onMounted(() => {
  const last = getLastMaterial()
  router.replace(last ? `/m/${last}/skor?section=peringkat` : '/materials')
})
</script>

<template>
  <div class="py-8">
    <p class="text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
  </div>
</template>
