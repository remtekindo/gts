/**
 * Package price table — the SINGLE source of truth for what a
 * package costs and what it covers.
 *
 * Used by BOTH the landing page / checkout page (client) and the
 * order endpoints (server) — the server imports this file with a
 * relative path and recomputes the price from it, so a tampered
 * client-sent price can never stick. Do not duplicate these numbers
 * anywhere else: `app/utils/admin.ts` PACKAGES is the admin panel's
 * own (localStorage-backed) definition and is NOT this table.
 *
 * Pure TypeScript, no imports: the server bundle must be able to
 * import it without pulling in any Nuxt/Vue code.
 */

export type PackageId = 'bulanan' | 'triwulanan' | 'semesteran'

export interface PackageDef {
  id: PackageId
  /** Price in Rupiah (whole, no decimals). */
  priceIdr: number
  /** How many months the package lasts. */
  durationMonths: number
  /** How many materials the buyer picks: 1, 2, or every owned material. */
  materialLimit: number | 'all'
}

export const PACKAGES: PackageDef[] = [
  { id: 'bulanan', priceIdr: 75000, durationMonths: 1, materialLimit: 1 },
  { id: 'triwulanan', priceIdr: 199000, durationMonths: 3, materialLimit: 2 },
  { id: 'semesteran', priceIdr: 349000, durationMonths: 6, materialLimit: 'all' }
]

export function isPackageId(id: string): id is PackageId {
  return PACKAGES.some(p => p.id === id)
}

export function getPackage(id: string): PackageDef | undefined {
  return PACKAGES.find(p => p.id === id)
}

/** 'Rp75.000' — the display format used on the landing and checkout pages. */
export function formatPriceIdr(n: number): string {
  return `Rp${n.toLocaleString('id-ID')}`
}

/** How many materials an order for this package must carry. */
export function requiredMaterialCount(pkg: PackageDef, ownedCount: number): number {
  return pkg.materialLimit === 'all' ? ownedCount : pkg.materialLimit
}
