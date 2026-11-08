/**
 * Orders (D1) — package → checkout → admin approval.
 *
 * Flow: a guest picks a package on the landing page, chooses the
 * materials on /checkout, and only the Checkout button asks them to
 * sign in. POST /api/orders then stores the order as
 * `pending_payment` with the price computed server-side from the
 * shared price table (app/utils/pricing.ts — never the client-sent
 * price). An admin approves it (payment confirmed) and the order's
 * materials become grants; until then the materials stay Locked.
 *
 * There is no payment gateway yet: an order waits in
 * `pending_payment` until an admin approves or cancels it. Grant
 * expiry is also not enforced (duration_months is recorded only).
 */
import { getPackage, requiredMaterialCount, type PackageId } from '../../app/utils/pricing'
import { OWNED_MATERIAL_SLUGS, isKnownMaterial } from './catalog'
import type { D1Database } from './d1'
import { grantMaterials } from './user-store'

export type OrderStatus = 'pending_payment' | 'proof_uploaded' | 'active' | 'cancelled' | 'expired'

export interface Order {
  id: string
  userSub: string
  package: PackageId
  materials: string[]
  price: number
  currency: string
  durationMonths: number
  status: OrderStatus
  createdAt: string
  /** ISO UTC (`...Z`) — created_at + 3600s. The client countdown parses it as UTC. */
  expiresAt: string | null
  activatedAt: string | null
  /** Base64 data URL of the uploaded payment proof, or null. */
  proofImage: string | null
  proofUploadedAt: string | null
  /** Only on the admin list: who placed the order. */
  userEmail?: string | null
  userName?: string | null
}

interface OrderRow {
  id: string
  user_sub: string
  package: string
  materials: string
  price: number
  currency: string
  duration_months: number
  status: string
  created_at: string
  expires_at: string | null
  activated_at: string | null
  proof_image: string | null
  proof_uploaded_at: string | null
  user_email?: string | null
  user_name?: string | null
}

/**
 * `expired` is COMPUTED on read, never stored: a `pending_payment`
 * order whose `expires_at` has passed. There is no cron. A
 * `proof_uploaded` order never expires this way — the proof is in,
 * the admin verifies on their own time.
 */
export function effectiveStatus(row: { status: string, expires_at: string | null }): OrderStatus {
  if (row.status === 'pending_payment' && row.expires_at) {
    const exp = Date.parse(row.expires_at)
    if (!Number.isNaN(exp) && exp <= Date.now()) return 'expired'
  }
  return row.status as OrderStatus
}

function toOrder(row: OrderRow): Order {
  let materials: string[] = []
  try {
    const parsed: unknown = JSON.parse(row.materials)
    materials = Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []
  } catch {
    materials = []
  }
  return {
    id: row.id,
    userSub: row.user_sub,
    package: row.package as PackageId,
    materials,
    price: row.price,
    currency: row.currency,
    durationMonths: row.duration_months,
    status: effectiveStatus(row),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    activatedAt: row.activated_at,
    proofImage: row.proof_image ?? null,
    proofUploadedAt: row.proof_uploaded_at ?? null,
    userEmail: row.user_email ?? null,
    userName: row.user_name ?? null
  }
}

function newOrderId(): string {
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  return `ord_${[...bytes].map(b => b.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Validate a client order draft. Returns the cleaned materials on
 * success, or a plain reason on failure. The price is never taken
 * from the client — it is recomputed from the package at creation.
 */
export function validateOrderDraft(
  pkgId: unknown,
  materials: unknown
): { ok: true, pkg: PackageId, materials: string[] } | { ok: false, code: string, message: string } {
  if (typeof pkgId !== 'string') {
    return { ok: false, code: 'unknown-package', message: 'Unknown package.' }
  }
  const pkg = getPackage(pkgId)
  if (!pkg) {
    return { ok: false, code: 'unknown-package', message: 'Unknown package.' }
  }
  if (!Array.isArray(materials)) {
    return { ok: false, code: 'bad-materials', message: 'Materials must be a list.' }
  }
  const slugs = [...new Set(materials.filter((s): s is string => typeof s === 'string'))]
  if (slugs.length !== materials.length) {
    return { ok: false, code: 'bad-materials', message: 'Materials must be a list of material ids.' }
  }
  if (slugs.some(s => !isKnownMaterial(s))) {
    return { ok: false, code: 'unknown-material', message: 'Unknown material in the order.' }
  }
  // Every owned material may be ordered — including a question-less
  // one (TOEFL/IELTS today). The buyer is warned on the checkout
  // card and in the summary ("soal sedang disiapkan") before paying;
  // there is no server-side refusal for empty materials anymore
  // (the old 400 `not-purchasable` was removed on Rey's instruction,
  // 8 Nov 2026). Only unknown slugs are refused.
  const required = requiredMaterialCount(pkg, OWNED_MATERIAL_SLUGS.length)
  if (slugs.length !== required) {
    return {
      ok: false,
      code: 'wrong-material-count',
      message: pkg.materialLimit === 'all'
        ? 'This package includes all materials.'
        : `This package covers exactly ${required} material${required === 1 ? '' : 's'}.`
    }
  }
  if (pkg.materialLimit === 'all') {
    const missing = OWNED_MATERIAL_SLUGS.filter(s => !slugs.includes(s))
    if (missing.length > 0) {
      return { ok: false, code: 'wrong-material-count', message: 'This package includes all materials.' }
    }
  }
  return { ok: true, pkg: pkg.id, materials: slugs }
}

/** Create a pending order. Price + duration come from the package, not the client.
 * The payment window is 1 hour: expires_at = created_at + 3600s, stored as
 * ISO UTC (strftime ...Z) so the client countdown parses it as UTC. */
export async function createOrder(db: D1Database, userSub: string, pkgId: PackageId, materials: string[]): Promise<Order> {
  const pkg = getPackage(pkgId) as NonNullable<ReturnType<typeof getPackage>>
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = newOrderId()
    try {
      await db.prepare(
        `INSERT INTO orders (id, user_sub, package, materials, price, currency, duration_months, status, expires_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'IDR', ?6, 'pending_payment', strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+3600 seconds'))`
      ).bind(id, userSub, pkg.id, JSON.stringify(materials), pkg.priceIdr, pkg.durationMonths).run()
      const row = await db.prepare('SELECT * FROM orders WHERE id = ?1').bind(id).first<OrderRow>()
      if (row) return toOrder(row)
      throw new Error('order row not found after insert')
    } catch (e) {
      // A generated id colliding is near-impossible but cheap to retry;
      // any other failure is real and must surface.
      if ((e as Error).message.includes('UNIQUE constraint') && attempt < 2) continue
      throw e
    }
  }
  throw new Error('could not create order')
}

