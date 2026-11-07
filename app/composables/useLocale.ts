import { translate, type Locale } from '~/i18n'

export function useLocale() {
  const locale = useState<Locale>('gts-locale', () => 'id')

  const t = (key: string, params?: Record<string, string | number>): string =>
    translate(locale.value, key, params)

  function setLocale(next: Locale): void {
    locale.value = next
    if (import.meta.client) {
      try {
        localStorage.setItem('gts_locale', next)
      } catch {
        /* storage unavailable */
      }
    }
  }

  return { locale, t, setLocale }
}
