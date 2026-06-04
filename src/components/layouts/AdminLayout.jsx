import { useState } from 'react'
import { Outlet, NavLink, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/admin', icon: 'dashboard', label: 'Dashboard', exact: true },
  { to: '/admin/clientes', icon: 'group', label: 'Clientes', roles: ['admin', 'reception'] },
  { to: '/admin/treinos', icon: 'fitness_center', label: 'Treinos', roles: ['admin', 'coach'] },
  { to: '/admin/nutricao', icon: 'restaurant_menu', label: 'Nutrição', roles: ['admin', 'nutri'] },
  { to: '/admin/fitflix', icon: 'play_circle', label: 'FitFlix', roles: ['admin'] },
  { to: '/admin/usuarios', icon: 'admin_panel_settings', label: 'Usuários', roles: ['superadmin'] },
]

const AREA_LINKS = [
  { to: '/agenda', icon: 'calendar_month', label: 'Agenda' },
]

export function AdminLayout() {
  const { profile, role, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // superadmin enxerga todos os módulos (superconjunto do admin)
  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || role === 'superadmin' || item.roles.includes(role))

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 shadow-pink-md z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:shadow-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="font-main font-extrabold text-primary text-base uppercase tracking-wider">Espaço</span>
            <span className="font-script text-primary text-2xl leading-none">Mulher</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Painel Administrativo</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest px-3 mb-2">Gestão</div>
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="material-icons text-xl">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}

          <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest px-3 mb-2 mt-4">Outras áreas</div>
          {AREA_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span className="material-icons text-xl">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-icons text-primary text-base">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">{profile?.full_name || 'Admin'}</div>
              <div className="text-xs text-gray-400 capitalize">{role}</div>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
          >
            <span className="material-icons text-base">logout</span>
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
            <span className="material-icons text-gray-600">menu</span>
          </button>
          <span className="font-semibold text-gray-800 text-sm">Admin</span>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