export async function getOrder(db: D1Database, id: string): Promise<Order | null> {
  const row = await db.prepare('SELECT * FROM orders WHERE id = ?1').bind(id).first<OrderRow>()
  return row ? toOrder(row) : null
}

/** One user's orders, newest first. */
export async function listOrdersForUser(db: D1Database, userSub: string): Promise<Order[]> {
  const res = await db.prepare(
    'SELECT * FROM orders WHERE user_sub = ?1 ORDER BY created_at DESC, id DESC'
  ).bind(userSub).all<OrderRow>()
  return (res.results || []).map(toOrder)
}

/** All orders, newest first, with the buyer's email/name. */
export async function listAllOrders(db: D1Database): Promise<Order[]> {
  const res = await db.prepare(
    `SELECT o.*, u.email AS user_email, u.name AS user_name
     FROM orders o LEFT JOIN users u ON u.google_sub = o.user_sub
     ORDER BY o.created_at DESC, o.id DESC`
  ).all<OrderRow>()
  return (res.results || []).map(toOrder)
}

/**
 * Approve a pending or proof-uploaded order: status → active +
 * activated_at, and the order's materials become grants (existing
 * grants are kept, never duplicated). Returns false with a reason
 * when the order cannot be approved. An expired order (pending
 * past its window) cannot be approved — its effective status is
 * `expired`, not `pending_payment`.
 */
export async function approveOrder(
  db: D1Database,
  id: string,
  grantedBy: string | null
): Promise<{ ok: true, order: Order } | { ok: false, reason: 'not-found' | 'not-pending' }> {
  const order = await getOrder(db, id)
  if (!order) return { ok: false, reason: 'not-found' }
  if (order.status !== 'pending_payment' && order.status !== 'proof_uploaded') return { ok: false, reason: 'not-pending' }
  await db.prepare(
    "UPDATE orders SET status = 'active', activated_at = datetime('now') WHERE id = ?1"
  ).bind(id).run()
  await grantMaterials(db, order.userSub, order.materials, grantedBy)
  const updated = await getOrder(db, id)
  return { ok: true, order: updated as Order }
}

/** Cancel a pending or proof-uploaded order. Active, cancelled, or
 * expired orders cannot be cancelled. */
export async function cancelOrder(
  db: D1Database,
  id: string
): Promise<{ ok: true, order: Order } | { ok: false, reason: 'not-found' | 'not-pending' }> {
  const order = await getOrder(db, id)
  if (!order) return { ok: false, reason: 'not-found' }
  if (order.status !== 'pending_payment' && order.status !== 'proof_uploaded') return { ok: false, reason: 'not-pending' }
  await db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?1").bind(id).run()
  const updated = await getOrder(db, id)
  return { ok: true, order: updated as Order }
}

/** Max proof size after client-side compression (~500 KB of JPEG). */
export const MAX_PROOF_BYTES = 500 * 1024

function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0
  return Math.floor((b64.length * 3) / 4) - padding
}

/**
 * Store a payment proof for an order: status → proof_uploaded,
 * replacing any earlier proof (re-upload is allowed until the admin
 * verifies). The order must be pending_payment or proof_uploaded
 * and NOT expired — uploading to an expired order is refused.
 */
export async function uploadProof(
  db: D1Database,
  id: string,
  imageDataUrl: string
): Promise<{ ok: true, order: Order } | { ok: false, reason: 'not-found' | 'not-pending' | 'expired' | 'too-large' | 'bad-image' }> {
  const order = await getOrder(db, id)
  if (!order) return { ok: false, reason: 'not-found' }
  if (order.status === 'expired') return { ok: false, reason: 'expired' }
  if (order.status !== 'pending_payment' && order.status !== 'proof_uploaded') return { ok: false, reason: 'not-pending' }
  if (typeof imageDataUrl !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(imageDataUrl)) {
    return { ok: false, reason: 'bad-image' }
  }
  if (dataUrlBytes(imageDataUrl) > MAX_PROOF_BYTES) {
    return { ok: false, reason: 'too-large' }
  }
  await db.prepare(
    "UPDATE orders SET proof_image = ?1, proof_uploaded_at = datetime('now'), status = 'proof_uploaded' WHERE id = ?2"
  ).bind(imageDataUrl, id).run()
  const updated = await getOrder(db, id)
  return { ok: true, order: updated as Order }
}
