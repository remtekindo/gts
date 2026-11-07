<script setup lang="ts">
import { getMaterial } from '~/data/mock'
import { fetchSessionState } from '~/utils/server-auth'
import { getLastMaterial } from '~/utils/storage'

const router = useRouter()

/** Last material opened, if any — so Profil (and the picker, when
 * returning) still offer the three destinations in the top bar and
 * the mobile tab bar. Null on first login: no destinations render. */
const lastSlug = ref<string | null>(null)
const lastName = ref<string | null>(null)

onMounted(async () => {
  // The server session cookie is the source of truth. The localStorage
  // mirror is UI-only and may be missing (e.g. cleared storage with a
  // valid cookie) — redirecting on the mirror alone loops with /auth's
  // auto-redirect, because /auth sends a valid session straight back.
  const state = await fetchSessionState()
  if (!state.username) router.replace('/auth')
  const slug = getLastMaterial()
  if (slug) {
    lastSlug.value = slug
    lastName.value = getMaterial(slug)?.name ?? null
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex flex-col">
    <MainNav :material-slug="lastSlug" :material-name="lastName" />
    <main class="max-w-6xl mx-auto px-4 pt-6 pb-24 md:pb-6 w-full flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
