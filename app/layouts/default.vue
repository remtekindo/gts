<script setup lang="ts">
import { fetchSessionState } from '~/utils/server-auth'

const router = useRouter()

onMounted(async () => {
  // The server session cookie is the source of truth. The localStorage
  // mirror is UI-only and may be missing (e.g. cleared storage with a
  // valid cookie) — redirecting on the mirror alone loops with /auth's
  // auto-redirect, because /auth sends a valid session straight back.
  const state = await fetchSessionState()
  if (!state.username) router.replace('/auth')
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col">
    <TopBar />
    <main class="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
