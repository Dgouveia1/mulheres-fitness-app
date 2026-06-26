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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Clientes</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all"
        >
          <span className="material-icons text-base">person_add</span>
          Nova aluna
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">👥</span>
          <p className="text-sm text-gray-400 mt-2">Nenhuma aluna encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <div key={client.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {client.avatar_url ? (
                  <img src={client.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="material-icons text-primary text-base">person</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{client.full_name || '—'}</p>
                <p className="text-xs text-gray-400 truncate">{client.email}</p>
              </div>
              {client.unit && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">{client.unit}</span>}
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
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{f.label}</label>
              <input
                type={f.type}
                value={form[f.name]}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                placeholder={f.placeholder}
                required={f.name !== 'unit'}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          ))}
          <button
            type="submit"
            disabled={creating}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {creating && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Criar Conta
          </button>
        </form>
      </Modal>
    </div>
  )
}
