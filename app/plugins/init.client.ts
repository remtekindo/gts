import type { Locale } from '~/i18n'
import type { Theme } from '~/composables/useTheme'

/** Restore persisted locale + theme before first paint. */
export default defineNuxtPlugin(() => {
  const locale = useState<Locale>('gts-locale', () => 'en')
  const theme = useState<Theme>('gts-theme', () => 'light')
  try {
    const savedLocale = localStorage.getItem('gts_locale')
    if (savedLocale === 'en' || savedLocale === 'id') locale.value = savedLocale
    if (localStorage.getItem('gts_theme') === 'dark') {
      theme.value = 'dark'
      document.documentElement.classList.add('dark')
    }
  } catch {
    /* storage unavailable */
  }
})
