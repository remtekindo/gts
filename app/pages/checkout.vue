<script setup lang="ts">
import { MATERIALS } from '~/data/mock'
import { PACKAGES, formatPriceIdr, getPackage, requiredMaterialCount, type PackageId } from '~/utils/pricing'
import { fetchSessionState, loginWithGoogle } from '~/utils/server-auth'
import { postLoginPath } from '~/utils/navigation'
import { compressImageFile, dataUrlBytes } from '~/utils/image'

/**
 * Checkout — package first, login only at the Checkout button, QRIS
 * after the order.
 *
 * A guest opens this page straight from a landing pricing card
 * (`/checkout?package=bulanan`): no session, no redirect, no login
 * wall. They pick a package (or change it here), pick the materials
 * the package covers (Bulanan exactly 1, Triwulanan exactly 2,
 * Semesteran all owned materials), and press "Lanjut ke Pembayaran".
 *
 * THE LOGIN GATE IS ONLY THAT BUTTON — and it is a modal, not a
 * redirect: "Masuk untuk melanjutkan" with one "Masuk dengan
 * Google" button (the existing GIS popup flow). On success the
 * modal closes and the order is created automatically from the
 * preserved draft. Closing the modal leaves the user on the
 * checkout page with the draft intact — no login is forced.
 *
 * After the order exists the page shows the QRIS screen: the amount,
 * a live 1-hour countdown (expires_at = created + 3600s), the
 * merchant QR image (from the admin's QRIS setting — an honest
 * placeholder when none is configured, never a fake QR), and an
 * "Unggah bukti bayar" button (normal file dialog, image
 * compressed client-side first). Uploading the proof flips the
 * order to `proof_uploaded` and shows: "Terima kasih sudah
 * melakukan pembayaran, akan segera diverifikasi admin." An admin
 * verifies it on Admin → Finance, which activates the order and
 * creates the grants. There is no payment gateway: QRIS here is a
 * static merchant QR plus a manual proof upload.
 */
definePageMeta({ layout: false })

const { t, locale } = useLocale()
const route = useRoute()
const router = useRouter()

const DRAFT_KEY = 'gts_checkout_draft'

interface CheckoutDraft {
  package: string
  materials: string[]
}

type OrderStatus = 'pending_payment' | 'proof_uploaded' | 'active' | 'cancelled' | 'expired'

interface OrderView {
  id: string
  package: string
  materials: string[]
  price: number
  durationMonths: number
  status: OrderStatus
  createdAt: string
  expiresAt: string | null
  activatedAt: string | null
}

const ownedMaterials = computed(() => MATERIALS.filter(m => m.status === 'owned'))
const signedIn = ref(false)
const dashboardTo = ref('/auth')

const pkgId = ref<PackageId | null>(null)
const selected = ref<string[]>([])
const order = ref<OrderView | null>(null)
const submitting = ref(false)
const error = ref('')
const loadingOrder = ref(false)

/** Live clock for the QRIS countdown (1s tick). */
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | null = null

/** Merchant QRIS image (public setting) — null when not configured. */
const qrisImage = ref<string | null>(null)
const qrisLoaded = ref(false)

/* ------------------------------------------------------------------ */
/* Login modal (GIS popup — the only login gate in this flow)          */
/* ------------------------------------------------------------------ */

const loginModalOpen = ref(false)
const googleBtn = ref<HTMLElement | null>(null)
const googleReady = ref(false)
const loginError = ref('')

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
  loginError.value = ''
  const r = await loginWithGoogle(res.credential, false)
  if (!r.ok) {
    loginError.value = t('checkout.loginFailed')
    return
  }
  const s = r.session
  setAuth({ username: s.email ?? '', remember: false, role: s.role, name: s.name ?? undefined, picture: s.picture ?? undefined })
  if (s.name) setDisplayName(s.name)
  signedIn.value = true
  dashboardTo.value = postLoginPath()
  loginModalOpen.value = false
  // Continue the flow the user started: create the order now.
  await createOrder()
}

