import { useEffect, useState } from 'react'
import { getClients, createClientAccount } from '@emf/shared'
import { Modal } from '@emf/shared'
import { useToast } from '@emf/shared'

export function ClientsPage() {
  const { show } = useToast()
  const [clients, setClients] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', unit: '' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    getClients().then((data) => {
      setClients(data)
      setFiltered(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(clients.filter((c) => c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)))
  }, [search, clients])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    const { error } = await createClientAccount(form.email, form.password, form.full_name, form.unit)
    setCreating(false)
    if (error) { show(error.message || 'Erro ao criar conta.', 'error'); return }
    show('Conta criada!', 'success')
    setShowCreate(false)
    setForm({ full_name: '', email: '', password: '', unit: '' })
    // Reload
    getClients().then((data) => { setClients(data); setFiltered(data) })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-content">Clientes</h1>
        <button onClick={() => setShowCreate(true)} className="emf-btn-primary rounded-full">
          <span className="material-icons text-base">person_add</span>
          Nova aluna
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-content-subtle text-lg">search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          aria-label="Buscar cliente"
          className="emf-input pl-10"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 emf-skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <span className="material-icons text-primary text-2xl">groups</span>
          </div>
          <p className="text-sm text-content-muted">Nenhuma aluna encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <div key={client.id} className="emf-card px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {client.avatar_url ? (
                  <img src={client.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="material-icons text-primary text-base">person</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-content truncate">{client.full_name || '—'}</p>
                <p className="text-xs text-content-muted truncate">{client.email}</p>
              </div>
              {client.unit && <span className="emf-badge bg-muted text-content-muted">{client.unit}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nova Aluna">
        <form onSubmit={handleCreate} className="space-y-3">
          {[
            { name: 'full_name', label: 'Nome completo', type: 'text', placeholder: 'Nome completo' },
            { name: 'email', label: 'E-mail', type: 'email', placeholder: 'email@exemplo.com' },
            { name: 'password', label: 'Senha', type: 'password', placeholder: 'Senha inicial' },
            { name: 'unit', label: 'Unidade', type: 'text', placeholder: 'Ex: Unidade Centro' },
          ].map((f) => (
            <div key={f.name}>
              <label className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">{f.label}</label>
              <input
                type={f.type}
                value={form[f.name]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                placeholder={f.placeholder}
                required={f.name !== 'unit'}
                className="emf-input"
              />
            </div>
          ))}
          <button type="submit" disabled={creating} className="emf-btn-primary w-full py-3">
            {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Criar Conta
          </button>
        </form>
      </Modal>
    </div>
  )
}
