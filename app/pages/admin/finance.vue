<script setup lang="ts">
import { formatPriceIdr } from '~/utils/pricing'
import { getMaterial } from '~/data/mock'
import { compressImageFile, dataUrlBytes } from '~/utils/image'

definePageMeta({ layout: 'admin' })

const { t, locale } = useLocale()

/**
 * Admin → Finance: payments, two tabs, plus the QRIS setting.
 *
 * - "Pembayaran Terpending": orders still waiting — `pending_payment`
 *   (no proof yet), `proof_uploaded` (proof in, needs verification),
 *   and `expired` (the 1-hour window passed; computed on read, never
 *   stored). Each row shows the buyer, package, materials, price,
 *   order time, the live countdown (or "Kedaluwarsa"), and the proof
 *   thumbnail when one exists (click → full-size view).
 * - "Pembayaran Lunas": `active` orders (verified + paid), with the
 *   activation date.
 *
 * "Verifikasi & Aktifkan" flips the order to `active` and creates
 * the material grants (server-side, deduped). When the order has no
 * proof yet the admin is asked to confirm first — verifying an
 * unpaid order is a deliberate choice, not a misclick. "Batalkan"
 * cancels a pending/proof order with no grants.
 *
 * "Pengaturan QRIS": the merchant QRIS image buyers scan on the
 * checkout page. Stored base64 in the `settings` table
 * (`qris_image`) and served publicly — a merchant QR is public by
 * nature. Until one is set, checkout shows an honest placeholder.
 */
type OrderStatus = 'pending_payment' | 'proof_uploaded' | 'active' | 'cancelled' | 'expired'

interface AdminOrder {
  id: string
  userSub: string
  package: string
  materials: string[]
  price: number
  currency: string
  durationMonths: number
  status: OrderStatus
  createdAt: string
  expiresAt: string | null
  activatedAt: string | null
  proofImage: string | null
  proofUploadedAt: string | null
  userEmail?: string | null
  userName?: string | null
}

const orders = ref<AdminOrder[]>([])
const loading = ref(true)
const error = ref('')
const busyId = ref<string | null>(null)
const actionError = ref('')

const tab = ref<'pending' | 'paid'>('pending')
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | null = null

/** Full-size proof viewer (null = closed). */
const proofView = ref<string | null>(null)

/* QRIS setting */
const qrisImage = ref<string | null>(null)
const qrisLoaded = ref(false)
const qrisInput = ref<HTMLInputElement | null>(null)
const qrisSaving = ref(false)
const qrisError = ref('')

const pendingOrders = computed(() => orders.value.filter(o => o.status === 'pending_payment' || o.status === 'proof_uploaded' || o.status === 'expired'))
const paidOrders = computed(() => orders.value.filter(o => o.status === 'active'))

function packageName(id: string): string {
  if (id === 'bulanan') return t('landing.planMonthly')
  if (id === 'triwulanan') return t('landing.planQuarterly')
  return t('landing.planSemiannual')
}

function statusLabel(status: OrderStatus): string {
  if (status === 'active') return t('admin.finance.statusActive')
  if (status === 'cancelled') return t('admin.finance.statusCancelled')
  if (status === 'expired') return t('admin.finance.statusExpired')
  if (status === 'proof_uploaded') return t('admin.finance.statusProof')
  return t('admin.finance.statusPending')
}

function statusClass(status: OrderStatus): string {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
  if (status === 'cancelled' || status === 'expired') return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
  if (status === 'proof_uploaded') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(locale.value === 'id' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Live countdown for a pending order (hh:mm:ss), or null when it has no window. */
function countdownFor(o: AdminOrder): string | null {
  if (o.status !== 'pending_payment' || !o.expiresAt) return null
  const ms = Date.parse(o.expiresAt) - now.value
  if (ms <= 0) return '00:00:00'
  const total = Math.floor(ms / 1000)
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

async function refresh(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ orders: AdminOrder[] }>('/api/admin/orders')
    orders.value = res.orders
  } catch {
    error.value = t('admin.finance.loadError')
    orders.value = []
  }
  loading.value = false
}

async function verify(id: string, hasProof: boolean): Promise<void> {
  if (!hasProof && !window.confirm(t('admin.finance.verifyNoProofConfirm'))) return
  busyId.value = id
  actionError.value = ''
  try {
    await $fetch('/api/admin/orders/approve', { method: 'POST', body: { id } })
    await refresh()
  } catch {
    actionError.value = t('admin.finance.actionError')
  }
  busyId.value = null
}

async function cancel(id: string): Promise<void> {
  busyId.value = id
  actionError.value = ''
  try {
    await $fetch('/api/admin/orders/cancel', { method: 'POST', body: { id } })
    await refresh()
  } catch {
    actionError.value = t('admin.finance.actionError')
  }
  busyId.value = null
}

async function loadQris(): Promise<void> {
  try {
    const res = await $fetch<{ image: string | null }>('/api/settings/qris')
    qrisImage.value = res.image
  } catch {
    qrisImage.value = null
  }
  qrisLoaded.value = true
}

function pickQris(): void {
  qrisError.value = ''
  qrisInput.value?.click()
}

async function onQrisPicked(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || qrisSaving.value) return
  qrisSaving.value = true
  qrisError.value = ''
  try {
    const dataUrl = await compressImageFile(file)
    if (dataUrlBytes(dataUrl) > 500 * 1024) {
      qrisError.value = t('admin.finance.qrisTooLarge')
      return
    }
    const res = await $fetch<{ image: string | null }>('/api/admin/settings/qris', { method: 'POST', body: { image: dataUrl } })
    qrisImage.value = res.image
  } catch {
    qrisError.value = t('admin.finance.qrisFailed')
  }
  qrisSaving.value = false
}

