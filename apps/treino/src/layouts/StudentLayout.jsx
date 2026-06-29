import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth, ThemeToggle } from '@emf/shared'

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'home', label: 'Home' },
  { to: '/treinos', icon: 'fitness_center', label: 'Treinos' },
  { to: '/dieta', icon: 'restaurant_menu', label: 'Dieta' },
  { to: '/fitgran', icon: 'photo_camera', label: 'FitGran' },
  { to: '/fitflix', icon: 'play_circle', label: 'FitFlix' },
  { to: '/perfil', icon: 'person', label: 'Perfil' },
]

export function StudentLayout() {
  const { profile } = useAuth()

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-md mx-auto relative">
      {/* Header */}
      <header className="glass-nav sticky top-0 z-30 border-b px-4 py-3 flex items-center justify-between shadow-soft">
        <div className="flex items-center gap-2">
          <span className="font-main font-extrabold text-primary text-lg uppercase tracking-wider">Espaço</span>
          <span className="font-script text-primary text-2xl leading-none">Mulher</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile?.name ? `Foto de ${profile.name}` : 'Foto do perfil'}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-primary/20 shadow-soft"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-soft">
              <span className="material-icons text-white text-base">person</span>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav
        className="glass-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t shadow-soft-lg z-30 pb-safe"
        aria-label="Navegação principal"
      >
        <div className="flex items-center justify-around px-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              className={({ isActive }) =>
                `group relative flex flex-col items-center justify-center gap-0.5 py-2 px-2 min-w-0 min-h-[44px] flex-1 rounded-2xl transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  isActive ? 'text-primary' : 'text-content-subtle hover:text-content-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center justify-center w-9 h-7 rounded-full transition-all duration-200 ${
                      isActive ? 'bg-primary/10' : 'group-hover:bg-muted'
                    }`}
                  >
                    <span className={`material-icons text-2xl transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                      {item.icon}
                    </span>
                  </span>
                  <span className={`text-[10px] font-main truncate transition-colors duration-200 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                  <div
                    className={`absolute -bottom-0.5 h-1 rounded-full bg-primary transition-all duration-300 ${
                      isActive ? 'w-5 opacity-100' : 'w-0 opacity-0'
                    }`}
                  />
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
