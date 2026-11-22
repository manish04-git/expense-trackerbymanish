export const THEME_KEY = 'et-theme'

export function applyTheme(theme) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0F172A' : '#16A34A')
}

export function storeTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme) } catch { /* private mode */ }
}

export function readTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'system' } catch { return 'system' }
}
