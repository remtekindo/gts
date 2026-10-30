<script setup lang="ts">
const router = useRouter()

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const auth = ref<AuthState | null>(null)

function signOut(): void {
  clearAuth()
  menuOpen.value = false
  router.push('/login')
}

function onDocumentClick(e: MouseEvent): void {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) menuOpen.value = false
}

onMounted(() => {
  auth.value = getAuth()
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <header class="sticky top-0 z-40 bg-white border-b border-slate-200">
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
      <NuxtLink to="/materials" class="flex items-center gap-2 shrink-0">
        <span class="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs tracking-tight">GTS</span>
        <span class="hidden md:block text-sm font-semibold text-slate-800 leading-tight">Global Testing<br />System</span>
      </NuxtLink>

      <div class="mx-auto" />

      <div ref="menuRef" class="relative shrink-0">
        <button
          class="w-9 h-9 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center hover:bg-slate-600"
          aria-label="Account menu"
          @click.stop="menuOpen = !menuOpen"
        >
          {{ (auth?.username || 'G').slice(0, 1).toUpperCase() }}
        </button>
        <div
          v-if="menuOpen"
          class="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 text-sm z-50"
        >
          <div class="px-4 py-2 border-b border-slate-100">
            <p class="font-semibold text-slate-800 truncate">{{ auth?.username || 'Guest' }}</p>
            <p class="text-xs text-slate-400">Demo account</p>
          </div>
          <NuxtLink to="/profile" class="block px-4 py-2 text-slate-600 hover:bg-slate-50" @click="menuOpen = false">
            Profile
          </NuxtLink>
          <button class="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50" @click="signOut">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
