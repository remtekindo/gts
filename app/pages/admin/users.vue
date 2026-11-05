<script setup lang="ts">
import { allManagedUsers, addManagedUser, setUserOverride, PACKAGES, type AdminUser } from '~/utils/admin'
import { analyzeAbility, type PartAbility } from '~/utils/adaptive'
import { fetchRealUsers, setUserRole, setUserGrants, type RealUser } from '~/utils/server-auth'
import { getMaterial, ownedMaterials } from '~/data/mock'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const PAGE_SIZE = 15

/* ------------------------------------------------------------------ */
/* Real users (Google sign-in, D1) — grants live here                 */
/* ------------------------------------------------------------------ */

const realUsers = ref<RealUser[]>([])
const realLoading = ref(true)
const realError = ref('')

const selectedReal = ref<RealUser | null>(null)
const editRole = ref<'admin' | 'user'>('user')
const editMaterials = ref<string[]>([])
const editPackages = ref<string[]>([])
const savingReal = ref(false)
const saveRealError = ref('')
const brokenPics = ref(new Set<string>())

/** Google photo URL, unless it failed to load (then the initial shows). */
function hasPic(u: RealUser): boolean {
  return !!u.picture && !brokenPics.value.has(u.sub)
}

function onPicError(u: RealUser): void {
  brokenPics.value = new Set([...brokenPics.value, u.sub])
}

async function refreshReal(): Promise<void> {
  realLoading.value = true
  const list = await fetchRealUsers()
  if (list === null) {
    realError.value = t('admin.users.realLoadError')
    realUsers.value = []
  } else {
    realError.value = ''
    realUsers.value = list
  }
  realLoading.value = false
  if (selectedReal.value) {
    selectedReal.value = realUsers.value.find(u => u.sub === selectedReal.value!.sub) ?? null
  }
}

function accessText(u: RealUser): string {
  if (u.role === 'admin') return t('admin.users.accessAll')
  if (u.access.materials.length === 0) return '—'
  return u.access.materials.map(s => getMaterial(s)?.name ?? s).join(', ')
}

function openReal(u: RealUser): void {
  selectedReal.value = u
  editRole.value = u.role
  editMaterials.value = [...u.grants.materials]
  editPackages.value = [...u.grants.packages]
  saveRealError.value = ''
}

async function saveReal(): Promise<void> {
  if (!selectedReal.value) return
  savingReal.value = true
  saveRealError.value = ''
  const sub = selectedReal.value.sub
  // Bootstrap admins (env allowlist) are always admins — never send a role change for them.
  if (!selectedReal.value.bootstrapAdmin && editRole.value !== selectedReal.value.role) {
    const r = await setUserRole(sub, editRole.value)
    if (!r.ok) {
      saveRealError.value = t('admin.users.saveError')
      savingReal.value = false
      return
    }
  }
  const g = await setUserGrants(sub, editMaterials.value, editPackages.value)
  savingReal.value = false
  if (!g.ok) {
    saveRealError.value = t('admin.users.saveError')
    return
  }
  selectedReal.value = null
  await refreshReal()
}

function fmtDate(v: string | null): string {
  return v ? v.slice(0, 10) : '—'
}

/* ------------------------------------------------------------------ */
/* Demo users (local seed data — NOT real accounts)                    */
/* ------------------------------------------------------------------ */

const users = ref<AdminUser[]>([])
const page = ref(1)
const selected = ref<AdminUser | null>(null)
const editEnds = ref('')
const abilities = ref<PartAbility[]>([])

const showAdd = ref(false)
const fUsername = ref('')
const fPlan = ref('Bulanan')
const fStatus = ref<'active' | 'trial'>('trial')
const fEnds = ref('')
const fPhone = ref('')

function refresh(): void {
  users.value = allManagedUsers()
  if (selected.value) {
    selected.value = users.value.find(u => u.username === selected.value!.username) ?? null
  }
}

