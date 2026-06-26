import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@emf/shared'
import { updateProfile, uploadAvatar, getUserStats, getAssessments } from '@emf/shared'
import { useToast } from '@emf/shared'

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
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-800">Meu Perfil</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <img src={displayAvatar} alt="avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-pink-md" />
          {avatarUploading && (
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md border-2 border-white"
          >
            <span className="material-icons text-white text-sm">camera_alt</span>
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <div className="text-center">
          <p className="font-bold text-gray-800">{profile?.full_name || 'Aluna'}</p>
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
      </div>

      {/* Minha Evolução */}
      <div className="bg-gradient-to-br from-primary to-primary-light rounded-2xl p-4 text-white shadow-pink-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-white/70 uppercase tracking-wider">Nível</div>
            <div className="text-lg font-extrabold">{level.label}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold">{stats?.trainingDays ?? 0}</div>
            <div className="text-xs text-white/70">dias treinados</div>
          </div>
        </div>
        {/* XP */}
        <div className="mt-3">
          <div className="h-2 bg-white/25 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${level.pct}%` }} />
          </div>
          <div className="text-[11px] text-white/70 mt-1">
            {level.next ? `Faltam ${level.toNext} dia(s) para "${level.next}"` : 'Nível máximo alcançado! 👑'}
          </div>
        </div>
        {/* Frequência da semana + streak */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-1.5">
            {(stats?.week || Array(7).fill(false)).map((done, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${done ? 'bg-white text-primary' : 'bg-white/20 text-white/60'}`}>
                  {WEEK_LABELS[i]}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white/15 rounded-full px-3 py-1.5">
            <span className="material-icons text-base">local_fire_department</span>
            <span className="text-sm font-bold">{stats?.streak ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Avaliações físicas */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-pink-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Minha Evolução</h2>
          <span className="material-icons text-primary">monitoring</span>
        </div>

        {assessments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Suas avaliações físicas aparecerão aqui após a primeira avaliação.</p>
        ) : (
          <>
            {/* Resumo atual */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-primary/5 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-primary">{latest.weight || '—'}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Peso (kg)</div>
              </div>
              <div className="bg-primary/5 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-primary">{imc || '—'}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">IMC</div>
              </div>
              <div className="bg-primary/5 rounded-xl p-3 text-center">
                <div className="text-xl font-bold text-primary">{assessments.length}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">Avaliações</div>
              </div>
            </div>

            {/* Gráfico de peso */}
            {weightHistory.length >= 2 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-2">Histórico de peso (kg)</div>
                <div className="flex items-end justify-between gap-1.5 h-24">
                  {weightHistory.map((w, i) => {
                    const range = maxW - minW || 1
                    const h = 30 + ((w - minW) / range) * 70 // 30%..100%
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                        <span className="text-[10px] text-gray-400">{w}</span>
                        <div className="w-full bg-primary/70 rounded-t-md" style={{ height: `${h}%` }} />
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Histórico de avaliações */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500">Avaliações anteriores</div>
              {assessments.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50">
                  <span className="text-xs text-gray-500">{fmtDate(a.created_at)}</span>
                  <div className="flex items-center gap-3 text-xs">
                    {a.weight && <span className="font-semibold text-gray-700">{a.weight} kg</span>}
                    {calcImc(a.weight, a.height) && <span className="text-gray-400">IMC {calcImc(a.weight, a.height)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-pink-sm p-4 space-y-4">
        <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Informações Pessoais</h2>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Nome completo</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Celular</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">E-mail</label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm uppercase tracking-wider hover:bg-primary-dark active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
          Salvar Alterações
        </button>
      </form>

      {/* Logout */}
      <button
        onClick={signOut}
        className="w-full py-3 border border-red-200 text-red-500 font-semibold rounded-xl text-sm hover:bg-red-50 active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        <span className="material-icons text-base">logout</span>
        Sair da Conta
      </button>
    </div>
  )
}
