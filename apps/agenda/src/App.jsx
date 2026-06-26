import { Routes, Route, Navigate } from 'react-router-dom'
import { RoleRoute, ProtectedRoute, AuthLayout, LoginPage, STAFF_ROLES } from '@emf/shared'

import { AgendaShellLayout } from '@/layouts/AgendaShellLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { AgendaPage } from '@/pages/AgendaPage'
import { ChatPage } from '@/pages/ChatPage'
import { EvaluationsPage } from '@/pages/EvaluationsPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { SettingsPage } from '@/pages/SettingsPage'

// App de Agenda & Atendimento (staff). Login para qualquer STAFF_ROLE; nav
// gated por papel; Configurações (gestão de usuários da equipe) só superadmin.
export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route element={<AuthLayout redirectTo="/" />}>
        <Route path="/login" element={<LoginPage allowedRoles={STAFF_ROLES} redirectTo="/" />} />
      </Route>

      {/* App da equipe */}
      <Route element={<RoleRoute allowedRoles={STAFF_ROLES} />}>
        <Route element={<AgendaShellLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/agenda/chat" element={<ChatPage />} />
          <Route path="/agenda/avaliacoes" element={<EvaluationsPage />} />
          <Route path="/clientes" element={<ClientsPage />} />

          {/* Configurações — somente superadmin */}
          <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