const counts = computed(() => ({
  active: users.value.filter(u => u.status === 'active').length,
  expired: users.value.filter(u => u.status === 'expired').length,
  trial: users.value.filter(u => u.status === 'trial').length,
}))

const totalPages = computed(() => Math.max(1, Math.ceil(users.value.length / PAGE_SIZE)))
const pageUsers = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return users.value.slice(start, start + PAGE_SIZE)
})

function openDetail(u: AdminUser): void {
  selected.value = u
  editEnds.value = u.subscriptionEnds
  abilities.value = analyzeAbility('toeic-lr', u.username)
}

function toggleStatus(): void {
  if (!selected.value) return
  const next = selected.value.status === 'active' ? 'expired' : 'active'
  setUserOverride(selected.value.username, { status: next })
  refresh()
}

function saveEnds(): void {
  if (!selected.value || !editEnds.value) return
  setUserOverride(selected.value.username, { subscriptionEnds: editEnds.value })
  refresh()
}

function doAddUser(): void {
  const username = fUsername.value.trim().toLowerCase()
  if (!username) return
  const ends = fEnds.value || new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
  addManagedUser({
    username,
    plan: fPlan.value,
    status: fStatus.value,
    joined: new Date().toISOString().slice(0, 10),
    attempts: 0,
    phone: fPhone.value.replace(/\D/g, '') || '6280000000000',
    subscriptionEnds: ends,
  })
  fUsername.value = ''
  fPhone.value = ''
  showAdd.value = false
  page.value = 1
  refresh()
}

function waLink(u: AdminUser): string {
  const text = encodeURIComponent(`Hi ${u.username}, this is GTS Admin regarding your ${u.plan} subscription.`)
  return `https://wa.me/${u.phone}?text=${text}`
}

function statusClass(s: string): string {
  if (s === 'active') return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
  if (s === 'trial') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
}

onMounted(() => {
  refresh()
  void refreshReal()
})
</script>

