import { useEffect, useState } from 'react'
import { useAuth } from '@emf/shared'
import { getAppointments, createAppointment, updateAppointment, deleteAppointment, searchAppointments, checkAppointmentAvailability } from '@emf/shared'
import { Modal } from '@emf/shared'
import { useToast } from '@emf/shared'

// Monta o link de confirmação no WhatsApp (wa.me) com mensagem pronta.
function waLink(appt) {
  const digits = (appt?.telefone || '').replace(/\D/g, '')
  if (!digits) return null
  // número nacional (10-11 dígitos) recebe DDI 55; 12-13 dígitos já vêm com DDI
  const num = digits.length <= 11 ? `55${digits}` : digits
  const dataBR = appt.date ? appt.date.split('-').reverse().join('/') : ''
  const msg = `Olá, ${appt.client_name}! Confirmando seu agendamento de ${appt.type} no dia ${dataBR} às ${(appt.time || '').slice(0, 5)}. Qualquer dúvida, é só responder por aqui. 💪`
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

const APPT_TYPES = ['Treino', 'Avaliação Física', 'Consultoria', 'Reavaliação', 'Outro']
const STATUS_STYLES = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
  pending: 'bg-amber-100 text-amber-700',
}
const STATUS_LABELS = { confirmed: 'Confirmado', cancelled: 'Cancelado', pending: 'Pendente' }