function initGoogle(clientId: string): void {
  const id = gis()
  if (!id || !googleBtn.value) return
  id.initialize({ client_id: clientId, callback: (res) => { void handleCredential(res) }, auto_select: false })
  id.renderButton(googleBtn.value, { theme: 'outline', size: 'large', width: 280 })
  googleReady.value = true
}

async function openLoginModal(): Promise<void> {
  loginModalOpen.value = true
  loginError.value = ''
  googleReady.value = false
  await nextTick()
  if (gis()) {
    // GIS already loaded (e.g. visited /auth earlier) — client id
    // comes from the server so it can rotate without a rebuild.
    try {
      const cfg = await $fetch<{ clientId: string | null }>('/api/auth/config')
      if (cfg.clientId) initGoogle(cfg.clientId)
      else loginError.value = t('checkout.loginUnavailable')
    } catch {
      loginError.value = t('checkout.loginUnavailable')
    }
    return
  }
  // Already appended on an earlier modal open (still loading)? Then
  // its onload handler will init the button — do not append twice.
  if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) return
  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.defer = true
  script.onload = async () => {
    try {
      const cfg = await $fetch<{ clientId: string | null }>('/api/auth/config')
      if (cfg.clientId) initGoogle(cfg.clientId)
      else loginError.value = t('checkout.loginUnavailable')
    } catch {
      loginError.value = t('checkout.loginUnavailable')
    }
  }
  script.onerror = () => { loginError.value = t('checkout.loginUnavailable') }
  document.head.appendChild(script)
}

function closeLoginModal(): void {
  // Stay on the checkout page — the draft is preserved, no login forced.
  loginModalOpen.value = false
}

/* ------------------------------------------------------------------ */
/* Draft (package + materials in the URL query + localStorage)         */
/* ------------------------------------------------------------------ */

function packageName(id: string): string {
  if (id === 'bulanan') return t('landing.planMonthly')
  if (id === 'triwulanan') return t('landing.planQuarterly')
  return t('landing.planSemiannual')
}

function materialName(slug: string): string {
  return MATERIALS.find(m => m.slug === slug)?.name ?? slug
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(locale.value === 'id' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function readDraft(): CheckoutDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CheckoutDraft>
    if (typeof parsed.package !== 'string') return null
    return { package: parsed.package, materials: Array.isArray(parsed.materials) ? parsed.materials.filter((s): s is string => typeof s === 'string') : [] }
  } catch {
    return null
  }
}

function checkoutUrl(): string {
  const q = new URLSearchParams()
  if (pkgId.value) q.set('package', pkgId.value)
  if (selected.value.length > 0) q.set('materials', selected.value.join(','))
  const s = q.toString()
  return s ? `/checkout?${s}` : '/checkout'
}

/** Keep the URL query + localStorage draft in step with the form. */
function persist(): void {
  try {
    if (pkgId.value) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ package: pkgId.value, materials: selected.value } satisfies CheckoutDraft))
    } else {
      localStorage.removeItem(DRAFT_KEY)
    }
  } catch {
    /* storage unavailable — the URL query still carries the draft */
  }
  void router.replace(checkoutUrl())
}

function applyDraft(draft: CheckoutDraft): void {
  const p = getPackage(draft.package)
  if (!p) return
  pkgId.value = p.id
  if (p.materialLimit === 'all') {
    selected.value = ownedMaterials.value.map(m => m.slug)
  } else {
    selected.value = draft.materials.filter(s => ownedMaterials.value.some(m => m.slug === s)).slice(0, p.materialLimit)
  }
}

function selectPackage(id: PackageId): void {
  pkgId.value = id
  const p = getPackage(id) as NonNullable<ReturnType<typeof getPackage>>
  selected.value = p.materialLimit === 'all' ? ownedMaterials.value.map(m => m.slug) : []
  order.value = null
  error.value = ''
  persist()
}

