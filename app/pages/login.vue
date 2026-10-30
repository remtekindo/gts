<script setup lang="ts">
definePageMeta({ layout: false })

const router = useRouter()

const username = ref('')
const password = ref('')
const remember = ref(false)
const showPassword = ref(false)
const error = ref('')

onMounted(() => {
  if (getAuth()) router.replace('/')
})

function signIn(): void {
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = 'Please enter your username and password.'
    return
  }
  // Mock auth: any credentials are accepted in this demo build.
  setAuth({ username: username.value.trim(), remember: remember.value })
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex bg-slate-50">
    <!-- Brand panel -->
    <div class="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 text-white flex-col justify-between p-12">
      <div class="flex items-center gap-3">
        <span class="w-11 h-11 rounded-xl bg-white/15 font-extrabold flex items-center justify-center text-sm tracking-tight">GTS</span>
        <span class="font-semibold leading-tight">Global Testing<br />System</span>
      </div>
      <div>
        <h1 class="text-4xl font-extrabold leading-tight">Know your level.<br />Own your score.</h1>
        <p class="mt-4 text-blue-200 max-w-md leading-relaxed">
          Practice with realistic test simulations, get an instant predicted score,
          and track exactly where you stand — no theory, just the test.
        </p>
        <ul class="mt-8 space-y-3 text-sm text-blue-100">
          <li class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs">✓</span>
            Full Listening &amp; Reading simulations
          </li>
          <li class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs">✓</span>
            Instant predicted score with CEFR level
          </li>
          <li class="flex items-center gap-3">
            <span class="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-xs">✓</span>
            Fresh practice papers every month
          </li>
        </ul>
      </div>
      <p class="text-xs text-blue-300">© 2026 GTS — Global Testing System. Demo build.</p>
    </div>

    <!-- Login card -->
    <div class="flex-1 flex items-center justify-center p-6">
      <div class="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div class="lg:hidden flex items-center gap-2 mb-6">
          <span class="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs">GTS</span>
          <span class="text-sm font-semibold text-slate-800">Global Testing System</span>
        </div>
        <h2 class="text-2xl font-extrabold text-slate-800">Welcome!</h2>
        <p class="mt-1 text-sm text-slate-500">Sign in to continue to your dashboard.</p>

        <form class="mt-6 space-y-4" @submit.prevent="signIn">
          <div>
            <label for="login-username" class="block text-sm font-medium text-slate-600 mb-1.5">Email or Username</label>
            <input
              id="login-username"
              v-model="username"
              type="text"
              autocomplete="username"
              placeholder="you@example.com"
              class="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label for="login-password" class="block text-sm font-medium text-slate-600 mb-1.5">Password</label>
            <div class="relative">
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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

          <div class="flex items-center justify-between text-sm">
            <label class="flex items-center gap-2 text-slate-600 cursor-pointer">
              <input v-model="remember" type="checkbox" class="w-4 h-4 rounded accent-blue-600" />
              Remember me
            </label>
            <a href="#" class="font-medium text-blue-600 hover:text-blue-700" @click.prevent>Forgot Password?</a>
          </div>

          <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-xl px-3.5 py-2.5">{{ error }}</p>

          <button
            type="submit"
            class="w-full rounded-xl bg-blue-600 text-white font-semibold py-3 text-sm hover:bg-blue-700 transition-colors"
          >
            Sign in
          </button>

          <p class="text-center text-xs text-slate-400">Demo build — any credentials will sign you in.</p>
        </form>
      </div>
    </div>
  </div>
</template>