function getWeekDays(date) {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export function AgendaPage() {
  const { show } = useToast()
  const { profile } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAppt, setEditingAppt] = useState(null)
  const [form, setForm] = useState({ client_name: '', telefone: '', type: 'Treino', time: '', status: 'confirmed' })
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  const dateStr = selectedDate.toISOString().split('T')[0]
  const weekDays = getWeekDays(selectedDate)

  useEffect(() => {
    loadDayAppts()
  }, [dateStr])

  async function loadDayAppts() {
    setLoading(true)
    const data = await getAppointments(dateStr, dateStr)
    setAppointments(data)
    setLoading(false)
  }

  async function handleSearch() {
    if (!searchTerm.trim()) return
    setSearching(true)
    const data = await searchAppointments(searchTerm)
    setSearchResults(data)
    setSearching(false)
  }

  function openCreate() {
    setEditingAppt(null)
    setForm({ client_name: '', telefone: '', type: 'Treino', time: '', status: 'confirmed' })
    setShowModal(true)
  }

  function openEdit(appt) {
    setEditingAppt(appt)
    setForm({ client_name: appt.client_name, telefone: appt.telefone || '', type: appt.type, time: appt.time, status: appt.status })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    // Trava de conflito: impede dois agendamentos no mesmo dia/horário/tipo
    const { available } = await checkAppointmentAvailability(dateStr, form.time, form.type, editingAppt?.id)
    if (!available) {
      setSaving(false)
      show('Já existe um agendamento neste horário para este tipo.', 'error')
      return
    }

    const payload = { ...form, date: dateStr, unit: profile?.unit || 'Central' }
    let saved = null
    if (editingAppt) {
      const { data, error } = await updateAppointment(editingAppt.id, payload)
      if (error) show('Erro ao atualizar.', 'error')
      else { saved = data; setAppointments((prev) => prev.map((a) => a.id === editingAppt.id ? data : a)); show('Atualizado!', 'success') }
    } else {
      const { data, error } = await createAppointment(payload)
      if (error) show('Erro ao criar.', 'error')
      else { saved = data; setAppointments((prev) => [...prev, data].sort((a, b) => a.time.localeCompare(b.time))); show('Agendado!', 'success') }
    }
    setSaving(false)
    if (saved) {
      setShowModal(false)
      // Abre a confirmação no WhatsApp (best-effort; também há botão 💬 por agendamento)
      const link = waLink(saved)
      if (link) {
        const w = window.open(link, '_blank')
        if (!w) show('Toque no ícone de WhatsApp no agendamento para confirmar.', 'info')
      }
    }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir agendamento?')) return
    const { error } = await deleteAppointment(id)
    if (error) show('Erro ao excluir.', 'error')
    else { setAppointments((prev) => prev.filter((a) => a.id !== id)); show('Excluído!', 'success') }
  }

  function changeWeek(dir) {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + dir * 7)
    setSelectedDate(d)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Agenda</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all"
        >
          <span className="material-icons text-base">add</span>
          Agendar
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Buscar por nome..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2.5 bg-gray-100 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors">
          Buscar
        </button>
      </div>

      {/* Calendar nav */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <button onClick={() => changeWeek(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <span className="material-icons text-gray-500">chevron_left</span>
          </button>
          <span className="text-sm font-bold text-gray-700">{MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}</span>
          <button onClick={() => changeWeek(1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
            <span className="material-icons text-gray-500">chevron_right</span>
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0 px-2 py-2">
          {weekDays.map((day, i) => {
            const isSelected = day.toISOString().split('T')[0] === dateStr
            const isToday = day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center py-2 rounded-xl transition-all ${isSelected ? 'bg-primary text-white' : 'hover:bg-gray-50'}`}
              >
                <span className={`text-[10px] font-medium ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>{DAY_LABELS[i]}</span>
                <span className={`text-sm font-bold mt-0.5 ${isSelected ? 'text-white' : isToday ? 'text-primary' : 'text-gray-700'}`}>{day.getDate()}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-600">Resultados da busca</h2>
            <button onClick={() => setSearchResults([])} className="text-xs text-primary font-semibold">Limpar</button>
          </div>
          {searchResults.map((appt) => (
            <div key={appt.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
              <div className="text-center min-w-[56px]">
                <div className="text-xs font-bold text-primary">{appt.time?.slice(0, 5)}</div>
                <div className="text-[10px] text-gray-400">{appt.date}</div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{appt.client_name}</p>
                <p className="text-xs text-gray-400">{appt.type}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[appt.status] || STATUS_STYLES.pending}`}>
                {STATUS_LABELS[appt.status] || appt.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Day appointments */}
      <div>
        <h2 className="text-sm font-bold text-gray-600 mb-3">
          {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
            <span className="text-3xl">📅</span>
            <p className="text-sm text-gray-400 mt-2">Nenhum agendamento neste dia.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((appt) => (
              <div key={appt.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                <div className="text-center min-w-[48px]">
                  <div className="text-sm font-bold text-primary">{appt.time?.slice(0, 5)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{appt.client_name}</p>
                  <p className="text-xs text-gray-400">{appt.type}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[appt.status] || STATUS_STYLES.pending}`}>
                  {STATUS_LABELS[appt.status] || appt.status}
                </span>
                <div className="flex items-center gap-1">
                  {appt.telefone && (
                    <button
                      onClick={() => { const l = waLink(appt); if (l) window.open(l, '_blank') }}
                      title="Confirmar no WhatsApp"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      <span className="material-icons text-emerald-500 text-base">chat</span>
                    </button>
                  )}
                  <button onClick={() => openEdit(appt)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="material-icons text-gray-400 text-base">edit</span>
                  </button>
                  <button onClick={() => handleDelete(appt.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors">
                    <span className="material-icons text-red-400 text-base">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editingAppt ? 'Editar Agendamento' : 'Novo Agendamento'}>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nome da aluna</label>
            <input
              value={form.client_name}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
              required
              placeholder="Nome da aluna"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">WhatsApp (telefone)</label>
            <input
              type="tel"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              placeholder="(00) 00000-0000"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Horário</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors bg-white"
              >
                <option value="confirmed">Confirmado</option>
                <option value="pending">Pendente</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors bg-white"
            >
              {APPT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-60 active:scale-95 transition-all"
          >
            {editingAppt ? 'Salvar Alterações' : 'Criar Agendamento'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