function toggleMaterial(slug: string): void {
  if (!pkg.value) return
  if (pkg.value.materialLimit === 'all') return
  const i = selected.value.indexOf(slug)
  if (i >= 0) {
    selected.value = selected.value.filter(s => s !== slug)
  } else if (pkg.value.materialLimit === 1) {
    selected.value = [slug]
  } else if (selected.value.length < pkg.value.materialLimit) {
    selected.value = [...selected.value, slug]
  } else {
    return
  }
  persist()
}

function isDisabled(slug: string): boolean {
  if (!pkg.value || pkg.value.materialLimit === 'all') return false
  // Bulanan (limit 1) behaves like radio buttons: clicking another
  // material replaces the pick, so nothing is ever disabled.
  if (pkg.value.materialLimit === 1) return false
  return !selected.value.includes(slug) && selected.value.length >= pkg.value.materialLimit
}

const pkg = computed(() => (pkgId.value ? getPackage(pkgId.value) : undefined))
const requiredCount = computed(() => (pkg.value ? requiredMaterialCount(pkg.value, ownedMaterials.value.length) : 0))
const canCheckout = computed(() => !!pkg.value && selected.value.length === requiredCount.value)

/* ------------------------------------------------------------------ */
/* Order: create, load, proof upload, cancel, countdown                */
/* ------------------------------------------------------------------ */

async function loadOrder(id: string): Promise<void> {
  loadingOrder.value = true
  try {
    const res = await $fetch<{ orders: OrderView[] }>('/api/orders/mine')
    order.value = res.orders.find(o => o.id === id) ?? null
  } catch {
    order.value = null
  }
  loadingOrder.value = false
}

async function createOrder(): Promise<void> {
  if (!canCheckout.value || submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    const res = await $fetch<{ order: OrderView }>('/api/orders', {
      method: 'POST',
      body: { package: pkgId.value, materials: selected.value }
    })
    order.value = res.order
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
    void router.replace(`/checkout?order=${res.order.id}`)
  } catch (e) {
    const code = (e as { data?: { data?: { code?: string }, code?: string } })?.data?.data?.code
      ?? (e as { data?: { code?: string } })?.data?.code
    error.value = code === 'unavailable' ? t('checkout.errorUnavailable') : t('checkout.errorGeneric')
  }
  submitting.value = false
}

async function checkout(): Promise<void> {
  if (!canCheckout.value || submitting.value) return
  error.value = ''
  if (!signedIn.value) {
    // The ONLY login gate in this flow: a modal, not a redirect.
    persist()
    await openLoginModal()
    return
  }
  await createOrder()
}

/** Remaining payment time in ms (null when no deadline). */
const remainingMs = computed(() => {
  if (!order.value || !order.value.expiresAt) return null
  return Date.parse(order.value.expiresAt) - now.value
})

/** True once the 1-hour window has passed on a still-unpaid order. */
const orderExpired = computed(() => {
  if (!order.value) return false
  if (order.value.status === 'expired') return true
  return order.value.status === 'pending_payment' && remainingMs.value !== null && remainingMs.value <= 0
})

function countdownText(): string {
  const ms = remainingMs.value
  if (ms === null || ms <= 0) return '00:00:00'
  const total = Math.floor(ms / 1000)
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/* Proof upload */
const proofInput = ref<HTMLInputElement | null>(null)
const uploadingProof = ref(false)
const proofError = ref('')

function pickProof(): void {
  proofError.value = ''
  proofInput.value?.click()
}

async function onProofPicked(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !order.value || uploadingProof.value) return
  uploadingProof.value = true
  proofError.value = ''
  try {
    // Compress client-side first (max 1200px, JPEG 0.8) so the
    // upload stays small; the server still enforces ~500 KB.
    const dataUrl = await compressImageFile(file)
    if (dataUrlBytes(dataUrl) > 500 * 1024) {
      proofError.value = t('checkout.proofTooLarge')
      return
    }
    const res = await $fetch<{ order: OrderView }>(`/api/orders/${order.value.id}/proof`, {
      method: 'POST',
      body: { image: dataUrl }
    })
    order.value = res.order
  } catch (err) {
    const data = (err as { data?: { data?: { code?: string, message?: string }, message?: string } })?.data
    const code = data?.data?.code
    if (code === 'expired') proofError.value = t('checkout.expiredNote')
    else if (code === 'too-large') proofError.value = t('checkout.proofTooLarge')
    else proofError.value = t('checkout.proofFailed')
  } finally {
    uploadingProof.value = false
  }
}

