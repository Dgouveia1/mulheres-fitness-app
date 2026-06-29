// Helpers de tema (claro/escuro) compartilhados pelos 3 apps.
// O tema é persistido em localStorage e aplicado via classe `.dark` no <html>.
const STORAGE_KEY = 'emf-theme'

export function getInitialTheme() {
  // Dark mode desativado por enquanto: tema sempre claro. (Os tokens .dark
  // continuam no CSS, prontos p/ reativar quando quisermos.)
  return 'light'
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function storeTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
}
