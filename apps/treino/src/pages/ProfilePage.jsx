import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@emf/shared'
import { updateProfile, uploadAvatar, getUserStats, getAssessments } from '@emf/shared'
import { useToast } from '@emf/shared'
import { ThemeToggle } from '@emf/shared'

const LEVELS = [
  { label: 'Iniciante', min: 0 },
  { label: 'Em Evolução', min: 10 },
  { label: 'Imparável', min: 30 },
  { label: 'Musa Fitness', min: 60 },
]
const WEEK_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function getLevel(days) {
  let idx = 0
  for (let i = 0; i < LEVELS.length; i++) if (days >= LEVELS[i].min) idx = i
  const current = LEVELS[idx]
  const next = LEVELS[idx + 1]
  const xpInLevel = days - current.min
  const xpToNext = next ? next.min - current.min : 1
  const pct = next ? Math.min(100, Math.round((xpInLevel / xpToNext) * 100)) : 100
  return { label: current.label, pct, next: next?.label, toNext: next ? next.min - days : 0 }
}

function calcImc(weight, height) {
  const w = Number(weight)
  let h = Number(height)
  if (!w || !h) return null
  if (h > 3) h = h / 100 // cm -> m
  const v = w / (h * h)
  return Number.isFinite(v) ? v.toFixed(1) : null
}

function fmtDate(iso) {
  if (!iso) return ''
  return iso.slice(0, 10).split('-').reverse().join('/')
}

