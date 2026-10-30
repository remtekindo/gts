<script setup lang="ts">
import { getMaterialOrFallback, ownedMaterials } from '~/data/mock'
import type { Material } from '~/data/mock'

const props = defineProps<{ material: Material }>()

const route = useRoute()
const router = useRouter()

const base = computed(() => `/m/${props.material.slug}`)
const nav = computed(() => [
  { label: 'Dashboard', to: base.value },
  { label: 'Papers', to: `${base.value}/papers` },
  { label: 'Performance', to: `${base.value}/performance` },
  { label: 'Leaderboard', to: `${base.value}/leaderboard` }
])

const switcherOpen = ref(false)
const menuOpen = ref(false)
const switcherRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const auth = ref<AuthState | null>(null)
const others = computed(() => ownedMaterials().filter(m => m.slug !== props.material.slug))

function isActive(to: string): boolean {
  return to === base.value ? route.path === base.value : route.path.startsWith(to)
}

function signOut(): void {
  clearAuth()
  menuOpen.value = false
  router.push('/auth')
}

function onDocumentClick(e: MouseEvent): void {
  if (switcherRef.value && !switcherRef.value.contains(e.target as Node)) switcherOpen.value = false
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
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
      <NuxtLink to="/materials" class="flex items-center gap-2 shrink-0" aria-label="All materials">
        <span class="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs tracking-tight">GTS</span>
      </NuxtLink>

      <div ref="switcherRef" class="relative shrink-0">
        <button
          class="flex items-center gap-1.5 text-sm font-semibold text-slate-800 hover:text-blue-600 px-2 py-2"
          aria-label="Switch material"
          @click.stop="switcherOpen = !switcherOpen"
        >
          <span class="truncate max-w-44">{{ material.name }}</span>
          <span class="text-xs text-slate-400">{{ switcherOpen ? '▲' : '▼' }}</span>
        </button>
        <div
          v-if="switcherOpen"
          class="absolute left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1 text-sm z-50"
        >
          <NuxtLink
            v-for="m in others"
            :key="m.slug"
            :to="`/m/${m.slug}`"
            class="block px-4 py-2.5 text-slate-700 hover:bg-slate-50"
            @click="switcherOpen = false"
          >
            <span class="font-semibold block">{{ m.name }}</span>
            <span class="text-xs text-slate-400">{{ m.tagline }}</span>
          </NuxtLink>
          <NuxtLink
            to="/materials"
            class="block px-4 py-2.5 text-blue-600 font-medium border-t border-slate-100 hover:bg-slate-50"
            @click="switcherOpen = false"
          >
            All materials
          </NuxtLink>
        </div>
      </div>

      <nav class="hidden md:flex items-center gap-1 mx-auto">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="relative px-3 py-5 text-sm font-medium transition-colors"
          :class="isActive(item.to) ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'"
        >
          {{ item.label }}
          <span
            v-if="isActive(item.to)"
            class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600"
          />
        </NuxtLink>
      </nav>
      <div class="md:hidden mx-auto" />

      <div class="flex items-center gap-2 shrink-0">
        <span
          v-for="c in material.credits"
          :key="c.label"
          class="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800"
        >
          {{ c.label }} · {{ c.balance }}
        </span>
        <div ref="menuRef" class="relative">
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
    </div>
  </header>
</template>
