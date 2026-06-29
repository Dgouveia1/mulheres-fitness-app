import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuth, appUrls, ThemeToggle } from '@emf/shared'

// Gestão do app de treino. Itens com `roles` só aparecem para esses papéis
// (superadmin enxerga tudo).
const NAV_ITEMS = [
  { to: '/treinos', icon: 'fitness_center', label: 'Treinos', roles: ['admin', 'coach'] },
  { to: '/nutricao', icon: 'restaurant_menu', label: 'Nutrição', roles: ['admin', 'nutri'] },
  { to: '/fitflix', icon: 'play_circle', label: 'FitFlix', roles: ['admin'] },
]

export function TreinoAdminLayout() {
  const { profile, role, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || role === 'superadmin' || item.roles.includes(role))

  return (
    <div className="flex min-h-screen bg-background text-content">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 glass-nav border-r shadow-soft-lg z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-pink-sm shrink-0">
              <span className="material-icons text-white text-xl" aria-hidden="true">fitness_center</span>
            </div>
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="font-main font-extrabold text-primary text-base uppercase tracking-wider">Espaço</span>
              <span className="font-script text-primary text-2xl leading-none">Mulher</span>
            </div>
          </div>
          <div className="text-xs text-content-muted mt-1.5">Gestão do App de Treino</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="text-[10px] text-content-subtle font-semibold uppercase tracking-widest px-3 mb-2">Conteúdo</div>
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive
                    ? 'bg-primary/10 text-primary shadow-pink-sm'
                    : 'text-content-muted hover:bg-muted hover:text-content'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-gradient-to-b from-primary to-primary-light transition-all duration-200 ${
                      isActive ? 'h-6 opacity-100' : 'h-0 opacity-0'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="material-icons text-xl" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}

          <div className="text-[10px] text-content-subtle font-semibold uppercase tracking-widest px-3 mb-2 mt-4">Outras áreas</div>
          <a
            href={appUrls.agenda}
            className="group flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium text-content-muted hover:bg-muted hover:text-content transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="material-icons text-xl" aria-hidden="true">calendar_month</span>
            Agenda &amp; Atendimento
            <span className="material-icons text-base ml-auto text-content-subtle group-hover:text-content-muted transition-colors" aria-hidden="true">open_in_new</span>
          </a>
        </nav>

        {/* User + Logout */}
        <div className="px-4 py-4 border-t border-line">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-icons text-primary text-base" aria-hidden="true">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-content truncate">{profile?.full_name || 'Staff'}</div>
              <div className="text-xs text-content-muted capitalize">{role}</div>
            </div>
            <ThemeToggle />
          </div>
          <button
            onClick={signOut}
            className="w-full min-h-[44px] flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
          >
            <span className="material-icons text-base" aria-hidden="true">logout</span>
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 glass-nav border-b px-4 py-3 flex items-center gap-3 shadow-soft">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menu"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-content-muted hover:bg-muted hover:text-content active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="material-icons" aria-hidden="true">menu</span>
          </button>
          <span className="font-semibold text-content text-sm">Admin de Treinos</span>
          <ThemeToggle className="ml-auto" />
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
