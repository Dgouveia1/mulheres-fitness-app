import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

// Shell das páginas de autenticação (login/registro). Cada app passa o
// `redirectTo` do seu próprio "home"; se já houver sessão nesta origem,
// redireciona para lá (o RoleRoute do destino cuida de papel incorreto).
export function AuthLayout({ redirectTo = '/' }) {
  const { user, loading } = useAuth()

  if (loading) return null
  if (user) return <Navigate to={redirectTo} replace />

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden bg-gradient-to-br from-primary via-primary-light to-secondary">
      {/* Blobs decorativos */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 w-80 h-80 rounded-full bg-secondary/40 blur-3xl" />

      <div className="relative w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-white font-main font-extrabold text-2xl uppercase tracking-widest">Espaço</div>
          <div className="text-white font-script text-5xl leading-tight">Mulher</div>
          <div className="text-white/80 text-sm font-medium mt-1">Fitness</div>
        </div>

        {/* Card */}
        <div className="bg-surface rounded-3xl shadow-glass border border-white/20 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
