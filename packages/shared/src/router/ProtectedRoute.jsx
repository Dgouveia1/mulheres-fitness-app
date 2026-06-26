import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Guard de rota aninhado por papel (ex.: Configurações = somente superadmin).
// Sem sessão -> /login. Papel não permitido -> volta para o "home" do app ('/').
// allowedRoles vazio = qualquer usuário autenticado.
export function ProtectedRoute({ allowedRoles = [] }) {
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
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) return <Navigate to="/" replace />

  return <Outlet />
}
