import { ownedMaterials } from '~/data/mock'

/**
 * Where to send the user right after a successful sign-in (or when
 * visiting `/` while already signed in):
 * - exactly one owned material  -> straight into it (no extra click)
 * - otherwise                   -> the materials hub to pick one
 */
export function postLoginPath(): string {
  const owned = ownedMaterials()
  if (owned.length === 1 && owned[0]) return `/m/${owned[0].slug}`
  return '/materials'
}
