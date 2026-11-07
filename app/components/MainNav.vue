<script setup lang="ts">
import { fetchSessionState } from '~/utils/server-auth'

const { t } = useLocale()

/**
 * The v2 navigation (7 Nov 2026): exactly three primary destinations
 * — Tes, Skor Saya, Profil — the same three on the desktop top bar
 * and the mobile bottom tab bar. One active material at a time: the
 * picker (`/materials`) is reached via "Ganti materi", never a
 * material-switcher dropdown in the top nav, and the top bar shows
 * the active material name in full, never truncated.
 *
 * Props are null on pages without a material context (picker with no
 * last material yet): then no destinations render at all — just the
 * logo, language/theme, and the account menu.
 */
const props = withDefaults(defineProps<{ materialSlug?: string | null, materialName?: string | null }>(), {
  materialSlug: null,
  materialName: null
})

const route = useRoute()
const router = useRouter()

const base = computed(() => (props.materialSlug ? `/m/${props.materialSlug}` : null))

const items = computed(() => {
  if (!base.value) return []
  const b = base.value as string
  return [
    { id: 'tes', label: t('nav.tes'), to: b },
    { id: 'skor', label: t('nav.skorSaya'), to: `${b}/skor` },
    { id: 'profil', label: t('nav.profile'), to: '/profile' }
  ]
})

/** Tes stays active for everything that belongs to it — the test
 * list, paper detail, take, result, Live Test, Latihan Saya, and
 * practice — so the user never loses their place mid-test. Skor
 * Saya covers the new page plus the old /performance and
 * /leaderboard URLs, which redirect there. */
function isActive(item: { id: string, to: string }): boolean {
  const p = route.path
  const b = base.value as string
  if (item.id === 'tes') {
    return p === b
      || p.startsWith(`${b}/papers`)
      || p.startsWith(`${b}/live-test`)
      || p.startsWith(`${b}/playlist`)
      || p.startsWith(`${b}/practice`)
  }
  if (item.id === 'skor') {
    return p.startsWith(`${b}/skor`)
      || p.startsWith(`${b}/performance`)
      || p.startsWith(`${b}/leaderboard`)
  }
  return p === '/profile'
}

/** The result page has its own fixed palette at the bottom, so the
 * tab bar hides there — the page's own CTAs are the way forward. */
const hideTabBar = computed(() => route.path.endsWith('/result'))

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
const auth = ref<AuthState | null>(null)
const picBroken = ref(false)
const serverAdmin = ref(false)
const isAdmin = computed(() => serverAdmin.value)

function signOut(): void {
  void logoutServer()
  clearAuth()
  menuOpen.value = false
  router.push('/auth')
}

function onDocumentClick(e: MouseEvent): void {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) menuOpen.value = false
}

onMounted(async () => {
  auth.value = getAuth()
  // The Admin link is admin-only. The role comes from the server
  // session (GET /api/auth/session), never from the forgeable
  // localStorage copy — a forged "admin" value shows no link.
  const state = await fetchSessionState()
  serverAdmin.value = state.admin
  // Display fallback: the mirror may be missing while the cookie is
  // valid (cleared storage) — show the server identity, not "Guest".
  if (!auth.value && state.username) {
    auth.value = {
      username: state.username,
      remember: false,
      role: state.role,
      name: state.name ?? undefined,
      picture: state.picture ?? undefined,
    }
  }
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
  <header class="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
      <NuxtLink to="/materials" class="flex items-center gap-2 shrink-0" aria-label="Materials">
        <span class="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs tracking-tight">GTS</span>
      </NuxtLink>

      <!-- Active material name, in full — never truncated, even on a
           small phone. It wraps to two lines rather than cutting off. -->
      <p v-if="materialName" class="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
        {{ materialName }}
      </p>

      <nav v-if="items.length" class="hidden md:flex items-center gap-1 mx-auto" aria-label="Utama">
        <NuxtLink
          v-for="item in items"
          :key="item.id"
          :to="item.to"
          class="relative px-3 py-5 text-sm font-medium transition-colors"
          :class="isActive(item) ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'"
        >
          {{ item.label }}
          <span
            v-if="isActive(item)"
            class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600"
          />
        </NuxtLink>
      </nav>
      <div v-else class="mx-auto" />
      <div v-if="items.length" class="md:hidden mx-auto" />

      <div class="ml-auto md:ml-0 flex items-center gap-2 shrink-0">
        <!-- Language + theme live in Profil settings too; on a phone
             the header keeps only the account menu so the material
             name always fits. -->
        <span class="hidden sm:block"><LocaleSwitcher /></span>
        <span class="hidden sm:block"><ThemeToggle /></span>
        <div ref="menuRef" class="relative">
          <button
            class="w-9 h-9 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center hover:bg-slate-600 overflow-hidden"
            aria-label="Account menu"
            @click.stop="menuOpen = !menuOpen"
          >
            <img v-if="auth?.picture && !picBroken" :src="auth.picture" :alt="auth?.name || auth?.username || ''" class="w-9 h-9 object-cover" @error="picBroken = true" />
            <span v-else>{{ (auth?.name || auth?.username || 'G').slice(0, 1).toUpperCase() }}</span>
          </button>
          <div
            v-if="menuOpen"
            class="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 text-sm z-50"
          >
            <div class="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
              <p class="font-semibold text-slate-800 dark:text-slate-200 truncate">{{ auth?.name || auth?.username || 'Guest' }}</p>
              <p class="text-xs text-slate-400 dark:text-slate-500 truncate">{{ auth?.username || '' }}</p>
              <p class="text-xs text-slate-400 dark:text-slate-500">{{ auth?.role === 'admin' ? 'Admin' : 'Member' }}</p>
            </div>
            <NuxtLink v-if="isAdmin" to="/admin" class="block px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" @click="menuOpen = false">
              Admin
            </NuxtLink>
            <NuxtLink to="/profile" class="block px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800" @click="menuOpen = false">
              {{ t('nav.profile') }}
            </NuxtLink>
            <button class="w-full text-left px-4 py-2 text-red-600 dark:text-red-300 hover:bg-red-50" @click="signOut">
              {{ t('nav.signOut') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Mobile bottom tab bar: the same 3 destinations, always visible,
       no horizontal scrolling. Hidden on the result page, which has
       its own fixed palette and CTAs at the bottom. -->
  <nav
    v-if="items.length && !hideTabBar"
    class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700"
    aria-label="Utama"
  >
    <div class="grid grid-cols-3">
      <NuxtLink
        v-for="item in items"
        :key="item.id"
        :to="item.to"
        class="flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold"
        :class="isActive(item) ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400'"
      >
        <span class="text-base leading-none" aria-hidden="true">
          {{ item.id === 'tes' ? '✎' : item.id === 'skor' ? '★' : '👤' }}
        </span>
        {{ item.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
