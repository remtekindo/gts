export type Theme = 'light' | 'dark'

export function useTheme() {
  const theme = useState<Theme>('gts-theme', () => 'light')

  function apply(next: Theme): void {
    if (import.meta.client) {
      document.documentElement.classList.toggle('dark', next === 'dark')
    }
  }

  function setTheme(next: Theme): void {
    theme.value = next
    if (import.meta.client) {
      try {
        localStorage.setItem('gts_theme', next)
      } catch {
        /* storage unavailable */
      }
    }
    apply(next)
  }

  function toggleTheme(): void {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, setTheme, toggleTheme, apply }
}
