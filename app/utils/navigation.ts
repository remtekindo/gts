import { ownedMaterials } from '~/data/mock'

/**
 * Where to send the user right after a successful sign-in (or when
 * visiting `/` while already signed in):
 * - exactly one ACCESSIBLE material -> straight into it (no extra click)
 * - otherwise                       -> the materials hub to pick one
 * The accessible list comes from the server session; without it, fall
 * back to the owned materials (public default).
 */
export function postLoginPath(accessibleSlugs?: string[]): string {
  const slugs = accessibleSlugs ?? ownedMaterials().map(m => m.slug)
  if (slugs.length === 1 && slugs[0]) return `/m/${slugs[0]}`
  return '/materials'
}
