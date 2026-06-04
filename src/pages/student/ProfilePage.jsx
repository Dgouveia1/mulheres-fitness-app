import { useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { updateProfile, uploadAvatar } from '@/services/api'
import { useToast } from '@/components/ui/Toast'

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

  const displayAvatar = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'A')}&background=ff0080&color=fff&size=128`

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

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-800">Meu Perfil</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <img
            src={displayAvatar}
            alt="avatar"
            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-pink-md"
          />
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
