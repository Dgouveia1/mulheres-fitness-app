import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

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
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-pink-sm">
        <div className="flex items-center gap-2">
          <span className="font-main font-extrabold text-primary text-lg uppercase tracking-wider">Espaço</span>
          <span className="font-script text-primary text-2xl leading-none">Mulher</span>
        </div>
        <div className="flex items-center gap-2">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover border-2 border-primary/20" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-icons text-primary text-sm">person</span>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 shadow-pink-md z-30 pb-safe">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 flex-1 transition-colors ${
                  isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`material-icons text-2xl ${isActive ? 'text-primary' : ''}`}>{item.icon}</span>
                  <span className={`text-[10px] font-medium font-main truncate ${isActive ? 'text-primary' : ''}`}>{item.label}</span>
                  {isActive && <div className="absolute bottom-0 w-5 h-0.5 bg-primary rounded-full" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
