<script setup lang="ts">
const router = useRouter()

onMounted(() => {
  if (!getAuth()) router.replace('/login')
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
    <TopBar />
    <main class="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
