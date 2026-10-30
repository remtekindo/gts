<script setup lang="ts">
const router = useRouter()

onMounted(() => {
  if (!getAuth()) router.replace('/login')
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800">
    <TopBar />
    <main class="max-w-6xl mx-auto px-4 py-6">
      <slot />
    </main>
  </div>
</template>
