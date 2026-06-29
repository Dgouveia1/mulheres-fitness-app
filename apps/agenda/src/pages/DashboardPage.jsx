import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, getAdminStats, getAppointments } from '@emf/shared'

const QUOTES = [
  'Cuide do seu corpo. É o único lugar que você tem para viver.',
  'Disciplina é escolher entre o que você quer agora e o que você quer mais.',
  'Cada treino te deixa mais perto da sua melhor versão.',
  'Força não vem do que o corpo faz, mas de superar o que a mente achava impossível.',
  'Progresso é progresso, não importa o tamanho do passo.',
  'Comece onde você está, use o que você tem, faça o que você pode.',
  'Constância vence intensidade. Apareça todos os dias.',
]

// Mapeia o código WMO (Open-Meteo) para rótulo PT-BR + ícone do Material Icons clássico.
function weatherInfo(code) {
  if (code == null) return { label: 'Tempo', icon: 'wb_cloudy' }
  if (code === 0) return { label: 'Céu limpo', icon: 'wb_sunny' }
  if (code <= 2) return { label: 'Parcialmente nublado', icon: 'wb_cloudy' }
  if (code === 3) return { label: 'Nublado', icon: 'cloud' }
  if (code <= 48) return { label: 'Névoa', icon: 'cloud' }
  if (code <= 67) return { label: 'Chuva', icon: 'grain' }
  if (code <= 77) return { label: 'Neve', icon: 'ac_unit' }
  if (code <= 82) return { label: 'Pancadas de chuva', icon: 'grain' }
  if (code <= 86) return { label: 'Neve', icon: 'ac_unit' }
  return { label: 'Tempestade', icon: 'flash_on' }
}

function greetingFor(h) {
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function DashboardPage() {
  const { profile } = useAuth()
  const firstName = profile?.full_name?.split(' ')[0] || 'Admin'
  const now = new Date()
  const greeting = greetingFor(now.getHours())
  const dateLabel = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const quote = QUOTES[now.getDate() % QUOTES.length]

  const [stats, setStats] = useState({ todayAppts: 0, activeClients: 0 })
  const [todayList, setTodayList] = useState([])
  const [loading, setLoading] = useState(true)
  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(true)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    Promise.all([getAdminStats(), getAppointments(today, today)])
      .then(([s, appts]) => {
        setStats(s)
        setTodayList(appts || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Clima real via Open-Meteo (sem chave) + geolocalização do navegador.
  useEffect(() => {
    let active = true
    async function loadWeather(lat, lon) {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
        )
        const d = await r.json()
        let city = ''
        try {
          const g = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`
          )
          const gj = await g.json()
          city = gj.city || gj.locality || gj.principalSubdivision || ''
        } catch {
          /* sem cidade — segue só com temperatura */
        }
        if (!active) return
        setWeather({ temp: Math.round(d?.current?.temperature_2m), code: d?.current?.weather_code, city })
      } catch {
        if (active) setWeather(null)
      } finally {
        if (active) setWeatherLoading(false)
      }
    }
    const fallback = () => loadWeather(-23.5505, -46.6333) // São Paulo
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadWeather(pos.coords.latitude, pos.coords.longitude),
        () => fallback(),
        { timeout: 8000, maximumAge: 1800000 }
      )
    } else {
      fallback()
    }
    return () => {
      active = false
    }
  }, [])

  const confirmed = todayList.filter((a) => a.status === 'confirmed').length
  const pending = todayList.filter((a) => a.status !== 'confirmed' && a.status !== 'cancelled').length

  const metrics = [
    { label: 'Agendamentos hoje', value: stats.todayAppts, icon: 'calendar_today', tint: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Confirmados', value: confirmed, icon: 'check_circle', tint: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Pendentes', value: pending, icon: 'schedule', tint: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Alunas ativas', value: stats.activeClients, icon: 'group', tint: 'text-blue-500', bg: 'bg-blue-500/10' },
  ]

  const wi = weather ? weatherInfo(weather.code) : null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Saudação + clima */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 flex items-center gap-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-surface shadow-soft" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-icons text-primary">person</span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-content truncate">
              {greeting}, <span className="text-primary">{firstName}</span>
            </h1>
            <p className="text-sm text-content-muted mt-0.5 capitalize">{dateLabel}</p>
          </div>
        </div>

        {/* Clima */}
        <div className="emf-card p-4 flex items-center gap-4 lg:w-72">
          {weatherLoading ? (
            <>
              <div className="w-12 h-12 emf-skeleton !rounded-2xl" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-16 emf-skeleton" />
                <div className="h-3 w-24 emf-skeleton" />
              </div>
            </>
          ) : wi ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center shrink-0">
                <span className="material-icons text-sky-500 text-2xl">{wi.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold text-content leading-none">{weather.temp}°</div>
                <div className="text-xs text-content-muted mt-1 truncate">
                  {wi.label}
                  {weather.city ? ` · ${weather.city}` : ''}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 text-content-muted">
              <span className="material-icons">cloud_off</span>
              <span className="text-xs">Clima indisponível</span>
            </div>
          )}
        </div>
      </div>

      {/* Métricas do dia */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="emf-card p-4">
            <div className={`w-10 h-10 ${m.bg} rounded-xl flex items-center justify-center mb-3`}>
              <span className={`material-icons ${m.tint}`}>{m.icon}</span>
            </div>
            {loading ? (
              <div className="h-7 w-12 emf-skeleton" />
            ) : (
              <div className="text-2xl font-bold text-content">{m.value}</div>
            )}
            <p className="text-xs text-content-muted mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Agenda de hoje + frase */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Lista de hoje */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-content-muted uppercase tracking-wider">Agenda de hoje</h2>
            <Link to="/agenda" className="text-primary text-xs font-semibold hover:underline">Ver tudo →</Link>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 emf-skeleton" />
              ))}
            </div>
          ) : todayList.length === 0 ? (
            <div className="emf-card p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="material-icons text-primary">event_available</span>
              </div>
              <p className="text-sm text-content-muted">Nenhum agendamento para hoje.</p>
              <Link to="/agenda" className="text-primary text-sm font-semibold mt-2 inline-block hover:underline">Abrir agenda →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {todayList.slice(0, 6).map((appt) => (
                <div key={appt.id} className="emf-card px-4 py-3 flex items-center gap-3">
                  <div className="text-center min-w-[52px]">
                    <div className="text-sm font-bold text-primary">{appt.time?.slice(0, 5)}</div>
                  </div>
                  <div className="w-px h-8 bg-line" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-content truncate">{appt.client_name}</p>
                    <p className="text-xs text-content-muted capitalize">{appt.type}</p>
                  </div>
                  <span
                    className={`emf-badge ${
                      appt.status === 'confirmed'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : appt.status === 'cancelled'
                          ? 'bg-red-500/10 text-red-600'
                          : 'bg-amber-500/10 text-amber-600'
                    }`}
                  >
                    {appt.status === 'confirmed' ? 'Confirmado' : appt.status === 'cancelled' ? 'Cancelado' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Frase motivacional do dia */}
        <div className="emf-card p-5 flex flex-col gap-3 bg-gradient-to-br from-primary/5 to-surface">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-icons text-primary">format_quote</span>
          </div>
          <p className="text-base text-content leading-relaxed font-medium">{quote}</p>
          <span className="text-xs text-content-muted mt-auto">Frase do dia · Espaço Mulher</span>
        </div>
      </div>
    </div>
  )
}
