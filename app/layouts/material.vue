<script setup lang="ts">
import { getMaterialOrFallback } from '~/data/mock'

const route = useRoute()
const router = useRouter()

const material = computed(() => getMaterialOrFallback(route.params.slug as string))

onMounted(() => {
  if (!getAuth()) router.replace('/auth')
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
    <MaterialTopBar :material="material" />
    <main class="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
