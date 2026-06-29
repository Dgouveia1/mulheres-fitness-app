import { useEffect, useState } from 'react'
import { getStaffUsers, createStaffUser, updateStaffUser, deleteStaffUser } from '@emf/shared'
import { MANAGED_STAFF_ROLES, ROLE_LABELS } from '@emf/shared'
import { Modal } from '@emf/shared'
import { useToast } from '@emf/shared'

const EMPTY_FORM = { full_name: '', email: '', password: '', role: 'admin', unit: '' }

export function SettingsPage() {
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
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-content">Usuários</h1>
        <button onClick={openCreate} className="emf-btn-primary rounded-full">
          <span className="material-icons text-base">person_add</span>
          Novo usuário
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
          aria-label="Buscar usuário"
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
            <span className="material-icons text-primary text-2xl">admin_panel_settings</span>
          </div>
          <p className="text-sm text-content-muted">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user) => (
            <div key={user.id} className="emf-card px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="material-icons text-primary text-base">person</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-content truncate">{user.full_name || '—'}</p>
                <p className="text-xs text-content-muted truncate">{user.email}</p>
              </div>
              <span className="emf-badge text-primary bg-primary/10 shrink-0">
                {ROLE_LABELS[user.role] || user.role}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(user)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-content-muted hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={`Editar ${user.full_name || user.email}`}
                  title="Editar"
                >
                  <span className="material-icons text-base">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(user)}
                  disabled={deletingId === user.id}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                  aria-label={`Excluir ${user.full_name || user.email}`}
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
            <label className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">Nome completo</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Nome completo"
              required
              className="emf-input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="email@exemplo.com"
              required
              className="emf-input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">
              Senha {editing && <span className="text-content-subtle normal-case font-normal">(deixe em branco para manter)</span>}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder={editing ? 'Nova senha (opcional)' : 'Senha inicial'}
              required={!editing}
              className="emf-input"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">Papel</label>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              className="emf-input"
            >
              {MANAGED_STAFF_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">Unidade</label>
            <input
              type="text"
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              placeholder="Ex: Unidade Centro"
              className="emf-input"
            />
          </div>
          <button type="submit" disabled={saving} className="emf-btn-primary w-full py-3">
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {editing ? 'Salvar alterações' : 'Criar usuário'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
