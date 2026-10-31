<script setup lang="ts">
import { postLoginPath } from '~/utils/navigation'

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

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const remember = ref(false)
const showPassword = ref(false)
const error = ref('')

onMounted(() => {
  // Already signed in: continue onward — but NOT when a ?next= target is
  // present, so the user can switch accounts instead of bouncing
  // between /auth and the target (e.g. non-admin hitting /admin).
  if (getAuth() && !route.query.next) router.replace(nextPath())
})

function switchMode(next: 'login' | 'register'): void {
  mode.value = next
  error.value = ''
  username.value = ''
  name.value = ''
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
}

function submit(): void {
  error.value = ''
  if (mode.value === 'login') {
    if (!username.value.trim() || !password.value) {
      error.value = t('auth.errRequired')
      return
    }
    // Mock auth: any credentials are accepted in this demo build.
    // Username "admin" signs in with the admin role (for the /admin panel).
    const uname = username.value.trim()
    setAuth({ username: uname, remember: remember.value, role: uname.toLowerCase() === 'admin' ? 'admin' : 'user' })
    router.push(nextPath())
    return
  }
  // Register mode
  if (!name.value.trim() || !email.value.trim() || !password.value || !confirmPassword.value) {
    error.value = t('auth.errAllFields')
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    error.value = t('auth.errEmail')
    return
  }
  if (password.value.length < 6) {
    error.value = t('auth.errPassLen')
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = t('auth.errPassMatch')
    return
  }
  // Mock register: any valid input creates the demo account.
  setAuth({ username: name.value.trim(), remember: true, role: 'user' })
  router.push(nextPath())
}
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

    <!-- Login card -->
    <div class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8">
        <div class="flex items-center justify-end gap-2 mb-4"><LocaleSwitcher /><ThemeToggle /></div>
      <div class="lg:hidden flex items-center gap-2 mb-6">
          <span class="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">GTS</span>
          <span class="text-sm font-semibold text-slate-800 dark:text-slate-200">Global Testing System</span>
        </div>
        <h2 class="text-2xl font-extrabold text-slate-800 dark:text-slate-200">{{ mode === 'login' ? t('auth.welcome') : t('auth.createTitle') }}</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ mode === 'login' ? t('auth.welcomeSub') : t('auth.createSub') }}</p>

        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <div v-if="mode === 'login'">
            <label for="login-username" class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{{ t('auth.emailOrUsername') }}</label>
            <input
              id="login-username"
              v-model="username"
              type="text"
              autocomplete="username"
              placeholder="you@example.com"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div v-if="mode === 'register'">
            <label for="register-name" class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{{ t('auth.fullName') }}</label>
            <input
              id="register-name"
              v-model="name"
              type="text"
              autocomplete="name"
              placeholder="Your name"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div v-if="mode === 'register'">
            <label for="register-email" class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{{ t('auth.email') }}</label>
            <input
              id="register-email"
              v-model="email"
              type="email"
              autocomplete="email"
              placeholder="you@example.com"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label for="login-password" class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{{ t('auth.password') }}</label>
            <div class="relative">
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 pr-11 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.7 3.7M6.6 6.6C4.1 8 2.6 10.4 2 12c1 2.5 5 7 10 7 1.5 0 2.9-.4 4.1-1" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7s-9-4.5-10-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <div v-if="mode === 'register'">
            <label for="register-confirm" class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{{ t('auth.confirmPassword') }}</label>
            <input
              id="register-confirm"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder="••••••••"
              class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-800 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div v-if="mode === 'login'" class="flex items-center justify-between text-sm">
            <label class="flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
              <input v-model="remember" type="checkbox" class="w-4 h-4 rounded accent-blue-600" />
              {{ t('auth.rememberMe') }}
            </label>
            <a href="#" class="font-medium text-blue-600 hover:text-blue-700" @click.prevent>{{ t('auth.forgot') }}</a>
          </div>

          <p v-if="error" class="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-xl px-3.5 py-2.5">{{ error }}</p>

          <p v-if="mode === 'login'" class="text-xs text-center text-slate-400 dark:text-slate-500">{{ t('auth.adminHint') }}</p>

          <button
            type="submit"
            class="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 text-sm hover:bg-blue-700 transition-colors"
          >
            {{ mode === 'login' ? t('auth.signInBtn') : t('auth.createBtn') }}
          </button>

          <p class="text-center text-sm text-slate-500 dark:text-slate-400">
            <template v-if="mode === 'login'">
              {{ t('auth.noAccount') }}
              <button type="button" class="font-semibold text-blue-600 hover:text-blue-700" @click="switchMode('register')">{{ t('auth.registerLink') }}</button>
            </template>
            <template v-else>
              {{ t('auth.hasAccount') }}
              <button type="button" class="font-semibold text-blue-600 hover:text-blue-700" @click="switchMode('login')">{{ t('auth.signInBtn') }}</button>
            </template>
          </p>

          <p class="text-center text-xs text-slate-400 dark:text-slate-500">{{ mode === 'login' ? t('auth.demoLogin') : t('auth.demoRegister') }}</p>
        </form>
      </div>
    </div>
  </div>
</template>
