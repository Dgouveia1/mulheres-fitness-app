import { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuth, appUrls } from '@emf/shared'

// Itens com `roles` só aparecem para esses papéis (superadmin enxerga tudo).
// Itens sem `roles` aparecem para qualquer papel de staff.
const NAV_ITEMS = [
  { to: '/', icon: 'dashboard', label: 'Dashboard', exact: true },
  { to: '/agenda', icon: 'calendar_month', label: 'Agenda' },
  { to: '/agenda/chat', icon: 'chat', label: 'Mensagens' },
  { to: '/agenda/avaliacoes', icon: 'monitor_weight', label: 'Avaliações' },
  { to: '/clientes', icon: 'group', label: 'Clientes', roles: ['admin', 'reception'] },
  { to: '/configuracoes', icon: 'settings', label: 'Configurações', roles: ['superadmin'] },
]

const COLLAPSE_KEY = 'emf-agenda-sidebar-collapsed'

export function AgendaShellLayout() {
  const { profile, role, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false) // drawer mobile
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || role === 'superadmin' || item.roles.includes(role))
  const hide = collapsed ? 'lg:hidden' : ''
  const center = collapsed ? 'lg:justify-center' : ''

  return (
    <div className="flex min-h-screen bg-background">
      {/* Overlay (mobile) */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 ${collapsed ? 'lg:w-[76px]' : 'lg:w-64'} bg-surface border-r border-line z-50 flex flex-col transition-all duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo + toggle de recolher */}
        <div className={`flex items-center ${collapsed ? 'lg:justify-center' : 'justify-between'} gap-2 px-4 py-5 border-b border-line h-[73px]`}>
          <div className={`flex items-center gap-2 ${hide}`}>
            <span className="font-main font-extrabold text-primary text-base uppercase tracking-wider">Espaço</span>
            <span className="font-script text-primary text-2xl leading-none">Mulher</span>
          </div>
          {collapsed && <span className="hidden lg:inline font-script text-primary text-3xl leading-none">M</span>}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg text-content-muted hover:bg-muted hover:text-content transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="material-icons text-xl">{collapsed ? 'chevron_right' : 'chevron_left'}</span>
          </button>
          {/* Fechar (mobile) */}
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-content-muted hover:bg-muted transition-colors"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-hide">
          {!collapsed && <div className="text-[10px] text-content-muted font-semibold uppercase tracking-widest px-3 mb-2">Gestão</div>}
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setSidebarOpen(false)}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center ${center} gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-content-muted hover:bg-muted hover:text-content'
                }`
              }
            >
              <span className="material-icons text-xl shrink-0" aria-hidden="true">{item.icon}</span>
              <span className={hide}>{item.label}</span>
            </NavLink>
          ))}

          {!collapsed && <div className="text-[10px] text-content-muted font-semibold uppercase tracking-widest px-3 mb-2 mt-4">Outras áreas</div>}
          <a
            href={appUrls.treinoAdmin}
            title={collapsed ? 'Admin de Treinos' : undefined}
            className={`flex items-center ${center} gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium text-content-muted hover:bg-muted hover:text-content transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40`}
          >
            <span className="material-icons text-xl shrink-0" aria-hidden="true">fitness_center</span>
            <span className={hide}>Admin de Treinos</span>
          </a>
        </nav>

        {/* Usuário + sair */}
        <div className="px-3 py-4 border-t border-line">
          <div className={`flex items-center gap-3 mb-3 px-1 ${center}`}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-icons text-primary text-base">person</span>
              </div>
            )}
            <div className={`flex-1 min-w-0 ${hide}`}>
              <div className="text-sm font-semibold text-content truncate">{profile?.full_name || 'Staff'}</div>
              <div className="text-xs text-content-muted capitalize">{role}</div>
            </div>
          </div>
          <button
            onClick={signOut}
            title={collapsed ? 'Sair' : undefined}
            className={`w-full flex items-center ${center} gap-2 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40`}
          >
            <span className="material-icons text-base shrink-0">logout</span>
            <span className={hide}>Sair</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 glass-nav border-b px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors cursor-pointer"
          >
            <span className="material-icons text-content">menu</span>
          </button>
          <span className="font-semibold text-content text-sm">Espaço Mulher</span>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
