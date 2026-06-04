import { useEffect, useState } from 'react'
import { getStaffUsers, createStaffUser, updateStaffUser, deleteStaffUser } from '@/services/api'
import { MANAGED_STAFF_ROLES, ROLE_LABELS } from '@/lib/roles'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'admin', unit: '' }

export function UsersPage() {
  const { show } = useToast()
  const [users, setUsers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // null = criando; objeto = editando
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  function loadUsers() {
    return getStaffUsers()
      .then((data) => setUsers(data))
      .catch(() => show('Erro ao carregar usuários.', 'error'))
      .finally(() => setLoading(false))
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  useEffect(() => { loadUsers() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(users.filter((u) => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)))
  }, [search, users])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(user) {
    setEditing(user)
    setForm({
      full_name: user.full_name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'admin',
      unit: user.unit || '',
    })
    setModalOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    let error
    if (editing) {
      const payload = { full_name: form.full_name, role: form.role, unit: form.unit }
      if (form.password) payload.password = form.password
      if (form.email && form.email !== editing.email) payload.email = form.email
      ;({ error } = await updateStaffUser(editing.id, payload))
    } else {
      ;({ error } = await createStaffUser({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: form.role,
        unit: form.unit,
      }))
    }
    setSaving(false)
    if (error) { show(error.message || 'Erro ao salvar usuário.', 'error', 9000); return }
    show(editing ? 'Usuário atualizado!' : 'Usuário criado!', 'success')
    closeModal()
    loadUsers()
  }

  async function handleDelete(user) {
    if (!confirm(`Excluir o usuário "${user.full_name || user.email}"? Esta ação não pode ser desfeita.`)) return
    setDeletingId(user.id)
    const { error } = await deleteStaffUser(user.id)
    setDeletingId(null)
    if (error) { show(error.message || 'Erro ao excluir usuário.', 'error', 9000); return }
    show('Usuário excluído!', 'success')
    loadUsers()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Usuários</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all"
        >
          <span className="material-icons text-base">person_add</span>
          Novo usuário
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
          <span className="text-4xl">🛡️</span>
          <p className="text-sm text-gray-400 mt-2">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => (
            <div key={user.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="material-icons text-primary text-base">person</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{user.full_name || '—'}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg shrink-0">
                {ROLE_LABELS[user.role] || user.role}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(user)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                  title="Editar"
                >
                  <span className="material-icons text-base">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(user)}
                  disabled={deletingId === user.id}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Excluir"
                >
                  {deletingId === user.id
                    ? <div className="w-4 h-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
                    : <span className="material-icons text-base">delete</span>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Editar Usuário' : 'Novo Usuário'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nome completo</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Nome completo"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="email@exemplo.com"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Senha {editing && <span className="text-gray-400 normal-case font-normal">(deixe em branco para manter)</span>}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder={editing ? 'Nova senha (opcional)' : 'Senha inicial'}
              required={!editing}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Papel</label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors bg-white"
            >
              {MANAGED_STAFF_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Unidade</label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              placeholder="Ex: Unidade Centro"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {editing ? 'Salvar alterações' : 'Criar usuário'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
