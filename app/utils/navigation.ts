import { getLastMaterial } from '~/utils/storage'

/**
 * Where to send the user right after a successful sign-in (or when
 * visiting `/` while already signed in): the Tes home of the last
 * material they opened — one home, one primary action. With no last
 * material yet, the picker (`/materials`). The old hub-as-home was
 * removed in the v2 rebuild (7 Nov 2026): the hub no longer carries
 * global analytics; those live under Skor Saya.
 */
export function postLoginPath(): string {
  const last = getLastMaterial()
  return last ? `/m/${last}` : '/materials'
}
