import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@emf/shared'
import { getDashboardStats } from '@emf/shared'
import { ThemeToggle } from '@emf/shared'

const BANNERS = [
  {
    gradient: 'from-primary to-purple-600',
    tag: 'NOVIDADE',
    title: 'Desafio de Verão ☀️',
    desc: 'Participe agora!',
    icon: 'local_fire_department',
  },
  {
    gradient: 'from-emerald-500 to-emerald-700',
    tag: 'DICA NUTRI',
    title: 'Hidrate-se! 💧',
    desc: 'A água é essencial para seu desempenho.',
    icon: 'water_drop',
  },
  {
    gradient: 'from-blue-500 to-blue-700',
    tag: 'AVISO',
    title: 'Avaliação Física 📋',
    desc: 'Agende sua renovação.',
    icon: 'assignment',
  },
]

const QUICK_ACCESS = [
  { icon: 'fitness_center', label: 'Treinar', to: '/treinos' },
  { icon: 'movie', label: 'Aulas', to: '/fitflix' },
  { icon: 'photo_camera', label: 'Comunidade', to: '/fitgran', wide: true },
  { icon: 'restaurant', label: 'Minha Dieta', to: '/dieta', wide: true },
]

export function DashboardPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [completedWorkouts, setCompletedWorkouts] = useState(null)
  const [activeBanner, setActiveBanner] = useState(0)
  const [paused, setPaused] = useState(false)

  const firstName = profile?.full_name?.split(' ')[0] || 'Aluna'
  const avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'A')}&background=ff0080&color=fff`

  useEffect(() => {
    if (!user?.id) return
    getDashboardStats(user.id).then((stats) => setCompletedWorkouts(stats.completedWorkouts))
  }, [user?.id])

  // Auto-rotate banners
  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => setActiveBanner((b) => (b + 1) % BANNERS.length), 4000)
    return () => clearInterval(timer)
  }, [paused])

  return (
    <div className="p-4 space-y-6 bg-background min-h-full">
      {/* Header */}
      <header className="flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-sm font-medium text-content-muted">Bem-vinda de volta,</p>
          <h1 className="text-2xl font-bold text-content flex items-center gap-1">
            {firstName}!
            <span className="material-icons text-primary text-xl align-middle" aria-hidden="true">auto_awesome</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <img
            src={avatarUrl}
            alt={`Foto de perfil de ${firstName}`}
            className="w-12 h-12 rounded-full object-cover border-2 border-surface shadow-pink-sm ring-2 ring-primary/20"
          />
        </div>
      </header>

      {/* Banner Carousel */}
      <section
        className="relative animate-scale-in"
        aria-roledescription="carrossel"
        aria-label="Destaques"
      >
        <div className="relative overflow-hidden rounded-2xl shadow-soft">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activeBanner * 100}%)` }}
          >
            {BANNERS.map((b, i) => (
              <div
                key={i}
                className={`relative min-w-full bg-gradient-to-br ${b.gradient} text-white p-5 rounded-2xl overflow-hidden`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} de ${BANNERS.length}`}
                aria-hidden={i !== activeBanner}
              >
                <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm text-xs font-bold px-2.5 py-1 rounded-full mb-2">
                  {b.tag}
                </span>
                <h3 className="text-xl font-bold leading-tight">{b.title}</h3>
                <p className="text-sm opacity-90 mt-1">{b.desc}</p>
                <span
                  className="material-icons absolute right-[-12px] bottom-[-12px] text-[7rem] opacity-15 rotate-[-15deg] select-none"
                  aria-hidden="true"
                >
                  {b.icon}
                </span>
              </div>
            ))}
          </div>

          {/* Pause/Resume control */}
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? 'Retomar rotação automática dos destaques' : 'Pausar rotação automática dos destaques'}
            aria-pressed={paused}
            title={paused ? 'Retomar' : 'Pausar'}
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 active:scale-95 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <span className="material-icons text-lg" aria-hidden="true">{paused ? 'play_arrow' : 'pause'}</span>
          </button>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-3" role="tablist" aria-label="Selecionar destaque">
          {BANNERS.map((b, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === activeBanner}
              aria-label={`Ir para o destaque ${i + 1}: ${b.title}`}
              onClick={() => setActiveBanner(i)}
              className="min-h-[44px] min-w-[20px] flex items-center justify-center cursor-pointer focus-visible:outline-none group"
            >
              <span
                className={`h-1.5 rounded-full transition-all group-focus-visible:ring-2 group-focus-visible:ring-primary/40 ${
                  i === activeBanner ? 'bg-primary w-5' : 'bg-line w-1.5 group-hover:bg-content-subtle'
                }`}
              />
            </button>
          ))}
        </div>
      </section>

      {/* Aviso */}
      <div className="emf-card p-4 flex items-start gap-3 border-amber-200 bg-amber-500/10 dark:bg-amber-500/15 animate-slide-up">
        <span className="w-10 h-10 shrink-0 rounded-full bg-amber-500/15 flex items-center justify-center">
          <span className="material-icons text-amber-600 text-xl" aria-hidden="true">campaign</span>
        </span>
        <div>
          <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Avisos Importantes</h4>
          <p className="text-xs text-amber-700 dark:text-amber-200/80 mt-0.5">Fique de olho nas atualizações do seu plano.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-5 flex items-center gap-4 shadow-pink-md animate-slide-up">
        <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0">
          <span className="material-icons text-white text-3xl" aria-hidden="true">fitness_center</span>
        </div>
        <div>
          <div className="text-xs opacity-80 font-semibold uppercase tracking-wider">Treinos Concluídos</div>
          <div className="text-4xl font-extrabold leading-none mt-0.5">{completedWorkouts ?? '—'}</div>
        </div>
        <span
          className="material-icons absolute right-[-16px] bottom-[-16px] text-[7rem] opacity-10 rotate-[-12deg] select-none"
          aria-hidden="true"
        >
          military_tech
        </span>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-sm font-bold text-content-muted uppercase tracking-wider mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACCESS.map((item) => (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className={`emf-card p-4 flex items-center gap-3 min-h-[44px] hover:border-primary/40 hover:shadow-soft-lg active:scale-95 transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                item.wide ? 'col-span-2' : ''
              }`}
            >
              <span className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                <span className="material-icons text-primary text-2xl" aria-hidden="true">{item.icon}</span>
              </span>
              <span className="font-semibold text-content text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