export function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const { show } = useToast()
  const fileInputRef = useRef()
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  })
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const [stats, setStats] = useState(null)
  const [assessments, setAssessments] = useState([])

  const displayAvatar = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'A')}&background=ff0080&color=fff&size=128`

  useEffect(() => {
    if (!user?.id) return
    getUserStats(user.id).then(setStats).catch(() => {})
    getAssessments(user.id).then((data) => setAssessments(data || [])).catch(() => {})
  }, [user?.id])

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file || !user?.id) return
    setAvatarUploading(true)
    try {
      const url = await uploadAvatar(file, user.id)
      setAvatarUrl(url)
      await updateProfile(user.id, { avatar_url: url })
      show('Foto atualizada!', 'success')
    } catch {
      show('Erro ao atualizar foto.', 'error')
    }
    setAvatarUploading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!user?.id) return
    setSaving(true)
    const { error } = await updateProfile(user.id, form)
    setSaving(false)
    if (error) show('Erro ao salvar.', 'error')
    else show('Perfil atualizado!', 'success')
  }

  const level = getLevel(stats?.trainingDays || 0)
  const latest = assessments[0]
  const imc = latest ? calcImc(latest.weight, latest.height) : null
  const weightHistory = [...assessments].reverse().map((a) => Number(a.weight)).filter((w) => w > 0).slice(-8)
  const minW = Math.min(...weightHistory)
  const maxW = Math.max(...weightHistory)

  return (
    <div className="p-4 space-y-5 bg-background min-h-screen">
      <h1 className="text-xl font-bold text-content">Meu Perfil</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 animate-fade-in">
        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary to-secondary opacity-30 blur-md" aria-hidden="true" />
          <img src={displayAvatar} alt={`Foto de ${profile?.full_name || 'Aluna'}`} className="relative w-24 h-24 rounded-full object-cover border-4 border-surface shadow-soft-lg" />
          {avatarUploading && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Alterar foto de perfil"
            title="Alterar foto"
            className="absolute bottom-0 right-0 w-11 h-11 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center shadow-pink-md border-2 border-surface hover:from-primary-dark hover:to-primary active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="material-icons text-white text-lg">camera_alt</span>
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <div className="text-center">
          <p className="font-bold text-content text-lg">{profile?.full_name || 'Aluna'}</p>
          <p className="text-xs text-content-subtle">{user?.email}</p>
        </div>
      </div>

      {/* Minha Evolução */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-light rounded-2xl p-5 text-white shadow-pink-md animate-scale-in">
        <span className="material-icons absolute -right-4 -top-4 text-white/10 text-9xl select-none pointer-events-none" aria-hidden="true">military_tech</span>
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-white/80 uppercase tracking-wider">
              <span className="material-icons text-sm" aria-hidden="true">emoji_events</span>
              Nível
            </div>
            <div className="text-2xl font-extrabold leading-tight">{level.label}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-extrabold leading-none">{stats?.trainingDays ?? 0}</div>
            <div className="text-xs text-white/80 mt-0.5">dias treinados</div>
          </div>
        </div>
        {/* XP */}
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-[11px] text-white/80 mb-1.5">
            <span className="font-semibold uppercase tracking-wider">Progresso</span>
            <span className="font-bold">{level.pct}%</span>
          </div>
          <div className="h-2.5 bg-white/25 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${level.pct}%` }} />
          </div>
          <div className="flex items-center gap-1 text-[11px] text-white/80 mt-1.5">
            <span className="material-icons text-xs" aria-hidden="true">{level.next ? 'trending_up' : 'workspace_premium'}</span>
            {level.next ? `Faltam ${level.toNext} dia(s) para "${level.next}"` : 'Nível máximo alcançado!'}
          </div>
        </div>
        {/* Frequência da semana + streak */}
        <div className="relative flex items-center justify-between mt-5">
          <div className="flex gap-1.5">
            {(stats?.week || Array(7).fill(false)).map((done, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors ${done ? 'bg-white text-primary shadow-soft' : 'bg-white/15 text-white/70'}`}>
                  {WEEK_LABELS[i]}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5 backdrop-blur-sm">
            <span className="material-icons text-base text-amber-200">local_fire_department</span>
            <span className="text-sm font-bold">{stats?.streak ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Avaliações físicas */}
      <div className="emf-card p-4 space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-content-muted uppercase tracking-wider">Minha Evolução</h2>
          <span className="material-icons text-primary" aria-hidden="true">monitoring</span>
        </div>

        {assessments.length === 0 ? (
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <span className="material-icons text-primary text-3xl" aria-hidden="true">monitoring</span>
            </div>
            <p className="text-sm text-content-muted max-w-xs">Suas avaliações físicas aparecerão aqui após a primeira avaliação.</p>
          </div>
        ) : (
          <>
            {/* Resumo atual */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3 text-center border border-primary/10">
                <div className="text-xl font-bold text-primary">{latest.weight || '—'}</div>
                <div className="text-[11px] text-content-muted mt-0.5">Peso (kg)</div>
              </div>
              <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3 text-center border border-primary/10">
                <div className="text-xl font-bold text-primary">{imc || '—'}</div>
                <div className="text-[11px] text-content-muted mt-0.5">IMC</div>
              </div>
              <div className="bg-primary/5 dark:bg-primary/10 rounded-xl p-3 text-center border border-primary/10">
                <div className="text-xl font-bold text-primary">{assessments.length}</div>
                <div className="text-[11px] text-content-muted mt-0.5">Avaliações</div>
              </div>
            </div>

            {/* Gráfico de peso */}
            {weightHistory.length >= 2 && (
              <div className="bg-muted rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-content-muted mb-3">
                  <span className="material-icons text-sm text-primary" aria-hidden="true">show_chart</span>
                  Histórico de peso (kg)
                </div>
                <div className="flex items-end justify-between gap-1.5 h-28">
                  {weightHistory.map((w, i) => {
                    const range = maxW - minW || 1
                    const h = 30 + ((w - minW) / range) * 70 // 30%..100%
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full group">
                        <span className="text-[10px] font-semibold text-content-muted">{w}</span>
                        <div
                          className="w-full bg-gradient-to-t from-primary to-primary-light rounded-t-lg transition-all duration-300 group-hover:from-primary-dark group-hover:to-primary"
                          style={{ height: `${h}%` }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Histórico de avaliações */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-content-muted uppercase tracking-wider">Avaliações anteriores</div>
              {assessments.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted border border-line hover:border-primary/30 transition-colors">
                  <span className="flex items-center gap-1.5 text-xs text-content-muted">
                    <span className="material-icons text-sm text-content-subtle" aria-hidden="true">event</span>
                    {fmtDate(a.created_at)}
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    {a.weight && <span className="font-semibold text-content">{a.weight} kg</span>}
                    {calcImc(a.weight, a.height) && <span className="text-content-muted">IMC {calcImc(a.weight, a.height)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="emf-card p-4 space-y-4 animate-slide-up">
        <h2 className="flex items-center gap-2 text-sm font-bold text-content-muted uppercase tracking-wider">
          <span className="material-icons text-base text-primary" aria-hidden="true">badge</span>
          Informações Pessoais
        </h2>
        <div>
          <label htmlFor="profile-full-name" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">Nome completo</label>
          <input
            id="profile-full-name"
            type="text"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            className="emf-input"
          />
        </div>
        <div>
          <label htmlFor="profile-phone" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">Celular</label>
          <input
            id="profile-phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="emf-input"
          />
        </div>
        <div>
          <label htmlFor="profile-email" className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1.5">E-mail</label>
          <input
            id="profile-email"
            type="email"
            value={user?.email || ''}
            disabled
            className="emf-input bg-muted text-content-subtle cursor-not-allowed"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="emf-btn emf-btn-primary w-full uppercase tracking-wider"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-icons text-base" aria-hidden="true">save</span>}
          Salvar Alterações
        </button>
      </form>

      {/* Aparência / Tema */}
      <div className="emf-card flex items-center justify-between p-4 animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-secondary/15 flex items-center justify-center">
            <span className="material-icons text-secondary" aria-hidden="true">palette</span>
          </div>
          <div>
            <p className="text-sm font-bold text-content">Aparência</p>
            <p className="text-xs text-content-muted">Alterne entre tema claro e escuro</p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Logout */}
      <button
        onClick={signOut}
        className="w-full min-h-[44px] py-3 border border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 font-semibold rounded-xl text-sm hover:bg-red-500/10 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
      >
        <span className="material-icons text-base" aria-hidden="true">logout</span>
        Sair da Conta
      </button>
    </div>
  )
}