/* Cancel */
const cancelling = ref(false)

async function cancelOrderNow(): Promise<void> {
  if (!order.value || cancelling.value) return
  cancelling.value = true
  try {
    const res = await $fetch<{ order: OrderView }>(`/api/orders/${order.value.id}/cancel`, { method: 'POST' })
    order.value = res.order
  } catch {
    error.value = t('checkout.errorGeneric')
  }
  cancelling.value = false
}

function newOrder(): void {
  order.value = null
  error.value = ''
  persist()
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

onMounted(async () => {
  clock = setInterval(() => { now.value = Date.now() }, 1000)
  const state = await fetchSessionState()
  signedIn.value = !!state.username
  if (signedIn.value) dashboardTo.value = postLoginPath()
  await loadQris()
  // Returning order view (after a reload, or from Profil "Lanjutkan bayar").
  const orderParam = route.query.order
  if (typeof orderParam === 'string' && orderParam && signedIn.value) {
    await loadOrder(orderParam)
    if (order.value) return
  }
  // Draft: URL query first, localStorage second.
  const qPkg = route.query.package
  const qMats = route.query.materials
  if (typeof qPkg === 'string' && getPackage(qPkg)) {
    const draft: CheckoutDraft = {
      package: qPkg,
      materials: typeof qMats === 'string' && qMats ? qMats.split(',') : []
    }
    applyDraft(draft)
    // Normalize the URL (e.g. semesteran fills in all materials).
    persist()
    return
  }
  const stored = readDraft()
  if (stored) {
    applyDraft(stored)
    persist()
  }
})

onUnmounted(() => {
  if (clock) clearInterval(clock)
})
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 flex flex-col">
    <!-- Minimal header: this page must work for guests, so it does
         not use the default layout (which redirects guests to /auth). -->
    <header class="sticky top-0 z-40 bg-white dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-700">
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center gap-6">
        <NuxtLink to="/" class="flex items-center gap-2">
          <span class="w-9 h-9 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs tracking-tight">GTS</span>
          <span class="text-sm font-semibold leading-tight">Global Testing<br />System</span>
        </NuxtLink>
        <div class="ml-auto flex items-center gap-3">
          <LocaleSwitcher />
          <ThemeToggle />
          <NuxtLink
            v-if="signedIn"
            :to="dashboardTo"
            class="text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            {{ t('nav.openTes') }}
          </NuxtLink>
          <NuxtLink
            v-else
            to="/auth"
            class="text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            {{ t('nav.signIn') }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="flex-1 w-full max-w-3xl mx-auto px-4 py-10">
      <!-- ============ Order states ============ -->
      <div v-if="order">
        <!-- Expired: the 1-hour window passed without a proof. -->
        <div v-if="orderExpired" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm text-center">
          <p class="text-3xl">⏰</p>
          <h1 class="mt-3 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{{ t('checkout.expiredTitle') }}</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ t('checkout.expiredNote') }}</p>
          <button
            class="mt-6 text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            @click="newOrder"
          >
            {{ t('checkout.newOrder') }}
          </button>
        </div>

        <!-- Cancelled -->
        <div v-else-if="order.status === 'cancelled'" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm text-center">
          <h1 class="mt-3 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{{ t('checkout.cancelledTitle') }}</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ t('checkout.cancelledNote') }}</p>
          <button
            class="mt-6 text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            @click="newOrder"
          >
            {{ t('checkout.newOrder') }}
          </button>
        </div>

        <!-- Active: verified, materials unlocked. -->
        <div v-else-if="order.status === 'active'" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm text-center">
          <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
            {{ t('checkout.activeStatus') }}
          </span>
          <h1 class="mt-3 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{{ t('checkout.activeTitle') }}</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ t('checkout.activeNote') }}</p>
          <NuxtLink
            to="/materials"
            class="mt-6 inline-block text-sm font-semibold px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {{ t('nav.openTes') }}
          </NuxtLink>
        </div>

        <!-- Proof uploaded: thank you, waiting for admin verification. -->
        <div v-else-if="order.status === 'proof_uploaded'" class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
            {{ t('checkout.proofUploadedStatus') }}
          </span>
          <h1 class="mt-3 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{{ t('checkout.thankYou') }}</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{{ t('checkout.thankYouNote') }}</p>
          <dl class="mt-6 space-y-3 text-sm">
            <div class="flex justify-between gap-3">
              <dt class="text-slate-400 dark:text-slate-500">{{ t('checkout.orderId') }}</dt>
              <dd class="font-mono font-semibold text-slate-700 dark:text-slate-200 break-all text-right">{{ order.id }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-400 dark:text-slate-500">{{ t('checkout.package') }}</dt>
              <dd class="font-semibold text-slate-700 dark:text-slate-200">{{ packageName(order.package) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-400 dark:text-slate-500">{{ t('checkout.total') }}</dt>
              <dd class="font-extrabold text-slate-900 dark:text-slate-100">{{ formatPriceIdr(order.price) }}</dd>
            </div>
          </dl>
          <div class="mt-6 flex flex-wrap gap-3">
            <button
              class="text-sm font-semibold px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
              :disabled="uploadingProof"
              @click="pickProof"
            >
              {{ uploadingProof ? t('access.loading') : t('checkout.reuploadProof') }}
            </button>
            <button
              class="text-sm font-semibold px-5 py-2.5 rounded-xl text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
              :disabled="cancelling"
              @click="cancelOrderNow"
            >
              {{ t('checkout.cancelOrder') }}
            </button>
            <NuxtLink
              to="/profile"
              class="text-sm font-semibold px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              {{ t('checkout.viewOrders') }}
            </NuxtLink>
          </div>
          <p v-if="proofError" class="mt-3 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-xl px-3.5 py-2.5">{{ proofError }}</p>
          <input ref="proofInput" type="file" accept="image/*" class="hidden" @change="onProofPicked" />
        </div>

        <!-- QRIS payment screen (pending_payment, inside the 1-hour window). -->
        <div v-else class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
            {{ t('checkout.pendingStatus') }}
          </span>
          <h1 class="mt-3 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{{ t('checkout.qrisTitle') }}</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ t('checkout.qrisSub') }}</p>

          <div class="mt-6 flex flex-col items-center">
            <div class="w-full max-w-xs aspect-square rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
              <img v-if="qrisImage" :src="qrisImage" alt="QRIS" class="w-full h-full object-contain" />
              <p v-else-if="qrisLoaded" class="px-6 text-center text-sm text-slate-400 dark:text-slate-500">{{ t('checkout.qrisMissing') }}</p>
              <p v-else class="px-6 text-center text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
            </div>
            <p class="mt-4 text-sm text-slate-400 dark:text-slate-500">{{ t('checkout.payBefore') }}</p>
            <p class="font-mono text-3xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100">{{ countdownText() }}</p>
          </div>

          <dl class="mt-6 space-y-3 text-sm">
            <div class="flex justify-between gap-3">
              <dt class="text-slate-400 dark:text-slate-500">{{ t('checkout.orderId') }}</dt>
              <dd class="font-mono font-semibold text-slate-700 dark:text-slate-200 break-all text-right">{{ order.id }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-400 dark:text-slate-500">{{ t('checkout.package') }}</dt>
              <dd class="font-semibold text-slate-700 dark:text-slate-200">{{ packageName(order.package) }} · {{ t('checkout.months', { n: order.durationMonths }) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-400 dark:text-slate-500">{{ t('checkout.materials') }}</dt>
              <dd class="font-semibold text-slate-700 dark:text-slate-200 text-right">{{ order.materials.map(materialName).join(', ') }}</dd>
            </div>
            <div class="flex justify-between gap-3 border-t border-slate-200 dark:border-slate-700 pt-3">
              <dt class="text-slate-400 dark:text-slate-500">{{ t('checkout.total') }}</dt>
              <dd class="font-extrabold text-lg text-slate-900 dark:text-slate-100">{{ formatPriceIdr(order.price) }}</dd>
            </div>
          </dl>

          <button
            class="mt-6 w-full rounded-xl bg-blue-600 text-white font-semibold py-3.5 text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="uploadingProof"
            @click="pickProof"
          >
            {{ uploadingProof ? t('access.loading') : t('checkout.uploadProof') }}
          </button>
          <p class="mt-3 text-xs text-center text-slate-400 dark:text-slate-500">{{ t('checkout.uploadHint') }}</p>
          <p v-if="proofError" class="mt-3 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-xl px-3.5 py-2.5">{{ proofError }}</p>
          <div class="mt-4 text-center">
            <button
              class="text-sm font-semibold text-red-600 dark:text-red-300 hover:underline disabled:opacity-50"
              :disabled="cancelling"
              @click="cancelOrderNow"
            >
              {{ t('checkout.cancelOrder') }}
            </button>
          </div>
          <input ref="proofInput" type="file" accept="image/*" class="hidden" @change="onProofPicked" />
        </div>
      </div>

      <!-- ============ Order form ============ -->
      <div v-else>
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100">{{ t('checkout.title') }}</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ t('checkout.sub') }}</p>

        <!-- Step 1: package -->
        <h2 class="mt-8 text-lg font-bold text-slate-900 dark:text-slate-100">{{ t('checkout.stepPackage') }}</h2>
        <div class="mt-3 grid gap-3 md:grid-cols-3">
          <button
            v-for="p in PACKAGES"
            :key="p.id"
            type="button"
            class="text-left rounded-2xl border p-5 transition-colors"
            :class="pkgId === p.id ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400'"
            :aria-pressed="pkgId === p.id"
            @click="selectPackage(p.id)"
          >
            <span class="block font-bold text-slate-900 dark:text-slate-100">{{ packageName(p.id) }}</span>
            <span class="mt-1 block text-2xl font-extrabold text-slate-900 dark:text-slate-100">{{ formatPriceIdr(p.priceIdr) }}</span>
            <span class="mt-1 block text-sm text-slate-500 dark:text-slate-400">{{ t('checkout.months', { n: p.durationMonths }) }}</span>
            <span class="mt-2 block text-xs text-slate-400 dark:text-slate-500">
              {{ p.materialLimit === 'all' ? t('landing.featS1') : p.materialLimit === 1 ? t('landing.featM1') : t('landing.featQ1') }}
            </span>
          </button>
        </div>

        <!-- Step 2: materials -->
        <h2 class="mt-8 text-lg font-bold text-slate-900 dark:text-slate-100">{{ t('checkout.stepMaterials') }}</h2>
        <p v-if="!pkg" class="mt-3 text-sm text-slate-400 dark:text-slate-500">{{ t('checkout.pickFirst') }}</p>
        <p v-else-if="pkg.materialLimit === 1" class="mt-3 text-sm text-slate-400 dark:text-slate-500">{{ t('checkout.pickOne') }}</p>
        <p v-else-if="pkg.materialLimit === 2" class="mt-3 text-sm text-slate-400 dark:text-slate-500">{{ t('checkout.pickTwo') }}</p>
        <p v-else class="mt-3 text-sm text-slate-400 dark:text-slate-500">{{ t('checkout.allMaterials') }}</p>
        <div v-if="pkg" class="mt-3 space-y-3">
          <button
            v-for="m in ownedMaterials"
            :key="m.slug"
            type="button"
            class="w-full text-left flex items-start gap-3 rounded-2xl border p-4 transition-colors"
            :class="[
              selected.includes(m.slug) ? 'border-blue-600 ring-1 ring-blue-600 bg-blue-50/50 dark:bg-blue-950/30' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900',
              isDisabled(m.slug) ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'
            ]"
            :disabled="isDisabled(m.slug)"
            :aria-pressed="selected.includes(m.slug)"
            @click="toggleMaterial(m.slug)"
          >
            <span
              class="mt-0.5 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center text-xs font-bold"
              :class="selected.includes(m.slug) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-slate-600 text-transparent'"
            >✓</span>
            <span>
              <span class="block font-bold text-slate-900 dark:text-slate-100">{{ m.name }}</span>
              <span class="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">{{ m.description }}</span>
            </span>
          </button>
        </div>

        <!-- Summary + Checkout button -->
        <div v-if="pkg" class="mt-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100">{{ t('checkout.summary') }}</h2>
          <dl class="mt-4 space-y-3 text-sm">
            <div class="flex justify-between gap-3">
              <dt class="text-slate-400 dark:text-slate-500">{{ t('checkout.package') }}</dt>
              <dd class="font-semibold text-slate-700 dark:text-slate-200">{{ packageName(pkg.id) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-400 dark:text-slate-500">{{ t('checkout.duration') }}</dt>
              <dd class="font-semibold text-slate-700 dark:text-slate-200">{{ t('checkout.months', { n: pkg.durationMonths }) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="text-slate-400 dark:text-slate-500">{{ t('checkout.materials') }}</dt>
              <dd class="font-semibold text-slate-700 dark:text-slate-200 text-right">
                {{ selected.length === 0 ? '—' : selected.map(materialName).join(', ') }}
              </dd>
            </div>
            <div class="flex justify-between gap-3 border-t border-slate-200 dark:border-slate-700 pt-3">
              <dt class="text-slate-400 dark:text-slate-500">{{ t('checkout.total') }}</dt>
              <dd class="font-extrabold text-lg text-slate-900 dark:text-slate-100">{{ formatPriceIdr(pkg.priceIdr) }}</dd>
            </div>
          </dl>
          <button
            class="mt-6 w-full rounded-xl bg-blue-600 text-white font-semibold py-3.5 text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!canCheckout || submitting"
            @click="checkout"
          >
            {{ submitting ? t('access.loading') : t('checkout.cta') }}
          </button>
          <p v-if="!signedIn" class="mt-3 text-xs text-center text-slate-400 dark:text-slate-500">{{ t('checkout.loginNote') }}</p>
          <p v-if="error" class="mt-3 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-xl px-3.5 py-2.5">{{ error }}</p>
        </div>
        <p v-if="loadingOrder" class="mt-6 text-sm text-slate-400 dark:text-slate-500">{{ t('access.loading') }}</p>
      </div>
    </main>

    <AppFooter />

    <!-- Login modal: the only login gate in this flow. -->
    <div
      v-if="loginModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
      role="dialog"
      aria-modal="true"
      @click.self="closeLoginModal"
    >
      <div class="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900 dark:text-slate-100">{{ t('checkout.loginTitle') }}</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ t('checkout.loginSub') }}</p>
          </div>
          <button
            class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xl leading-none px-2 py-1"
            :aria-label="t('common.close')"
            @click="closeLoginModal"
          >
            ×
          </button>
        </div>
        <div class="mt-6 flex justify-center">
          <div ref="googleBtn" />
        </div>
        <p v-if="!googleReady && !loginError" class="mt-4 text-center text-sm text-slate-400 dark:text-slate-500">{{ t('auth.googleLoading') }}</p>
        <p v-if="loginError" class="mt-4 text-sm text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/60 rounded-xl px-3.5 py-2.5">{{ loginError }}</p>
        <p class="mt-5 text-xs text-center text-slate-400 dark:text-slate-500 leading-relaxed">{{ t('checkout.loginPrivacy') }}</p>
        <button
          class="mt-4 w-full text-sm font-semibold text-slate-500 dark:text-slate-400 py-2 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
          @click="closeLoginModal"
        >
          {{ t('checkout.loginLater') }}
        </button>
      </div>
    </div>
  </div>
</template>
