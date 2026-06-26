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
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-light flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-white font-main font-extrabold text-2xl uppercase tracking-widest">Espaço</div>
          <div className="text-white font-script text-5xl leading-tight">Mulher</div>
          <div className="text-white/70 text-sm font-medium mt-1">Fitness</div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-pink-lg p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
