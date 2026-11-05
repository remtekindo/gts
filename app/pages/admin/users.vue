<script setup lang="ts">
import { PACKAGES } from '~/utils/admin'
import { fetchRealUsers, setUserRole, setUserGrants, type RealUser } from '~/utils/server-auth'
import { getMaterial, ownedMaterials } from '~/data/mock'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

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


onMounted(() => {
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
  </div>
</template>
