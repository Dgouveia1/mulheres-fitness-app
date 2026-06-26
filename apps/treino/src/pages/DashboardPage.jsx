import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@emf/shared'
import { getDashboardStats } from '@emf/shared'

const BANNERS = [
  {
    gradient: 'from-primary to-purple-600',
    tag: 'NOVIDADE',
    title: 'Desafio de Verão ☀️',
    desc: 'Participe agora!',
    emoji: '🔥',
  },
  {
    gradient: 'from-emerald-500 to-emerald-700',
    tag: 'DICA NUTRI',
    title: 'Hidrate-se! 💧',
    desc: 'A água é essencial para seu desempenho.',
    emoji: '🥒',
  },
  {
    gradient: 'from-blue-500 to-blue-700',
    tag: 'AVISO',
    title: 'Avaliação Física 📋',
    desc: 'Agende sua renovação.',
    emoji: '📋',
  },
]

const QUICK_ACCESS = [
  { icon: '💪', label: 'Treinar', to: '/treinos' },
  { icon: '🎬', label: 'Aulas', to: '/fitflix' },
  { icon: '📸', label: 'Comunidade', to: '/fitgran', wide: true },
  { icon: '🥗', label: 'Minha Dieta', to: '/dieta', wide: true },
]

export function DashboardPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [completedWorkouts, setCompletedWorkouts] = useState(null)
  const [activeBanner, setActiveBanner] = useState(0)

  const firstName = profile?.full_name?.split(' ')[0] || 'Aluna'
  const avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'A')}&background=ff0080&color=fff`

  useEffect(() => {
    if (!user?.id) return
    getDashboardStats(user.id).then((stats) => setCompletedWorkouts(stats.completedWorkouts))
  }, [user?.id])

  // Auto-rotate banners
  useEffect(() => {
    const timer = setInterval(() => setActiveBanner((b) => (b + 1) % BANNERS.length), 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">Bem-vinda de volta,</p>
          <h1 className="text-2xl font-bold text-gray-800">{firstName}! ✨</h1>
        </div>
        <img
          src={avatarUrl}
          alt="avatar"
          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-pink-sm"
        />
      </header>

      {/* Banner Carousel */}
      <div className="relative overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${activeBanner * 100}%)` }}
        >
          {BANNERS.map((b, i) => (
            <div
              key={i}
              className={`relative min-w-full bg-gradient-to-br ${b.gradient} text-white p-5 rounded-2xl overflow-hidden`}
            >
              <span className="inline-block bg-white/20 text-xs font-bold px-2.5 py-1 rounded-full mb-2">{b.tag}</span>
              <h3 className="text-xl font-bold leading-tight">{b.title}</h3>
              <p className="text-sm opacity-90 mt-1">{b.desc}</p>
              <div className="absolute right-[-20px] bottom-[-20px] text-[6rem] opacity-10 rotate-[-15deg]">{b.emoji}</div>
            </div>
          ))}
        </div>
        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-2">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveBanner(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeBanner ? 'bg-primary w-4' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      </div>

      {/* Aviso */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-xl">📢</span>
        <div>
          <h4 className="text-sm font-bold text-amber-800">Avisos Importantes</h4>
          <p className="text-xs text-amber-700 mt-0.5">Fique de olho nas atualizações do seu plano.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <span className="material-icons text-white text-2xl">fitness_center</span>
        </div>
        <div>
          <div className="text-xs opacity-80 font-medium">Treinos Concluídos</div>
          <div className="text-3xl font-extrabold">{completedWorkouts ?? '—'}</div>
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Acesso Rápido</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACCESS.map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 shadow-pink-sm border border-gray-100 hover:border-primary/30 active:scale-95 transition-all text-left ${
                item.wide ? 'col-span-2' : ''
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="font-semibold text-gray-800 text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
