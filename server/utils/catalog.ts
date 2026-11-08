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
 *
 * Owned ≠ purchasable: a material is "owned" when its structure
 * (papers, parts) exists and it can be opened by anyone with a
 * grant — including a manual admin grant, which is the admin's
 * explicit choice. It is "purchasable" only when the bank holds real
 * questions for it (PURCHASABLE_MATERIAL_SLUGS below): checkout
 * refuses an order containing anything else, so a buyer can never
 * pay for an empty material. When a material's first questions land,
 * add its slug to PURCHASABLE_MATERIAL_SLUGS — the checkout picker
 * (client `hasQuestions`) picks it up with no code change.
 */

/** Slugs of the materials that exist and can be opened. Appended at
 * the end on purpose: the default package mapping takes the FIRST
 * 1 / 2 owned slugs, so Bulanan stays toeic-lr and Triwulanan stays
 * toeic-lr + toeic-sw; only Semesteran (all owned) grows. */
export const OWNED_MATERIAL_SLUGS = ['toeic-lr', 'toeic-sw', 'toefl-ibt', 'ielts-academic']

/** Slugs a buyer may pay for in checkout. A material joins this
 * list only when the bank holds real questions for it — never
 * before. The client picker enforces the same rule from the bank
 * data (`hasQuestions`), so the two can never drift apart silently:
 * if they disagree, the server wins and the order is refused. */
export const PURCHASABLE_MATERIAL_SLUGS = ['toeic-lr', 'toeic-sw']

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
  ],
  'toefl-ibt': [
    { id: 'toefl-ibt-sim-01', kind: 'simulation' },
    { id: 'toefl-reading-drill', kind: 'drill' },
    { id: 'toefl-listening-drill', kind: 'drill' },
    { id: 'toefl-writing-paper', kind: 'drill' },
    { id: 'toefl-speaking-paper', kind: 'drill' }
  ],
  'ielts-academic': [
    { id: 'ielts-academic-sim-01', kind: 'simulation' },
    { id: 'ielts-listening-drill', kind: 'drill' },
    { id: 'ielts-reading-drill', kind: 'drill' },
    { id: 'ielts-writing-paper', kind: 'drill' },
    { id: 'ielts-speaking-paper', kind: 'drill' }
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

/** True when the material may appear in a paid order (real
 * questions in the bank). Known but not purchasable = structure
 * only, no sale. */
export function isPurchasableMaterial(slug: string): boolean {
  return PURCHASABLE_MATERIAL_SLUGS.includes(slug)
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
