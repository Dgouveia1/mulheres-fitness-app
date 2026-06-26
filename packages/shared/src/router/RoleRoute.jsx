import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { STAFF_ROLES, ROLE_LABELS } from '../lib/roles'
import { appUrls } from '../lib/appUrls'

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-sm text-gray-500 font-main">Carregando...</span>
      </div>
    </div>
  )
}

// Tela terminal quando a conta está autenticada mas seu papel não pertence a
// este app. Substitui o antigo <Navigate to="/admin"> (impossível entre origens
// diferentes) por links cross-subdomínio para o(s) app(s) que o papel acessa.
function WrongAppScreen() {
  const { role, signOut } = useAuth()
  const isStaff = STAFF_ROLES.includes(role)
  const targets = role === 'user'
    ? [{ label: 'Abrir o app de treino', href: appUrls.treino }]
    : isStaff
      ? [
          { label: 'Ir para a Agenda', href: appUrls.agenda },
          { label: 'Ir para o Admin de Treinos', href: appUrls.treinoAdmin },
        ]
      : []

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-gradient-to-br from-pink-50 to-white">
      <span className="material-icons text-5xl text-gray-300">lock_person</span>
      <div>
        <p className="text-sm font-semibold text-gray-700">Sua conta não tem acesso a este aplicativo.</p>
        <p className="text-xs text-gray-400 mt-1">
          {role ? `Perfil atual: ${ROLE_LABELS[role] || role}.` : 'Perfil não reconhecido.'} Use o aplicativo correto abaixo.
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {targets.map((t) => (
          <a
            key={t.href}
            href={t.href}
            className="px-5 py-2.5 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all"
          >
            {t.label}
          </a>
        ))}
        <button
          onClick={signOut}
          className="px-5 py-2.5 text-red-500 rounded-full text-sm font-semibold hover:bg-red-50 transition-all"
        >
          Sair
        </button>
      </div>
    </div>
  )
}

// Guard genérico por papel (substitui AdminRoute). loading -> spinner;
// sem sessão -> /login; papel não permitido -> WrongAppScreen.
export function RoleRoute({ allowedRoles = [] }) {
  const { user, role, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) return <WrongAppScreen />
  return <Outlet />
}