async function clearQris(): Promise<void> {
  qrisSaving.value = true
  qrisError.value = ''
  try {
    const res = await $fetch<{ image: string | null }>('/api/admin/settings/qris', { method: 'POST', body: { image: null } })
    qrisImage.value = res.image
  } catch {
    qrisError.value = t('admin.finance.qrisFailed')
  }
  qrisSaving.value = false
}

onMounted(() => {
  clock = setInterval(() => { now.value = Date.now() }, 1000)
  void refresh()
  void loadQris()
})

onUnmounted(() => {
  if (clock) clearInterval(clock)
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{{ t('admin.finance.heading') }}</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.finance.sub') }}</p>

    <!-- Tabs -->
    <div class="mt-6 flex gap-2" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'pending'"
        class="text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        :class="tab === 'pending' ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400'"
        @click="tab = 'pending'"
      >
        {{ t('admin.finance.tabPending') }} ({{ pendingOrders.length }})
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="tab === 'paid'"
        class="text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        :class="tab === 'paid' ? 'bg-blue-600 text-white' : 'border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-blue-400'"
        @click="tab = 'paid'"
      >
        {{ t('admin.finance.tabPaid') }} ({{ paidOrders.length }})
      </button>
    </div>

    <!-- Pending tab -->
    <div v-if="tab === 'pending'" class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <p v-if="loading" class="px-5 py-6 text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
      <p v-else-if="error" class="px-5 py-6 text-sm text-red-600 dark:text-red-300">{{ error }}</p>
      <p v-else-if="pendingOrders.length === 0" class="px-5 py-6 text-sm text-slate-400 dark:text-slate-500">{{ t('admin.finance.emptyPending') }}</p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm min-w-[820px]">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th class="px-5 py-3 font-semibold">{{ t('admin.finance.thUser') }}</th>
              <th class="px-5 py-3 font-semibold">{{ t('admin.finance.thPackage') }}</th>
              <th class="px-5 py-3 font-semibold">{{ t('admin.finance.thPrice') }}</th>
              <th class="px-5 py-3 font-semibold">{{ t('admin.finance.thDate') }}</th>
              <th class="px-5 py-3 font-semibold">{{ t('admin.finance.thProof') }}</th>
              <th class="px-5 py-3 font-semibold">{{ t('admin.finance.thStatus') }}</th>
              <th class="px-5 py-3 font-semibold text-right">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="o in pendingOrders" :key="o.id" class="hover:bg-slate-50 dark:hover:bg-slate-800">
              <td class="px-5 py-3.5">
                <p class="font-medium text-slate-700 dark:text-slate-200">{{ o.userName || o.userEmail || o.userSub }}</p>
                <p v-if="o.userName" class="text-xs text-slate-400 dark:text-slate-500">{{ o.userEmail }}</p>
                <p class="text-xs font-mono text-slate-400 dark:text-slate-500">{{ o.id }}</p>
              </td>
              <td class="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-200">
                {{ packageName(o.package) }}
                <span class="block text-xs text-slate-400 dark:text-slate-500">{{ o.materials.map(s => getMaterial(s)?.name ?? s).join(', ') }}</span>
              </td>
              <td class="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{{ formatPriceIdr(o.price) }}</td>
              <td class="px-5 py-3.5 text-slate-400 dark:text-slate-500 whitespace-nowrap">
                {{ formatDate(o.createdAt) }}
                <span v-if="countdownFor(o)" class="block font-mono text-xs text-amber-700 dark:text-amber-300">{{ countdownFor(o) }}</span>
                <span v-else-if="o.status === 'expired'" class="block text-xs">{{ t('admin.finance.expiredAt') }}</span>
              </td>
              <td class="px-5 py-3.5">
                <button v-if="o.proofImage" type="button" class="block w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-blue-500 transition" @click="proofView = o.proofImage">
                  <img :src="o.proofImage" alt="Bukti bayar" class="w-full h-full object-cover" />
                </button>
                <span v-else class="text-xs text-slate-400 dark:text-slate-500">—</span>
              </td>
              <td class="px-5 py-3.5">
                <span class="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" :class="statusClass(o.status)">
                  {{ statusLabel(o.status) }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-right">
                <div v-if="o.status === 'pending_payment' || o.status === 'proof_uploaded'" class="flex flex-col sm:flex-row gap-2 justify-end">
                  <button
                    class="text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                    :disabled="busyId === o.id"
                    @click="verify(o.id, !!o.proofImage)"
                  >
                    {{ t('admin.finance.verify') }}
                  </button>
                  <button
                    class="text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
                    :disabled="busyId === o.id"
                    @click="cancel(o.id)"
                  >
                    {{ t('admin.finance.cancel') }}
                  </button>
                </div>
                <span v-else class="text-xs text-slate-400 dark:text-slate-500">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Paid tab -->
    <div v-if="tab === 'paid'" class="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <p v-if="loading" class="px-5 py-6 text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
      <p v-else-if="error" class="px-5 py-6 text-sm text-red-600 dark:text-red-300">{{ error }}</p>
      <p v-else-if="paidOrders.length === 0" class="px-5 py-6 text-sm text-slate-400 dark:text-slate-500">{{ t('admin.finance.emptyPaid') }}</p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm min-w-[720px]">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th class="px-5 py-3 font-semibold">{{ t('admin.finance.thUser') }}</th>
              <th class="px-5 py-3 font-semibold">{{ t('admin.finance.thPackage') }}</th>
              <th class="px-5 py-3 font-semibold">{{ t('admin.finance.thPrice') }}</th>
              <th class="px-5 py-3 font-semibold">{{ t('admin.finance.thActivated') }}</th>
              <th class="px-5 py-3 font-semibold">{{ t('admin.finance.thStatus') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
            <tr v-for="o in paidOrders" :key="o.id" class="hover:bg-slate-50 dark:hover:bg-slate-800">
              <td class="px-5 py-3.5">
                <p class="font-medium text-slate-700 dark:text-slate-200">{{ o.userName || o.userEmail || o.userSub }}</p>
                <p v-if="o.userName" class="text-xs text-slate-400 dark:text-slate-500">{{ o.userEmail }}</p>
                <p class="text-xs font-mono text-slate-400 dark:text-slate-500">{{ o.id }}</p>
              </td>
              <td class="px-5 py-3.5 font-medium text-slate-700 dark:text-slate-200">
                {{ packageName(o.package) }}
                <span class="block text-xs text-slate-400 dark:text-slate-500">{{ o.materials.map(s => getMaterial(s)?.name ?? s).join(', ') }}</span>
              </td>
              <td class="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{{ formatPriceIdr(o.price) }}</td>
              <td class="px-5 py-3.5 text-slate-400 dark:text-slate-500 whitespace-nowrap">{{ o.activatedAt ? formatDate(o.activatedAt) : '—' }}</td>
              <td class="px-5 py-3.5">
                <span class="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" :class="statusClass(o.status)">
                  {{ statusLabel(o.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p v-if="actionError" class="mt-3 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-xl px-3.5 py-2.5">{{ actionError }}</p>

    <!-- QRIS setting -->
    <h2 class="mt-8 text-lg font-bold text-slate-900 dark:text-slate-100">{{ t('admin.finance.qrisHeading') }}</h2>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('admin.finance.qrisSub') }}</p>
    <div class="mt-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col sm:flex-row items-start gap-5">
      <div class="w-40 h-40 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
        <img v-if="qrisImage" :src="qrisImage" alt="QRIS" class="w-full h-full object-contain" />
        <p v-else-if="qrisLoaded" class="px-4 text-center text-sm text-slate-400 dark:text-slate-500">{{ t('admin.finance.qrisEmpty') }}</p>
        <p v-else class="px-4 text-center text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
      </div>
      <div class="flex-1">
        <div class="flex flex-wrap gap-3">
          <button
            class="text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            :disabled="qrisSaving"
            @click="pickQris"
          >
            {{ qrisSaving ? t('access.loading') : t('admin.finance.qrisUpload') }}
          </button>
          <button
            v-if="qrisImage"
            class="text-sm font-semibold px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
            :disabled="qrisSaving"
            @click="clearQris"
          >
            {{ t('admin.finance.qrisRemove') }}
          </button>
        </div>
        <p v-if="qrisError" class="mt-3 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-xl px-3.5 py-2.5">{{ qrisError }}</p>
        <input ref="qrisInput" type="file" accept="image/*" class="hidden" @change="onQrisPicked" />
      </div>
    </div>

    <!-- Full-size proof viewer -->
    <div
      v-if="proofView"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4"
      role="dialog"
      aria-modal="true"
      @click.self="proofView = null"
    >
      <div class="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-slate-900 dark:text-slate-100">{{ t('admin.finance.proofViewTitle') }}</h2>
          <button class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl leading-none px-2 py-1" :aria-label="t('common.close')" @click="proofView = null">×</button>
        </div>
        <img :src="proofView" alt="Bukti bayar" class="mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-700" />
      </div>
    </div>
  </div>
</template>
