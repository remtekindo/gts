import en from './en'
import id from './id'

export type Locale = 'en' | 'id'

const dicts: Record<Locale, typeof en> = { en, id }

function lookup(dict: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | null)?.[k] ?? null, dict)
}

/** Dot-path lookup with English fallback. Supports {name} interpolation via params. */
export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const raw = lookup(dicts[locale], key) ?? lookup(en, key)
  if (typeof raw !== 'string') return key
  if (!params) return raw
  return Object.entries(params).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), raw)
}
