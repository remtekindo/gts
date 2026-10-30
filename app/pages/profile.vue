<script setup lang="ts">
const { t } = useLocale()
const activeTab = ref<'profile' | 'password' | 'purchase' | 'enroll'>('profile')

const auth = ref<AuthState | null>(null)
const name = ref('')
const email = ref('')
const savedMsg = ref('')

const currentPw = ref('')
const newPw = ref('')
const confirmPw = ref('')
const pwMsg = ref('')
const pwError = ref('')

const avatarPreview = ref<string | null>(null)

onMounted(() => {
  auth.value = getAuth()
  name.value = getDisplayName() || auth.value?.username || ''
  email.value = auth.value ? `${auth.value.username}@example.com` : ''
})

function onAvatarChange(e: Event): void {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) avatarPreview.value = URL.createObjectURL(file)
}

function saveProfile(): void {
  setDisplayName(name.value.trim())
  savedMsg.value = t('profile.profileSaved')
  setTimeout(() => { savedMsg.value = '' }, 2500)
}

function changePassword(): void {
  pwMsg.value = ''
  pwError.value = ''
  if (!currentPw.value || !newPw.value || !confirmPw.value) {
    pwError.value = t('profile.errPwFields')
    return
  }
  if (newPw.value !== confirmPw.value) {
    pwError.value = t('profile.errPwMatch')
    return
  }
  if (newPw.value.length < 8) {
    pwError.value = t('profile.errPwLen')
    return
  }
  pwMsg.value = t('profile.pwUpdated')
  currentPw.value = ''
  newPw.value = ''
  confirmPw.value = ''
}

const enrollHistory = [
  { paper: 'TOEIC Listening & Reading — Full Simulation 01', date: 'Oct 28, 2026', status: 'In progress' },
  { paper: 'TOEIC Listening & Reading — Full Simulation 03', date: 'Oct 21, 2026', status: 'Completed' },
  { paper: 'Reading Drill Pack — Parts 5 to 7', date: 'Oct 15, 2026', status: 'Completed' }
]

const tabs = computed(() => [
  { id: 'profile', label: t('profile.myProfile') },
  { id: 'password', label: t('profile.changePassword') },
  { id: 'purchase', label: t('profile.purchaseHistory') },
  { id: 'enroll', label: t('profile.enrollHistory') }
] as const)
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Avatar card -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex items-center gap-5">
      <div class="w-20 h-20 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center shrink-0">
        <img v-if="avatarPreview" :src="avatarPreview" alt="Avatar preview" class="w-full h-full object-cover" />
        <span v-else class="text-2xl font-extrabold text-slate-400 dark:text-slate-500">{{ (name || 'G').slice(0, 1).toUpperCase() }}</span>
      </div>
      <div>
        <h1 class="text-xl font-extrabold text-slate-800 dark:text-slate-200">{{ name || t('profile.yourName') }}</h1>
        <p class="text-sm text-slate-400 dark:text-slate-500">{{ email }}</p>
        <label class="mt-2 inline-block text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-colors">
          {{ t('profile.changeAvatar') }}
          <input type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
        </label>
      </div>
    </div>

    <!-- Tabs -->
    <div class="mt-5 flex gap-2 border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="relative shrink-0 px-4 py-3 text-sm font-semibold"
        :class="activeTab === t.id ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'"
        @click="activeTab = t.id"
      >
        {{ t.label }}
        <span v-if="activeTab === t.id" class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-blue-600" />
      </button>
    </div>

    <!-- My Profile -->
    <div v-if="activeTab === 'profile'" class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <div>
        <label for="profile-email" class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{{ t('profile.email') }}</label>
        <input
          id="profile-email"
          v-model="email"
          type="email"
          disabled
          class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed"
        />
        <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Email cannot be changed.</p>
      </div>
      <div>
        <label for="profile-name" class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{{ t('profile.displayName') }}</label>
        <input
          id="profile-name"
          v-model="name"
          type="text"
          class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div class="flex items-center gap-3">
        <button
          class="text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          @click="saveProfile"
        >
          Save
        </button>
        <p v-if="savedMsg" class="text-sm text-green-600 font-medium">{{ savedMsg }}</p>
      </div>
    </div>

    <!-- Change Password -->
    <div v-if="activeTab === 'password'" class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-4">
      <div>
        <label for="pw-current" class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{{ t('profile.currentPassword') }}</label>
        <input id="pw-current" v-model="currentPw" type="password" autocomplete="current-password" class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label for="pw-new" class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{{ t('profile.newPassword') }}</label>
        <input id="pw-new" v-model="newPw" type="password" autocomplete="new-password" class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div>
        <label for="pw-confirm" class="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{{ t('profile.confirmNewPassword') }}</label>
        <input id="pw-confirm" v-model="confirmPw" type="password" autocomplete="new-password" class="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <p v-if="pwError" class="text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-xl px-3.5 py-2.5">{{ pwError }}</p>
      <p v-if="pwMsg" class="text-sm text-green-600 bg-green-50 dark:bg-green-950/60 rounded-xl px-3.5 py-2.5">{{ pwMsg }}</p>
      <button
        class="text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        @click="changePassword"
      >
        {{ t('profile.updatePassword') }}
      </button>
    </div>

    <!-- Purchase History -->
    <div v-if="activeTab === 'purchase'" class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
      <h2 class="font-bold text-slate-800 dark:text-slate-200">{{ t('profile.creditBalance') }}</h2>
      <div class="mt-3 grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <p class="text-xs font-medium text-amber-700 uppercase tracking-wide">LR Credits</p>
          <p class="text-2xl font-extrabold text-amber-800">12</p>
        </div>
        <div class="rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 p-4">
          <p class="text-xs font-medium text-blue-700 uppercase tracking-wide">SW Credits</p>
          <p class="text-2xl font-extrabold text-blue-800">8</p>
        </div>
      </div>
      <div class="mt-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        {{ t('profile.topupNote') }}
      </div>
      <h3 class="mt-5 font-bold text-slate-800 dark:text-slate-200 text-sm">{{ t('profile.recentPurchases') }}</h3>
      <p class="mt-2 text-sm text-slate-400 dark:text-slate-500">{{ t('profile.noPurchases') }}</p>
    </div>

    <!-- Enroll History -->
    <div v-if="activeTab === 'enroll'" class="mt-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
            <th class="px-5 py-3 font-semibold">{{ t('profile.thPaper') }}</th>
            <th class="px-5 py-3 font-semibold hidden sm:table-cell">{{ t('profile.thDate') }}</th>
            <th class="px-5 py-3 font-semibold text-right">{{ t('profile.thStatus') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="row in enrollHistory" :key="row.paper" class="hover:bg-slate-50 dark:hover:bg-slate-800">
            <td class="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-200">{{ row.paper }}</td>
            <td class="px-5 py-3.5 text-slate-400 dark:text-slate-500 hidden sm:table-cell">{{ row.date }}</td>
            <td class="px-5 py-3.5 text-right">
              <span
                class="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                :class="row.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200' : 'bg-amber-100 text-amber-700'"
              >
                {{ row.status === 'Completed' ? t('papers.statusCompleted') : t('papers.statusInProgress') }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
