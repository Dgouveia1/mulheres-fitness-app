import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { STAFF_ROLES } from '@/lib/roles'

// Rota que exige role de staff (superadmin/admin/coach/nutri/reception)
export function AdminRoute() {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-gray-500 font-main">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!STAFF_ROLES.includes(role)) return <Navigate to="/" replace />

  return <Outlet />
}
