<script setup lang="ts">
import { postLoginPath } from '~/utils/navigation'
import { fetchSessionState, loginWithGoogle, logoutServer, type SessionState } from '~/utils/server-auth'

const { t } = useLocale()

definePageMeta({ layout: false })

const router = useRouter()
const route = useRoute()

/** Where to go after auth. Honors ?next=/path (local paths only). */
function nextPath(): string {
  const n = route.query.next
  if (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//')) return n
  return postLoginPath()
}

/**
 * Sign-in is Google-only now (one button for everyone — admin or
 * learner). There is no username/password form anymore, and no mock
 * login: the role is decided by the server from the verified Google
 * token, never by this browser. See README § Auth.
 */
const remember = ref(false)
const error = ref('')
const googleReady = ref(false)
const googleBlocked = ref(false)
const signedInAs = ref<SessionState | null>(null)
const googleBtn = ref<HTMLElement | null>(null)

/** Minimal typing for the Google Identity Services button flow. */
interface GisId {
  initialize: (opts: { client_id: string, callback: (res: { credential: string }) => void, auto_select?: boolean }) => void
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void
}

function gis(): GisId | null {
  const g = (window as unknown as { google?: { accounts?: { id?: GisId } } }).google
  return g?.accounts?.id ?? null
}

async function handleCredential(res: { credential: string }): Promise<void> {
  error.value = ''
  const r = await loginWithGoogle(res.credential, remember.value)
  if (!r.ok) {
    error.value = r.code === 'unavailable' ? t('auth.errGoogleUnavailable') : t('auth.errGoogleFailed')
    return
  }
  const s = r.session
  setAuth({ username: s.email ?? '', remember: remember.value, role: s.role, name: s.name ?? undefined, picture: s.picture ?? undefined })
  if (s.name) setDisplayName(s.name)
  router.push(nextPath())
}

function initGoogle(clientId: string): void {
  const id = gis()
  if (!id || !googleBtn.value) return
  id.initialize({ client_id: clientId, callback: (res) => { void handleCredential(res) }, auto_select: false })
  id.renderButton(googleBtn.value, { theme: 'outline', size: 'large', width: 320 })
  googleReady.value = true
}

function loadGis(clientId: string): void {
  // Already present (e.g. loaded by an earlier visit) — use it directly.
  if (gis()) { initGoogle(clientId); return }
  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  script.onload = () => initGoogle(clientId)
  script.onerror = () => { error.value = t('auth.errGoogleLoad') }
  document.head.appendChild(script)
}

async function switchAccount(): Promise<void> {
  await logoutServer()
  clearAuth()
  signedInAs.value = null
  router.replace('/auth')
}

function continueToMaterials(): void {
  router.push('/materials')
}

onMounted(async () => {
  // Already signed in? The server session is the source of truth.
  const state = await fetchSessionState()
  if (state.admin || state.username) {
    const n = route.query.next
    if (typeof n === 'string' && n.startsWith('/admin') && !state.admin) {
      // Signed in as a non-admin heading for /admin: stay here and
      // offer to switch accounts instead of bouncing in a loop.
      signedInAs.value = state
    } else {
      router.replace(nextPath())
      return
    }
  }
  // Google Sign-In setup: the Client ID comes from the server, so it
  // can be set or rotated without rebuilding the client bundle.
  let clientId: string | null = null
  try {
    const cfg = await $fetch<{ clientId: string | null }>('/api/auth/config')
    clientId = cfg.clientId
  } catch {
    clientId = null
  }
  if (!clientId) {
    googleBlocked.value = true
    error.value = t('auth.errGoogleUnavailable')
    return
  }
  loadGis(clientId)
})
</script>

<template>
  <div class="min-h-screen flex bg-slate-50 dark:bg-slate-950">
    <!-- Brand panel -->
    <div class="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 text-white flex-col justify-between p-12">
      <div class="flex items-center gap-3">
        <span class="w-11 h-11 rounded-xl bg-slate-900/15 font-extrabold flex items-center justify-center text-sm tracking-tight">GTS</span>
        <span class="font-semibold leading-tight">Global Testing<br />System</span>
      </div>
      <div>
        <h1 class="text-4xl font-extrabold leading-tight">Know your level.<br />Own your score.</h1>
        <p class="mt-4 text-blue-200 max-w-md leading-relaxed">
          {{ t('auth.brandLine1') }} {{ t('auth.brandLine2') }}
        </p>
        <ul class="mt-8 space-y-3 text-sm text-blue-100">
          <li class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-slate-900/15 flex items-center justify-center text-xs">✓</span>
            {{ t('auth.brandF1') }}
          </li>
          <li class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-slate-900/15 flex items-center justify-center text-xs">✓</span>
            {{ t('auth.brandF2') }}
          </li>
          <li class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-slate-900/15 flex items-center justify-center text-xs">✓</span>
            {{ t('auth.brandF3') }}
          </li>
        </ul>
      </div>
      <p class="text-xs text-blue-300">© 2026 GTS — Global Testing System. Demo build.</p>
    </div>

    <!-- Sign-in card -->
    <div class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
        <div class="flex items-center justify-end gap-2 mb-4"><LocaleSwitcher /><ThemeToggle /></div>
        <div class="lg:hidden flex items-center gap-2 mb-6">
          <span class="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">GTS</span>
          <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">Global Testing System</span>
        </div>
        <h2 class="text-2xl font-extrabold text-slate-800 dark:text-slate-200">{{ t('auth.welcome') }}</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('auth.welcomeSub') }}</p>

        <!-- Already signed in as a non-admin, heading for /admin -->
        <div v-if="signedInAs" class="mt-6 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-3.5 py-3 text-sm text-amber-800 dark:text-amber-200">
          {{ t('auth.googleSignedInAs', { email: signedInAs.email ?? '' }) }}
          <div class="mt-3 flex flex-col gap-2">
            <button class="w-full rounded-xl bg-blue-600 text-white font-semibold py-2.5 text-sm hover:bg-blue-700 transition-colors" @click="continueToMaterials">
              {{ t('auth.continueToMaterials') }}
            </button>
            <button class="w-full rounded-xl border border-slate-300 dark:border-slate-600 font-semibold py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" @click="switchAccount">
              {{ t('auth.switchAccount') }}
            </button>
          </div>
        </div>

        <div class="mt-6 flex justify-center">
          <div ref="googleBtn" />
        </div>
        <p v-if="!googleReady && !googleBlocked && !error" class="mt-4 text-center text-sm text-slate-400 dark:text-slate-500">{{ t('auth.googleLoading') }}</p>

        <label class="mt-5 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
          <input v-model="remember" type="checkbox" class="w-4 h-4 rounded accent-blue-600" />
          {{ t('auth.rememberMe') }}
        </label>

        <p v-if="error" class="mt-4 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-xl px-3.5 py-2.5">{{ error }}</p>

        <p class="mt-5 text-xs text-center text-slate-400 dark:text-slate-500 leading-relaxed">{{ t('auth.googleNote') }}</p>
      </div>
    </div>
  </div>
</template>
