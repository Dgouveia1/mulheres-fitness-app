import { useTheme } from '../../contexts/ThemeContext'

// Botão de alternância claro/escuro. Acessível (aria-label) e alvo de toque >=44px.
export function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
      className={`w-11 h-11 flex items-center justify-center rounded-full text-content-muted hover:bg-muted hover:text-content transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${className}`}
    >
      <span className="material-icons text-xl">{isDark ? 'light_mode' : 'dark_mode'}</span>
    </button>
  )
}
