<script setup lang="ts">
import { MATERIALS } from '~/data/mock'
import { fetchSessionState, logoutServer } from '~/utils/server-auth'
import { formatPriceIdr } from '~/utils/pricing'
import { useTheme } from '~/composables/useTheme'

const { t, locale, setLocale } = useLocale()
const { theme, setTheme } = useTheme()
const router = useRouter()

/**
 * Profil in v2: the account is what the server session says it is —
 * real Google name + email (the old page showed "Your Name" with a
 * blank email for Google users, because it read a localStorage mirror
 * that was never filled). Settings (language, theme, sign out) live
 * here, plus the admin link for admins and a "Ganti materi" link
 * back to the picker. "Pesanan Saya" lists the user's real orders
 * from GET /api/orders/mine (package → checkout → approve flow);
 * an order stays "Menunggu pembayaran" until an admin approves it,
 * and only then do its materials open.
 */
const name = ref('')
const email = ref('')
const picture = ref<string | null>(null)
const isAdmin = ref(false)

/** Real enrollments: effective materials from the server session
 * (grants + packages, resolved server-side) with the real grant date
 * where a grant row exists. No hardcoded rows, no seed history — a
 * user with no grants sees the empty state. Role-based access (the
 * bootstrap admin) is not a grant, so its rows carry no date. */
interface EnrollRow {
  slug: string
  name: string
  date: string
  status: 'Active'
}
const enrollRows = ref<EnrollRow[]>([])
const enrollLoaded = ref(false)

function formatGrantDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(locale.value === 'id' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Materials a package grant covers (server default mapping — see
 * server/utils/catalog.ts): Monthly 1, Quarterly 2, Semester all. */
function packageSlugs(pkgId: string): string[] {
  const owned = MATERIALS.filter(m => m.status === 'owned').map(m => m.slug)
  if (pkgId === 'semesteran') return owned
  if (pkgId === 'triwulanan') return owned.slice(0, 2)
  return owned.slice(0, 1)
}

async function loadEnrollments(): Promise<void> {
  const state = await fetchSessionState()
  let grants: { kind: string, target: string, grantedAt: string }[] = []
  try {
    const res = await $fetch<{ grants: { kind: string, target: string, grantedAt: string }[] }>('/api/profile/enrollments')
    grants = res.grants
  } catch {
    grants = []
  }
  enrollRows.value = state.materials.map((slug) => {
    const m = MATERIALS.find(x => x.slug === slug)
    const direct = grants.find(g => g.kind === 'material' && g.target === slug)
    const viaPackage = direct ? null : grants.find(g => g.kind === 'package' && packageSlugs(g.target).includes(slug))
    const grant = direct ?? viaPackage
    return {
      slug,
      name: m?.name ?? slug,
      date: grant ? formatGrantDate(grant.grantedAt) : '—',
      status: 'Active' as const
    }
  })
  enrollLoaded.value = true
}

/** Real orders from GET /api/orders/mine — no fake rows, honest
 * empty state when the user has never ordered. */
interface OrderRow {
  id: string
  package: string
  materials: string[]
  price: number
  durationMonths: number
  status: 'pending_payment' | 'proof_uploaded' | 'active' | 'cancelled' | 'expired'
  createdAt: string
}
const orderRows = ref<OrderRow[]>([])
const ordersLoaded = ref(false)

function packageName(id: string): string {
  if (id === 'bulanan') return t('landing.planMonthly')
  if (id === 'triwulanan') return t('landing.planQuarterly')
  return t('landing.planSemiannual')
}

function orderStatusLabel(status: OrderRow['status']): string {
  if (status === 'active') return t('profile.statusActive')
  if (status === 'cancelled') return t('profile.statusCancelled')
  if (status === 'expired') return t('profile.statusExpired')
  if (status === 'proof_uploaded') return t('profile.statusProof')
  return t('profile.statusPending')
}

function orderStatusClass(status: OrderRow['status']): string {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
  if (status === 'cancelled' || status === 'expired') return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  if (status === 'proof_uploaded') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
}

async function loadOrders(): Promise<void> {
  try {
    const res = await $fetch<{ orders: OrderRow[] }>('/api/orders/mine')
    orderRows.value = res.orders
  } catch {
    orderRows.value = []
  }
  ordersLoaded.value = true
}

async function signOut(): Promise<void> {
  await logoutServer()
  clearAuth()
  router.push('/auth')
}

onMounted(async () => {
  const state = await fetchSessionState()
  if (!state.username) { router.replace('/auth'); return }
  name.value = state.name ?? state.email ?? ''
  email.value = state.email ?? ''
  picture.value = state.picture
  isAdmin.value = state.admin
  await loadEnrollments()
  await loadOrders()
})
</script>

<template>
  <div class="max-w-3xl mx-auto">
    <!-- Account: real Google identity from the server session. -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex items-center gap-5">
      <div class="w-20 h-20 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center shrink-0">
        <img v-if="picture" :src="picture" alt="Avatar" class="w-full h-full object-cover" />
        <span v-else class="text-2xl font-extrabold text-slate-400 dark:text-slate-500">{{ (name || 'G').slice(0, 1).toUpperCase() }}</span>
      </div>
      <div class="min-w-0">
        <h1 class="text-xl font-extrabold text-slate-800 dark:text-slate-200 truncate">{{ name || email }}</h1>
        <p class="text-sm text-slate-400 dark:text-slate-500 truncate">{{ email }}</p>
        <p class="mt-1 text-xs text-slate-400 dark:text-slate-500">{{ t('profile.emailNote') }}</p>
      </div>
    </div>

    <!-- Riwayat Materi — real grants only (see loadEnrollments). -->
    <h2 class="mt-8 text-lg font-bold text-slate-900 dark:text-slate-100">{{ t('profile.materialHistory') }}</h2>
    <div class="mt-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <p v-if="!enrollLoaded" class="px-5 py-6 text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
      <p v-else-if="enrollRows.length === 0" class="px-5 py-6 text-sm text-slate-400 dark:text-slate-500">{{ t('profile.noEnrollments') }}</p>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
            <th class="px-5 py-3 font-semibold">{{ t('profile.thMaterial') }}</th>
            <th class="px-5 py-3 font-semibold hidden sm:table-cell">{{ t('profile.thDate') }}</th>
            <th class="px-5 py-3 font-semibold text-right">{{ t('profile.thStatus') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="row in enrollRows" :key="row.slug" class="hover:bg-slate-50 dark:hover:bg-slate-800">
            <td class="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-200">{{ row.name }}</td>
            <td class="px-5 py-3.5 text-slate-400 dark:text-slate-500 hidden sm:table-cell">{{ row.date }}</td>
            <td class="px-5 py-3.5 text-right">
              <span class="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                {{ t('profile.statusActive') }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pesanan Saya — real orders only (see loadOrders). -->
    <h2 class="mt-8 text-lg font-bold text-slate-900 dark:text-slate-100">{{ t('profile.myOrders') }}</h2>
    <div class="mt-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <p v-if="!ordersLoaded" class="px-5 py-6 text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
      <p v-else-if="orderRows.length === 0" class="px-5 py-6 text-sm text-slate-400 dark:text-slate-500">{{ t('profile.noOrders') }}</p>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
            <th class="px-5 py-3 font-semibold">{{ t('profile.thPackage') }}</th>
            <th class="px-5 py-3 font-semibold hidden sm:table-cell">{{ t('profile.thDate') }}</th>
            <th class="px-5 py-3 font-semibold text-right">{{ t('profile.thPrice') }}</th>
            <th class="px-5 py-3 font-semibold text-right">{{ t('profile.thStatus') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="row in orderRows" :key="row.id" class="hover:bg-slate-50 dark:hover:bg-slate-800">
            <td class="px-5 py-3.5">
              <p class="font-medium text-slate-700 dark:text-slate-200">{{ packageName(row.package) }}</p>
              <p class="text-xs text-slate-400 dark:text-slate-500">{{ row.materials.map(s => MATERIALS.find(m => m.slug === s)?.name ?? s).join(', ') }}</p>
              <NuxtLink
                v-if="row.status === 'pending_payment' || row.status === 'proof_uploaded'"
                :to="`/checkout?order=${row.id}`"
                class="mt-1 inline-block text-xs font-semibold text-blue-600 dark:text-blue-300 hover:underline"
              >
                {{ t('profile.continuePayment') }}
              </NuxtLink>
            </td>
            <td class="px-5 py-3.5 text-slate-400 dark:text-slate-500 hidden sm:table-cell">{{ formatGrantDate(row.createdAt) }}</td>
            <td class="px-5 py-3.5 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{{ formatPriceIdr(row.price) }}</td>
            <td class="px-5 py-3.5 text-right">
              <span class="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" :class="orderStatusClass(row.status)">
                {{ orderStatusLabel(row.status) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Settings -->
    <h2 class="mt-8 text-lg font-bold text-slate-900 dark:text-slate-100">{{ t('profile.settingsTitle') }}</h2>
    <div class="mt-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-5">
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-medium text-slate-600 dark:text-slate-300">{{ t('profile.language') }}</span>
        <div class="flex items-center rounded-full border border-slate-300 dark:border-slate-600 overflow-hidden text-xs font-semibold" role="group" aria-label="Language">
          <button
            type="button"
            class="px-3 py-1.5 transition-colors"
            :class="locale === 'id' ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'"
            :aria-pressed="locale === 'id'"
            @click="setLocale('id')"
          >
            ID
          </button>
          <button
            type="button"
            class="px-3 py-1.5 transition-colors"
            :class="locale === 'en' ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'"
            :aria-pressed="locale === 'en'"
            @click="setLocale('en')"
          >
            EN
          </button>
        </div>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm font-medium text-slate-600 dark:text-slate-300">{{ t('profile.theme') }}</span>
        <div class="flex items-center rounded-full border border-slate-300 dark:border-slate-600 overflow-hidden text-xs font-semibold" role="group" aria-label="Theme">
          <button
            type="button"
            class="px-3 py-1.5 transition-colors"
            :class="theme === 'light' ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'"
            :aria-pressed="theme === 'light'"
            @click="setTheme('light')"
          >
            {{ t('profile.light') }}
          </button>
          <button
            type="button"
            class="px-3 py-1.5 transition-colors"
            :class="theme === 'dark' ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'"
            :aria-pressed="theme === 'dark'"
            @click="setTheme('dark')"
          >
            {{ t('profile.dark') }}
          </button>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3 pt-1">
        <NuxtLink
          v-if="isAdmin"
          to="/admin"
          class="text-sm font-semibold px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          {{ t('profile.adminPanel') }}
        </NuxtLink>
        <NuxtLink
          to="/materials"
          class="text-sm font-semibold px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          {{ t('nav.changeMaterial') }}
        </NuxtLink>
        <button
          class="text-sm font-semibold px-5 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
          @click="signOut"
        >
          {{ t('nav.signOut') }}
        </button>
      </div>
    </div>
  </div>
</template>