<template>
  <div>
    <div>
      <h1 class="text-xl md:text-2xl font-extrabold">{{ t('admin.users.heading') }}</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.users.sub') }}</p>
    </div>

    <!-- Real users (Google sign-in) -->
    <h2 class="mt-6 text-lg font-bold">{{ t('admin.users.realHeading') }}</h2>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.users.realSub') }}</p>

    <p v-if="realLoading" class="mt-4 text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
    <p v-else-if="realError" class="mt-4 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-xl px-3.5 py-2.5">{{ realError }}</p>
    <p v-else-if="realUsers.length === 0" class="mt-4 text-sm text-slate-400 dark:text-slate-500">{{ t('admin.users.realEmpty') }}</p>

    <div v-else class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-[680px]">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colUser') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colRole') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colJoined') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colLastLogin') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colAccess') }}</th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in realUsers" :key="u.sub" class="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2.5">
                  <img v-if="hasPic(u)" :src="u.picture || ''" :alt="u.name || u.email" class="w-8 h-8 rounded-full object-cover shrink-0" @error="onPicError(u)" />
                  <span v-else class="w-8 h-8 rounded-full bg-slate-700 text-white text-xs font-bold flex items-center justify-center shrink-0">{{ (u.name || u.email || 'G').slice(0, 1).toUpperCase() }}</span>
                  <div class="min-w-0">
                    <p class="font-semibold truncate">{{ u.name || u.email }}</p>
                    <p class="text-xs text-slate-400 dark:text-slate-500 truncate">{{ u.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="u.role === 'admin' ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'">
                  {{ u.role === 'admin' ? t('admin.users.roleAdmin') : t('admin.users.roleUser') }}{{ u.bootstrapAdmin ? ' *' : '' }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{{ fmtDate(u.createdAt) }}</td>
              <td class="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{{ fmtDate(u.lastLoginAt) }}</td>
              <td class="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-56 truncate">{{ accessText(u) }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button class="text-xs font-semibold text-blue-600 px-2 py-1" @click="openReal(u)">{{ t('admin.users.detail') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-if="realUsers.some(u => u.bootstrapAdmin)" class="mt-2 text-xs text-slate-400 dark:text-slate-500">* {{ t('admin.users.bootstrapNote') }}</p>

    <!-- Real-user detail + grants modal -->
    <div v-if="selectedReal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-slate-900/70" />
      <div class="relative bg-white dark:bg-slate-800 w-full sm:rounded-2xl sm:max-w-md max-h-[92vh] overflow-y-auto p-5 md:p-6 rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-600">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <img v-if="selectedReal.picture && hasPic(selectedReal)" :src="selectedReal.picture" :alt="selectedReal.name || selectedReal.email" class="w-10 h-10 rounded-full object-cover shrink-0" @error="onPicError(selectedReal)" />
            <span v-else class="w-10 h-10 rounded-full bg-slate-700 text-white text-sm font-bold flex items-center justify-center shrink-0">{{ (selectedReal.name || selectedReal.email || 'G').slice(0, 1).toUpperCase() }}</span>
            <div class="min-w-0">
              <h2 class="font-bold text-lg truncate">{{ selectedReal.name || selectedReal.email }}</h2>
              <p class="text-xs text-slate-400 dark:text-slate-500 truncate">{{ selectedReal.email }}</p>
            </div>
          </div>
          <button class="text-slate-400 hover:text-slate-600 px-2 py-1 shrink-0" @click="selectedReal = null" aria-label="Close">✕</button>
        </div>

        <div class="mt-5 space-y-4">
          <label class="block">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.users.colRole') }}</span>
            <select v-model="editRole" :disabled="selectedReal.bootstrapAdmin" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 disabled:opacity-60">
              <option value="user">{{ t('admin.users.roleUser') }}</option>
              <option value="admin">{{ t('admin.users.roleAdmin') }}</option>
            </select>
            <span v-if="selectedReal.bootstrapAdmin" class="mt-1 block text-xs text-slate-400 dark:text-slate-500">{{ t('admin.users.bootstrapNote') }}</span>
            <span v-else class="mt-1 block text-xs text-slate-400 dark:text-slate-500">{{ t('admin.users.roleHint') }}</span>
          </label>

          <div>
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.users.grantMaterials') }}</p>
            <div class="mt-2 space-y-2">
              <label v-for="m in ownedMaterials()" :key="m.slug" class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                <input v-model="editMaterials" type="checkbox" :value="m.slug" class="w-4 h-4 rounded accent-blue-600" />
                {{ m.name }}
              </label>
            </div>
          </div>

          <div>
            <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.users.grantPackages') }}</p>
            <div class="mt-2 space-y-2">
              <label v-for="p in PACKAGES" :key="p.id" class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                <input v-model="editPackages" type="checkbox" :value="p.id" class="w-4 h-4 rounded accent-blue-600" />
                {{ t(`admin.packages.pkg_${p.id}`) }} · {{ p.priceLabel }}
              </label>
            </div>
            <p class="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{{ t('admin.users.grantPackagesHint') }}</p>
          </div>
        </div>

        <p v-if="saveRealError" class="mt-4 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-xl px-3.5 py-2.5">{{ saveRealError }}</p>
        <button class="mt-4 w-full text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white disabled:opacity-40" :disabled="savingReal" @click="saveReal">
          {{ savingReal ? t('access.loading') : t('admin.users.save') }}
        </button>
      </div>
    </div>

    <!-- Demo users (local seed data — NOT real accounts) -->
    <div class="mt-10 flex items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold">{{ t('admin.users.demoHeading') }}</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.users.demoSub') }}</p>
      </div>
      <button
        class="shrink-0 text-sm font-semibold px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        @click="showAdd = true"
      >+ {{ t('admin.users.addUser') }}</button>
    </div>

    <!-- Status cards -->
    <div class="mt-5 grid grid-cols-3 gap-3">
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <p class="text-xs text-slate-400 uppercase tracking-wide font-semibold">{{ t('admin.users.cardActive') }}</p>
        <p class="mt-1 text-2xl font-extrabold tabular-nums text-green-600 dark:text-green-400">{{ counts.active }}</p>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <p class="text-xs text-slate-400 uppercase tracking-wide font-semibold">{{ t('admin.users.cardExpired') }}</p>
        <p class="mt-1 text-2xl font-extrabold tabular-nums text-slate-400">{{ counts.expired }}</p>
      </div>
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <p class="text-xs text-slate-400 uppercase tracking-wide font-semibold">{{ t('admin.users.cardTrial') }}</p>
        <p class="mt-1 text-2xl font-extrabold tabular-nums text-blue-600 dark:text-blue-400">{{ counts.trial }}</p>
      </div>
    </div>

    <div class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-[620px]">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colUser') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colPlan') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colStatus') }}</th>
              <th class="px-4 py-3 font-semibold">{{ t('admin.users.colEnds') }}</th>
              <th class="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in pageUsers" :key="u.username" class="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td class="px-4 py-3 font-semibold">{{ u.username }}</td>
              <td class="px-4 py-3">{{ u.plan }}</td>
              <td class="px-4 py-3"><span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="statusClass(u.status)">{{ t(`admin.users.st_${u.status}`) }}</span></td>
              <td class="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{{ u.subscriptionEnds }}</td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button class="text-xs font-semibold text-blue-600 px-2 py-1" @click="openDetail(u)">{{ t('admin.users.detail') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
        <button class="text-sm font-semibold text-blue-600 disabled:opacity-40" :disabled="page <= 1" @click="page--">← {{ t('admin.databases.prev') }}</button>
        <span class="text-xs text-slate-500">{{ t('admin.databases.pageOf', { p: page, n: totalPages }) }}</span>
        <button class="text-sm font-semibold text-blue-600 disabled:opacity-40" :disabled="page >= totalPages" @click="page++">{{ t('admin.databases.next') }} →</button>
      </div>
    </div>

    <!-- Add user modal -->
    <div v-if="showAdd" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-slate-900/70" />
      <div class="relative bg-white dark:bg-slate-800 w-full sm:rounded-2xl sm:max-w-md max-h-[92vh] overflow-y-auto p-5 md:p-6 rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-600">
        <div class="flex items-start justify-between gap-3">
          <h2 class="font-bold text-lg">{{ t('admin.users.addUser') }}</h2>
          <button class="text-slate-400 hover:text-slate-600 px-2 py-1" @click="showAdd = false" aria-label="Close">✕</button>
        </div>
        <div class="mt-4 space-y-3">
          <label class="block">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.users.fUsername') }}</span>
            <input v-model="fUsername" type="text" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.users.colPlan') }}</span>
              <select v-model="fPlan" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
                <option>Bulanan</option><option>Triwulanan</option><option>Semesteran</option><option>Free</option>
              </select>
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.users.colStatus') }}</span>
              <select v-model="fStatus" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900">
                <option value="active">{{ t('admin.users.st_active') }}</option>
                <option value="trial">{{ t('admin.users.st_trial') }}</option>
              </select>
            </label>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <label class="block">
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.users.colEnds') }}</span>
              <input v-model="fEnds" type="date" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
            </label>
            <label class="block">
              <span class="text-xs font-semibold text-slate-500 dark:text-slate-400">{{ t('admin.users.colPhone') }}</span>
              <input v-model="fPhone" type="tel" placeholder="628…" class="mt-1 w-full text-sm px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
            </label>
          </div>
        </div>
        <button class="mt-4 w-full text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white disabled:opacity-40" :disabled="!fUsername.trim()" @click="doAddUser">{{ t('admin.users.saveUser') }}</button>
      </div>
    </div>

    <!-- Detail modal -->
    <div v-if="selected" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div class="absolute inset-0 bg-slate-900/70" />
      <div class="relative bg-white dark:bg-slate-800 w-full sm:rounded-2xl sm:max-w-md max-h-[92vh] overflow-y-auto p-5 md:p-6 rounded-t-2xl shadow-2xl border border-slate-200 dark:border-slate-600">
        <div class="flex items-start justify-between gap-3">
          <h2 class="font-bold text-lg">{{ selected.username }}</h2>
          <button class="text-slate-400 hover:text-slate-600 px-2 py-1" @click="selected = null" aria-label="Close">✕</button>
        </div>
        <dl class="mt-4 space-y-2.5 text-sm">
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">{{ t('admin.users.colPlan') }}</dt><dd class="font-semibold">{{ selected.plan }}</dd></div>
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">{{ t('admin.users.colStatus') }}</dt><dd><span class="text-xs font-bold px-2 py-0.5 rounded-full" :class="statusClass(selected.status)">{{ t(`admin.users.st_${selected.status}`) }}</span></dd></div>
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">{{ t('admin.users.colJoined') }}</dt><dd>{{ selected.joined }}</dd></div>
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">{{ t('admin.users.colAttempts') }}</dt><dd class="tabular-nums">{{ selected.attempts }}</dd></div>
          <div class="flex justify-between items-center"><dt class="text-slate-500 dark:text-slate-400">{{ t('admin.users.colEnds') }}</dt>
            <dd class="flex items-center gap-1.5">
              <input v-model="editEnds" type="date" class="text-xs px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
              <button class="text-xs font-semibold text-blue-600 px-2 py-1" @click="saveEnds">{{ t('admin.users.save') }}</button>
            </dd>
          </div>
          <div class="flex justify-between"><dt class="text-slate-500 dark:text-slate-400">{{ t('admin.users.colPhone') }}</dt><dd class="font-mono text-xs">+{{ selected.phone }}</dd></div>
        </dl>

        <div class="mt-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3.5">
          <p class="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ t('admin.users.abilityTitle') }}</p>
          <p v-if="abilities.every(a => a.answered === 0)" class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{{ t('admin.users.abilityEmpty') }}</p>
          <template v-else>
            <AdminRadarChart
              class="my-2"
              :labels="abilities.map(a => `P${a.part}`)"
              :values="abilities.map(a => a.accuracy ?? 0)"
            />
            <ul class="mt-2 space-y-2">
            <li v-for="a in abilities" :key="a.part">
              <div class="flex items-center justify-between text-xs">
                <span class="font-semibold">Part {{ a.part }} <span class="font-normal text-slate-400">· {{ a.answered }}</span></span>
                <span class="font-bold" :class="a.accuracy !== null && a.accuracy < 0.5 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'">
                  {{ a.accuracy === null ? '—' : Math.round(a.accuracy * 100) + '%' }} · L{{ a.level }}
                </span>
              </div>
              <div class="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  class="h-full rounded-full"
                  :class="a.accuracy !== null && a.accuracy >= 0.8 ? 'bg-green-500' : a.accuracy !== null && a.accuracy < 0.5 ? 'bg-red-400' : 'bg-blue-500'"
                  :style="{ width: (a.accuracy === null ? 0 : Math.round(a.accuracy * 100)) + '%' }"
                />
              </div>
            </li>
          </ul>
          </template>
        </div>

        <div class="mt-5 flex flex-col sm:flex-row gap-2">
          <button
            class="flex-1 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-colors"
            :class="selected.status === 'active' ? 'border-red-300 dark:border-red-800 text-red-600 dark:text-red-300' : 'border-green-300 dark:border-green-800 text-green-700 dark:text-green-300'"
            @click="toggleStatus"
          >
            {{ selected.status === 'active' ? t('admin.users.deactivate') : t('admin.users.activate') }}
          </button>
          <a
            :href="waLink(selected)"
            target="_blank"
            rel="noopener"
            class="flex-1 text-center text-sm font-semibold px-4 py-2.5 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            {{ t('admin.users.whatsapp') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
