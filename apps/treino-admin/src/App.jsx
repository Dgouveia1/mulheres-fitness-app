import { Routes, Route, Navigate } from 'react-router-dom'
import { RoleRoute, AuthLayout, LoginPage, STAFF_ROLES } from '@emf/shared'

import { TreinoAdminLayout } from '@/layouts/TreinoAdminLayout'
import { WorkoutsAdminPage } from '@/pages/WorkoutsAdminPage'
import { NutritionAdminPage } from '@/pages/NutritionAdminPage'
import { FitFlixAdminPage } from '@/pages/FitFlixAdminPage'

// Admin do app de treino (staff). Login para STAFF_ROLES; nav gated por papel.
// Sem dashboard de agenda — a home redireciona para /treinos.
export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route element={<AuthLayout redirectTo="/treinos" />}>
        <Route path="/login" element={<LoginPage allowedRoles={STAFF_ROLES} redirectTo="/treinos" />} />
      </Route>

      {/* Gestão de treino */}
      <Route element={<RoleRoute allowedRoles={STAFF_ROLES} />}>
        <Route element={<TreinoAdminLayout />}>
          <Route path="/treinos" element={<WorkoutsAdminPage />} />
          <Route path="/nutricao" element={<NutritionAdminPage />} />
          <Route path="/fitflix" element={<FitFlixAdminPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/treinos" replace />} />
      <Route path="*" element={<Navigate to="/treinos" replace />} />
    </Routes>
  )
}
