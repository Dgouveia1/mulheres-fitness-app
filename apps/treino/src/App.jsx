import { Routes, Route, Navigate } from 'react-router-dom'
import { RoleRoute, AuthLayout, LoginPage } from '@emf/shared'

import { StudentLayout } from '@/layouts/StudentLayout'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'
import { DietPage } from '@/pages/DietPage'
import { FitGranPage } from '@/pages/FitGranPage'
import { FitFlixPage } from '@/pages/FitFlixPage'
import { WatchPage } from '@/pages/WatchPage'
import { ProfilePage } from '@/pages/ProfilePage'

// App de treino (alunas) — papel 'user'.
export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route element={<AuthLayout redirectTo="/dashboard" />}>
        <Route
          path="/login"
          element={<LoginPage allowedRoles={['user']} redirectTo="/dashboard" registerPath="/register" />}
        />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* App da aluna */}
      <Route element={<RoleRoute allowedRoles={['user']} />}>
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

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
