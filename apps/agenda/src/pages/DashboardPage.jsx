import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, getAdminStats, getAppointments, appUrls } from '@emf/shared'

export function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ todayAppts: 0, activeClients: 0 })
  const [recentAppts, setRecentAppts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    Promise.all([getAdminStats(), getAppointments(today, today)]).then(([s, appts]) => {
      setStats(s)
      setRecentAppts(appts.slice(0, 5))
      setLoading(false)
    })
  }, [])

  // Links internos do app de agenda (<Link>) e links para o app de treino-admin
  // (cross-subdomínio via <a href>, usando appUrls).
  const QUICK_LINKS = [
    { to: '/clientes', icon: 'group', label: 'Clientes', color: 'from-blue-500 to-blue-600' },
    { href: `${appUrls.treinoAdmin}/treinos`, icon: 'fitness_center', label: 'Treinos', color: 'from-primary to-primary-dark' },
    { href: `${appUrls.treinoAdmin}/nutricao`, icon: 'restaurant_menu', label: 'Nutrição', color: 'from-emerald-500 to-emerald-700' },
    { to: '/agenda', icon: 'calendar_month', label: 'Agenda', color: 'from-purple-500 to-purple-700' },
    { to: '/agenda/chat', icon: 'chat', label: 'Mensagens', color: 'from-amber-500 to-amber-600' },
    { href: `${appUrls.treinoAdmin}/fitflix`, icon: 'play_circle', label: 'FitFlix', color: 'from-red-500 to-red-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Olá, {profile?.full_name?.split(' ')[0] || 'Admin'}! 👋</h1>
        <p className="text-sm text-gray-400 mt-1">Aqui está o resumo de hoje.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-pink-sm p-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
            <span className="material-icons text-primary">calendar_today</span>
          </div>
          {loading ? (
            <div className="h-8 bg-gray-100 rounded animate-pulse" />
          ) : (
            <div className="text-3xl font-extrabold text-gray-800">{stats.todayAppts}</div>
          )}
          <p className="text-xs text-gray-400 mt-1">Agendamentos hoje</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-pink-sm p-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
            <span className="material-icons text-blue-500">group</span>
          </div>
          {loading ? (
            <div className="h-8 bg-gray-100 rounded animate-pulse" />
          ) : (
            <div className="text-3xl font-extrabold text-gray-800">{stats.activeClients}</div>
          )}
          <p className="text-xs text-gray-400 mt-1">Alunas ativas</p>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_LINKS.map((item) => {
            const className = `bg-gradient-to-br ${item.color} text-white rounded-2xl p-4 flex flex-col items-center gap-2 hover:opacity-90 active:scale-95 transition-all`
            const inner = (
              <>
                <span className="material-icons text-2xl">{item.icon}</span>
                <span className="text-xs font-bold text-center">{item.label}</span>
              </>
            )
            return item.href ? (
              <a key={item.label} href={item.href} className={className}>{inner}</a>
            ) : (
              <Link key={item.label} to={item.to} className={className}>{inner}</Link>
            )
          })}
        </div>
      </div>

      {/* Today's appointments */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Agendamentos de Hoje</h2>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : recentAppts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <span className="text-3xl">📅</span>
            <p className="text-sm text-gray-400 mt-2">Nenhum agendamento hoje.</p>
            <Link to="/agenda" className="text-primary text-sm font-semibold mt-2 inline-block">Ver agenda →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentAppts.map((appt) => (
              <div key={appt.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className="text-center min-w-[48px]">
                  <div className="text-sm font-bold text-primary">{appt.time?.slice(0, 5)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{appt.client_name}</p>
                  <p className="text-xs text-gray-400">{appt.type}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                  appt.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {appt.status === 'confirmed' ? 'Confirmado' : appt.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
