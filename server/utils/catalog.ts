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

/** Papers per material, in catalog order (id + kind only).
 * Mirrors app/data/mock.ts `PAPERS` — keep in sync when a paper is
 * added, removed, or reordered: the sequential-unlock rules
 * (server/utils/unlock.ts) read the Full Simulation order from here,
 * so a drift would unlock the wrong paper server-side while the
 * client shows another. Drill packs are listed too (they are always
 * open), so an unknown paper id can be rejected instead of trusted. */
export const PAPERS_BY_MATERIAL: Record<string, Array<{ id: string, kind: 'simulation' | 'drill' }>> = {
  'toeic-lr': [
    { id: 'toeic-lr-sim-01', kind: 'simulation' },
    { id: 'toeic-lr-sim-02', kind: 'simulation' },
    { id: 'toeic-lr-sim-03', kind: 'simulation' },
    { id: 'toeic-reading-drill', kind: 'drill' },
    { id: 'toeic-listening-drill', kind: 'drill' }
  ],
  'toeic-sw': [
    { id: 'toeic-sw-drill-01', kind: 'drill' },
    { id: 'toeic-sw-drill-02', kind: 'drill' }
  ]
}

/** The paper catalog entry for one paper id, or undefined when the
 * id is not in any material (a forged or stale id). */
export function getPaperEntry(paperId: string): { id: string, kind: 'simulation' | 'drill', materialSlug: string } | undefined {
  for (const [materialSlug, papers] of Object.entries(PAPERS_BY_MATERIAL)) {
    const p = papers.find(x => x.id === paperId)
    if (p) return { ...p, materialSlug }
  }
  return undefined
}

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
