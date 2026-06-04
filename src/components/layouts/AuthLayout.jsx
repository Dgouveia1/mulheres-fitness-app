import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { STAFF_ROLES } from '@/lib/roles'

export function AuthLayout() {
  const { user, role, loading } = useAuth()

  if (loading) return null

  // Se já está logado, redireciona para área correta
  if (user) {
    if (STAFF_ROLES.includes(role)) return <Navigate to="/admin" replace />
    return <Navigate to="/dashboard" replace />
  }

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
