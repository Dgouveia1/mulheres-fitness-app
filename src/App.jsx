import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/router/ProtectedRoute'
import { AdminRoute } from '@/router/AdminRoute'
import { STAFF_ROLES } from '@/lib/roles'

// Layouts
import { AuthLayout } from '@/components/layouts/AuthLayout'
import { StudentLayout } from '@/components/layouts/StudentLayout'
import { AdminLayout } from '@/components/layouts/AdminLayout'
import { AgendaLayout } from '@/components/layouts/AgendaLayout'

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'

// Student pages
import { DashboardPage } from '@/pages/student/DashboardPage'
import { WorkoutsPage } from '@/pages/student/WorkoutsPage'
import { DietPage } from '@/pages/student/DietPage'
import { FitGranPage } from '@/pages/student/FitGranPage'
import { FitFlixPage } from '@/pages/student/FitFlixPage'
import { WatchPage } from '@/pages/student/WatchPage'
import { ProfilePage } from '@/pages/student/ProfilePage'

// Admin pages
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { ClientsPage } from '@/pages/admin/ClientsPage'
import { WorkoutsAdminPage } from '@/pages/admin/WorkoutsAdminPage'
import { NutritionAdminPage } from '@/pages/admin/NutritionAdminPage'
import { FitFlixAdminPage } from '@/pages/admin/FitFlixAdminPage'
import { UsersPage } from '@/pages/admin/UsersPage'

// Agenda pages
import { AgendaPage } from '@/pages/agenda/AgendaPage'
import { ChatPage } from '@/pages/agenda/ChatPage'
import { EvaluationsPage } from '@/pages/agenda/EvaluationsPage'

// Tela terminal para conta autenticada sem um role reconhecido.
// Evita loop de redirect (/ -> /dashboard -> /) quando o perfil não tem
// um role válido (ex.: 'operacional_user' legado ou role nulo).
function NoRoleFallback() {
  const { signOut, profile } = useAuth()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-gradient-to-br from-pink-50 to-white">
      <span className="material-icons text-5xl text-gray-300">lock_person</span>
      <div>
        <p className="text-sm font-semibold text-gray-700">Sua conta não tem um perfil de acesso configurado.</p>
        <p className="text-xs text-gray-400 mt-1">Fale com o administrador para liberar seu acesso{profile?.role ? ` (perfil atual: ${profile.role})` : ''}.</p>
      </div>
      <button
        onClick={signOut}
        className="px-5 py-2.5 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all"
      >
        Sair
      </button>
    </div>
  )
}

function RootRedirect() {
  const { user, role, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (STAFF_ROLES.includes(role)) return <Navigate to="/admin" replace />
  if (role === 'user') return <Navigate to="/dashboard" replace />
  // Autenticado mas sem role reconhecido: estado terminal (sem loop).
  return <NoRoleFallback />
}

export default function App() {
  return (
    <Routes>
      {/* Redirect da raiz */}
      <Route path="/" element={<RootRedirect />} />

      {/* Auth - não requer login */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* App das Alunas - requer role 'user' */}
      <Route element={<ProtectedRoute allowedRoles={['user']} />}>
        <Route element={<StudentLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/treinos" element={<WorkoutsPage />} />
          <Route path="/dieta" element={<DietPage />} />
          <Route path="/fitgran" element={<FitGranPage />} />
          <Route path="/fitflix" element={<FitFlixPage />} />
          <Route path="/watch" element={<WatchPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Admin - requer role de staff */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/clientes" element={<ClientsPage />} />
          <Route path="/admin/treinos" element={<WorkoutsAdminPage />} />
          <Route path="/admin/nutricao" element={<NutritionAdminPage />} />
          <Route path="/admin/fitflix" element={<FitFlixAdminPage />} />

          {/* Usuários - somente superadmin */}
          <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
            <Route path="/admin/usuarios" element={<UsersPage />} />
          </Route>
        </Route>

        {/* Agenda - mesmos guards de admin */}
        <Route element={<AgendaLayout />}>
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/agenda/chat" element={<ChatPage />} />
          <Route path="/agenda/avaliacoes" element={<EvaluationsPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
