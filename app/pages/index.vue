<script setup lang="ts">
import { postLoginPath } from '~/utils/navigation'

const router = useRouter()

onMounted(() => {
  router.replace(getAuth() ? postLoginPath() : '/login')
})
</script>

<template>
  <div class="min-h-screen bg-slate-50" />
</template>
