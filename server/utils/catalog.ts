/**
 * Material / package catalog, server-side.
 *
 * The single place the server learns which materials exist and what a
 * package grant unlocks. Mirrors the client data — keep in sync when a
 * material or package is added:
 * - owned materials: app/data/mock.ts `MATERIALS` with status 'owned'
 * - packages: app/utils/admin.ts `PACKAGES`
 *
 * The server cannot see the admin panel's manual per-package material
 * picks (they live in the admin's browser localStorage), so a package
 * grant uses the DEFAULT mapping below: Semesteran = all owned,
 * Triwulanan = first 2 owned, Bulanan = first 1 owned. Manual picks
 * are not reflected server-side — see README § Auth.
 */

/** Slugs of the materials that exist and can be opened. */
export const OWNED_MATERIAL_SLUGS = ['toeic-lr', 'toeic-sw']

/** Materials open to every signed-in user without a grant. Empty for
 * now: both owned materials are premium; the free entry point is the
 * free test (a separate page, not a material). Add a slug here to make
 * a material free for all signed-in users. */
export const FREE_MATERIAL_SLUGS: string[] = []

export const PACKAGE_IDS = ['bulanan', 'triwulanan', 'semesteran']

export function isKnownMaterial(slug: string): boolean {
  return OWNED_MATERIAL_SLUGS.includes(slug)
}

export function isKnownPackage(pkgId: string): boolean {
  return PACKAGE_IDS.includes(pkgId)
}

/** Materials a package grant unlocks (default mapping, see above). */
export function packageMaterials(pkgId: string): string[] {
  if (pkgId === 'semesteran') return [...OWNED_MATERIAL_SLUGS]
  if (pkgId === 'triwulanan') return OWNED_MATERIAL_SLUGS.slice(0, 2)
  if (pkgId === 'bulanan') return OWNED_MATERIAL_SLUGS.slice(0, 1)
  return []
}
