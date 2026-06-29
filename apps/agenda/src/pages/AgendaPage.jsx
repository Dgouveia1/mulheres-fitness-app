import { useEffect, useState, useCallback } from 'react'
import {
  useAuth,
  useToast,
  Modal,
  getAppointments,
  searchAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  checkAppointmentAvailability,
} from '@emf/shared'

// ---------------------------------------------------------------------------
// Tipos de agendamento (mesmos valores do banco em produção: fisica/nutri/personal)
// ---------------------------------------------------------------------------
const TYPE_META = {
  fisica: { label: 'Avaliação Física', short: 'Avaliação', tab: 'Avaliação', dot: 'bg-primary', card: 'bg-primary/10 border-primary/40 text-primary' },
  nutri: { label: 'Consulta Nutricional', short: 'Nutri', tab: 'Nutrição', dot: 'bg-emerald-500', card: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
  personal: { label: 'Treino Personal', short: 'Personal', tab: 'Personal', dot: 'bg-blue-500', card: 'bg-blue-100 border-blue-300 text-blue-700' },
}
const TYPE_ORDER = ['fisica', 'nutri', 'personal']
const FILTER_TABS = [{ key: 'all', label: 'Todos' }, ...TYPE_ORDER.map((t) => ({ key: t, label: TYPE_META[t].tab }))]
const VIEWS = [{ key: 'day', label: 'Dia' }, { key: 'week', label: 'Semana' }, { key: 'month', label: 'Mês' }]
const DURATIONS = [{ v: 30, l: '30 min' }, { v: 60, l: '1 hora' }, { v: 90, l: '1h 30m' }, { v: 120, l: '2 horas' }]
const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MINI_DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const START_HOUR = 6
const END_HOUR = 22
const HOURS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

// ---------------------------------------------------------------------------
// Helpers de data (locais, à prova de fuso — sem toISOString)
// ---------------------------------------------------------------------------
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const isSameDay = (a, b) => a.toDateString() === b.toDateString()

function startOfWeek(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function durationToMin(duration) {
  if (!duration) return 60
  if (typeof duration === 'number') return duration
  if (typeof duration === 'string' && duration.includes(':')) {
    const [h, m] = duration.split(':').map(Number)
    return (h * 60) + (m || 0)
  }
  return 60
}

function minToDurationStr(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`
}

// Posiciona eventos em "lanes" para não sobrepor (mesma lógica do app de produção)
function processOverlaps(appointments) {
  const events = appointments
    .map((app) => {
      const [h, m] = (app.time || '00:00').split(':').map(Number)
      const startMin = h * 60 + (m || 0)
      const durationMin = durationToMin(app.duration)
      return { ...app, startMin, endMin: startMin + durationMin, durationMin }
    })
    .sort((a, b) => a.startMin - b.startMin)

  const lanes = []
  events.forEach((event) => {
    let placed = false
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i]
      if (event.startMin >= lane[lane.length - 1].endMin) {
        lane.push(event)
        event.laneIndex = i
        placed = true
        break
      }
    }
    if (!placed) {
      lanes.push([event])
      event.laneIndex = lanes.length - 1
    }
  })
  const total = lanes.length || 1
  events.forEach((e) => {
    e.width = 100 / total
    e.left = e.laneIndex * e.width
  })
  return events
}

const STATUS_META = {
  confirmed: { label: 'Confirmado', dot: 'bg-emerald-500' },
  pending: { label: 'Pendente', dot: 'bg-amber-500' },
  cancelled: { label: 'Cancelado', dot: 'bg-red-500' },
}

const EMPTY_FORM = { id: null, client_name: '', telefone: '', date: '', time: '09:00', duration: 60, type: 'fisica', status: 'pending', unit: 'Central' }

function waMessage(appt) {
  const digits = (appt.telefone || '').replace(/\D/g, '')
  if (digits.length < 10) return null
  const num = digits.length <= 11 ? `55${digits}` : digits
  const first = (appt.client_name || '').split(' ')[0]
  const tipo = TYPE_META[appt.type]?.label || appt.type
  const dataBR = appt.date ? appt.date.split('-').reverse().join('/') : ''
  const hora = (appt.time || '').slice(0, 5)
  const msg = `Olá ${first}! Seu agendamento de *${tipo}* no Espaço Mulher Fitness está confirmado para o dia *${dataBR}* às *${hora}*. 💪`
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

export function AgendaPage() {
  const { show } = useToast()
  const { profile } = useAuth()
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [view, setView] = useState('day')
  const [filter, setFilter] = useState('all')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState(null) // null = não está em modo busca

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [miniMonth, setMiniMonth] = useState(() => new Date())
  const [calOpen, setCalOpen] = useState(() => {
    try { return localStorage.getItem('emf-agenda-cal') !== '0' } catch { return true }
  })

  // Persiste o estado recolhido/expandido do calendário.
  useEffect(() => {
    try { localStorage.setItem('emf-agenda-cal', calOpen ? '1' : '0') } catch { /* ignore */ }
  }, [calOpen])

  // Mantém o mini-calendário alinhado com a data atual.
  useEffect(() => {
    setMiniMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1))
  }, [currentDate])

  // Range de datas conforme a visão atual
  const loadAppointments = useCallback(async () => {
    setLoading(true)
    let startStr, endStr
    if (view === 'day') {
      startStr = endStr = ymd(currentDate)
    } else if (view === 'week') {
      const s = startOfWeek(currentDate)
      const e = new Date(s); e.setDate(e.getDate() + 6)
      startStr = ymd(s); endStr = ymd(e)
    } else {
      const y = currentDate.getFullYear(); const m = currentDate.getMonth()
      startStr = ymd(new Date(y, m, 1)); endStr = ymd(new Date(y, m + 1, 0))
    }
    const data = await getAppointments(startStr, endStr)
    setAppointments(data)
    setLoading(false)
  }, [view, currentDate])

  useEffect(() => {
    if (searchResults === null) loadAppointments()
  }, [loadAppointments, searchResults])

  function changeDate(offset) {
    const d = new Date(currentDate)
    if (view === 'day') d.setDate(d.getDate() + offset)
    else if (view === 'week') d.setDate(d.getDate() + offset * 7)
    else d.setMonth(d.getMonth() + offset)
    setCurrentDate(d)
  }

  function selectDayFromMonth(dateStr) {
    const [y, m, dd] = dateStr.split('-').map(Number)
    setCurrentDate(new Date(y, m - 1, dd))
    setView('day')
  }

  // Mini-calendário: escolher um dia → visão de dia (sai da busca se ativa).
  function pickDay(dObj) {
    setSearchResults(null)
    setSearchTerm('')
    setCurrentDate(dObj)
    setView('day')
  }
  function goToday() {
    pickDay(new Date())
  }

  async function runSearch() {
    const term = searchTerm.trim()
    if (!term) { setSearchResults(null); return }
    setLoading(true)
    const data = await searchAppointments(term)
    setSearchResults(data)
    setLoading(false)
  }

  function clearSearch() {
    setSearchTerm('')
    setSearchResults(null)
  }

  const filtered = filter === 'all' ? appointments : appointments.filter((a) => a.type === filter)

  // ----- Modal -----
  function openCreate() {
    setForm({ ...EMPTY_FORM, date: ymd(currentDate) })
    setShowModal(true)
  }

  function openEdit(appt) {
    setForm({
      id: appt.id,
      client_name: appt.client_name || '',
      telefone: appt.telefone || '',
      date: appt.date,
      time: (appt.time || '09:00').slice(0, 5),
      duration: durationToMin(appt.duration),
      type: appt.type || 'fisica',
      status: appt.status || 'pending',
      unit: appt.unit || 'Central',
    })
    setShowModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const { available } = await checkAppointmentAvailability(form.date, form.time, form.type, form.id)
    if (!available) {
      setSaving(false)
      show(`Conflito: já existe um agendamento de ${TYPE_META[form.type]?.short || form.type} neste horário.`, 'error')
      return
    }
    const payload = {
      client_name: form.client_name,
      telefone: form.telefone,
      date: form.date,
      time: form.time,
      type: form.type,
      status: form.status,
      unit: profile?.unit || 'Central',
      duration: minToDurationStr(Number(form.duration) || 60),
    }
    const { data, error } = form.id
      ? await updateAppointment(form.id, payload)
      : await createAppointment(payload)
    setSaving(false)
    if (error) { show('Erro ao salvar agendamento.', 'error'); return }
    show('Agendamento salvo!', 'success')
    setShowModal(false)
    if (searchResults === null) loadAppointments()
    const link = waMessage({ ...payload })
    if (link) window.open(link, '_blank')
  }

  async function handleDelete() {
    if (!form.id) return
    if (!confirm('Excluir este agendamento?')) return
    const { error } = await deleteAppointment(form.id)
    if (error) { show('Erro ao excluir.', 'error'); return }
    show('Agendamento excluído.', 'success')
    setShowModal(false)
    if (searchResults === null) loadAppointments()
  }

  // ----- Título da data -----
  let dateLabel = ''
  if (searchResults !== null) {
    dateLabel = `Resultados para: "${searchTerm}"`
  } else if (view === 'day') {
    dateLabel = currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } else if (view === 'week') {
    const s = startOfWeek(currentDate); const e = new Date(s); e.setDate(e.getDate() + 6)
    dateLabel = `${s.getDate()} a ${e.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`
  } else {
    const m = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    dateLabel = m.charAt(0).toUpperCase() + m.slice(1)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-content">Agenda Inteligente</h1>
          <div className="relative mt-2 max-w-xs">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-content-subtle text-lg">search</span>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder="Buscar aluna..."
              aria-label="Buscar aluna"
              className="w-full pl-10 pr-9 py-2 rounded-full border border-line bg-surface text-content placeholder:text-content-subtle text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary transition-colors"
            />
            {searchResults !== null && (
              <button onClick={clearSearch} aria-label="Limpar busca" title="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted">
                <span className="material-icons text-content-muted text-base">close</span>
              </button>
            )}
          </div>
        </div>
        <button onClick={openCreate} className="emf-btn-primary rounded-full shrink-0">
          <span className="material-icons text-base">add</span>
          Novo Agendamento
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Coluna esquerda: mini-calendário + legenda (desktop, recolhível) */}
        <div className={`${calOpen ? 'hidden lg:flex' : 'hidden'} w-72 shrink-0 flex-col gap-4 lg:sticky lg:top-6`}>
          <MiniCalendar
            monthDate={miniMonth}
            selected={currentDate}
            onPrevMonth={() => setMiniMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            onNextMonth={() => setMiniMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            onPick={pickDay}
            onToday={goToday}
            onCollapse={() => setCalOpen(false)}
          />
          <Legend />
        </div>

        {/* Coluna direita: controles + toolbar + corpo */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Controles: filtros + visões */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-1 bg-muted rounded-full p-1 w-fit">
              {FILTER_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === t.key ? 'bg-surface text-primary shadow-sm' : 'text-content-muted hover:text-content'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-full p-1 w-fit">
              {VIEWS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setView(v.key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${view === v.key ? 'bg-surface text-primary shadow-sm' : 'text-content-muted hover:text-content'}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toolbar de data */}
          {searchResults === null && (
            <div className="emf-card px-3 py-2.5 flex items-center justify-between gap-2">
              <button onClick={() => changeDate(-1)} aria-label="Anterior" className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <span className="material-icons text-content-muted">chevron_left</span>
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-content capitalize text-center truncate">{dateLabel}</h2>
                <button
                  onClick={() => setCalOpen((s) => !s)}
                  aria-label={calOpen ? 'Ocultar calendário' : 'Mostrar calendário'}
                  aria-expanded={calOpen}
                  title={calOpen ? 'Ocultar calendário' : 'Mostrar calendário'}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0 ${calOpen ? 'bg-primary/10 text-primary' : 'text-content-muted hover:bg-muted'}`}
                >
                  <span className="material-icons text-lg">calendar_month</span>
                </button>
              </div>
              <button onClick={() => changeDate(1)} aria-label="Próximo" className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors">
                <span className="material-icons text-content-muted">chevron_right</span>
              </button>
            </div>
          )}

          {/* Mini-calendário colapsável (mobile) */}
          {calOpen && searchResults === null && (
            <div className="lg:hidden">
              <MiniCalendar
                monthDate={miniMonth}
                selected={currentDate}
                onPrevMonth={() => setMiniMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                onNextMonth={() => setMiniMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                onPick={pickDay}
                onToday={goToday}
                onCollapse={() => setCalOpen(false)}
              />
            </div>
          )}

          {/* Corpo */}
          {loading ? (
            <div className="emf-card p-12 flex justify-center">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : searchResults !== null ? (
            <SearchResults results={searchResults} onOpen={openEdit} />
          ) : view === 'day' ? (
            <DayGrid date={currentDate} appointments={filtered} onOpen={openEdit} />
          ) : view === 'week' ? (
            <WeekGrid date={currentDate} appointments={filtered} onOpen={openEdit} />
          ) : (
            <MonthGrid date={currentDate} appointments={filtered} onSelectDay={selectDayFromMonth} />
          )}
        </div>
      </div>

      {/* Modal de agendamento */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={form.id ? 'Editar Agendamento' : 'Novo Agendamento'} size="lg">
        <form onSubmit={handleSave} className="space-y-3">
          <Field label="Cliente">
            <input
              value={form.client_name}
              onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
              required placeholder="Nome da cliente"
              className="emf-input"
            />
          </Field>
          <Field label="Telefone (WhatsApp)" hint="Inclua o DDD.">
            <input
              type="tel"
              value={form.telefone}
              onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              placeholder="11999999999"
              className="emf-input"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required className="emf-input" />
            </Field>
            <Field label="Hora início">
              <input type="time" step={1800} value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} required className="emf-input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duração">
              <select value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))} className="emf-input">
                {DURATIONS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
              </select>
            </Field>
            <Field label="Tipo">
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="emf-input">
                {TYPE_ORDER.map((t) => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Status">
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="emf-input">
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </Field>

          <div className="flex items-center pt-2">
            {form.id && (
              <button type="button" onClick={handleDelete} className="px-4 py-2.5 text-sm font-semibold text-red-500 rounded-xl hover:bg-red-500/10 transition-colors">
                Excluir
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={() => setShowModal(false)} className="emf-btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="emf-btn-primary">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Salvar e Enviar
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------
function MiniCalendar({ monthDate, selected, onPrevMonth, onNextMonth, onPick, onToday, onCollapse }) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = firstDay.getDay()
  const today = new Date()
  const cells = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  const monthLabel = monthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="emf-card p-4">
      {onCollapse && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-content-muted">Calendário</span>
          <button onClick={onCollapse} aria-label="Recolher calendário" title="Recolher calendário" className="w-7 h-7 flex items-center justify-center rounded-lg text-content-muted hover:bg-muted transition-colors">
            <span className="material-icons text-base">close</span>
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrevMonth} aria-label="Mês anterior" className="w-8 h-8 flex items-center justify-center rounded-lg text-content-muted hover:bg-muted transition-colors">
          <span className="material-icons text-lg">chevron_left</span>
        </button>
        <span className="text-sm font-bold text-content capitalize">{monthLabel}</span>
        <button onClick={onNextMonth} aria-label="Próximo mês" className="w-8 h-8 flex items-center justify-center rounded-lg text-content-muted hover:bg-muted transition-colors">
          <span className="material-icons text-lg">chevron_right</span>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {MINI_DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-content-subtle">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e${idx}`} />
          const dObj = new Date(year, month, day)
          const isToday = isSameDay(dObj, today)
          const isSel = isSameDay(dObj, selected)
          return (
            <button
              key={day}
              onClick={() => onPick(dObj)}
              aria-label={`Selecionar dia ${day}`}
              aria-current={isSel ? 'date' : undefined}
              className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isSel ? 'bg-primary text-white' : isToday ? 'text-primary font-bold ring-1 ring-primary/40' : 'text-content hover:bg-muted'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
      <button onClick={onToday} className="mt-3 w-full text-center text-xs font-semibold text-primary hover:underline">
        Hoje
      </button>
    </div>
  )
}

function Legend() {
  return (
    <div className="emf-card p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-content-muted mb-2">Tipos</div>
      <div className="space-y-2">
        {TYPE_ORDER.map((t) => (
          <div key={t} className="flex items-center gap-2 text-sm text-content">
            <span className={`w-2.5 h-2.5 rounded-full ${TYPE_META[t].dot}`} />
            {TYPE_META[t].label}
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-content-muted uppercase tracking-wider mb-1">{label}</label>
      {children}
      {hint && <small className="text-[11px] text-content-subtle">{hint}</small>}
    </div>
  )
}

function ApptCard({ evt, hourPx, compact, onOpen }) {
  const meta = TYPE_META[evt.type] || TYPE_META.fisica
  const top = (evt.startMin - START_HOUR * 60) * (hourPx / 60)
  const height = Math.max(evt.durationMin * (hourPx / 60) - 2, 22)
  const cancelled = evt.status === 'cancelled'
  const time = (evt.time || '').slice(0, 5)
  const fullName = evt.client_name || ''
  const name = compact ? fullName.split(' ')[0] : fullName
  // Cartões curtos (ex.: 30 min) mostram hora + nome numa única linha truncada
  // para o nome aparecer sempre, sem vazar para o slot de baixo.
  const tiny = height < 42
  return (
    <button
      onClick={() => onOpen(evt)}
      title={`${time} · ${fullName} — ${meta.short}`}
      style={{ top, height, left: `${evt.left}%`, width: `calc(${evt.width}% - 4px)` }}
      className={`absolute rounded-lg border px-2 overflow-hidden text-left ${meta.card} ${cancelled ? 'opacity-50 line-through' : ''} hover:brightness-95 transition-all ${tiny ? 'py-0.5 flex items-center gap-1.5' : 'py-1 flex flex-col justify-start'}`}
    >
      {tiny ? (
        <>
          <span className="text-[10px] font-bold shrink-0">{time}</span>
          <span className="text-[11px] font-semibold truncate">{name}</span>
        </>
      ) : (
        <>
          <div className="text-[10px] font-bold leading-tight">{time}</div>
          <div className="text-xs font-semibold truncate leading-tight">{name}</div>
          {!compact && height >= 58 && <div className="text-[10px] opacity-80 truncate">{meta.short}</div>}
        </>
      )}
    </button>
  )
}

function EmptyDay() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-content-subtle pointer-events-none">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-2">
        <span className="material-icons text-content-subtle">event_available</span>
      </div>
      <p className="text-sm">Nenhum agendamento</p>
    </div>
  )
}

function DayGrid({ date, appointments, onOpen }) {
  const HOUR_PX = 64
  const total = (END_HOUR - START_HOUR) * HOUR_PX
  const events = processOverlaps(appointments.filter((a) => a.date === ymd(date)))
  return (
    <div className="emf-card p-3 overflow-x-auto">
      <div className="flex min-w-[320px]">
        <div className="w-12 shrink-0 relative" style={{ height: total }}>
          {HOURS.map((h) => (
            <div key={h} className="absolute right-1 -translate-y-1/2 text-[10px] text-content-subtle" style={{ top: (h - START_HOUR) * HOUR_PX }}>{h}:00</div>
          ))}
        </div>
        <div className="relative flex-1 border-l border-line" style={{ height: total }}>
          {HOURS.map((h) => (
            <div key={h} className="absolute left-0 right-0 border-t border-line" style={{ top: (h - START_HOUR) * HOUR_PX }} />
          ))}
          {events.length === 0 && <EmptyDay />}
          {events.map((evt) => <ApptCard key={evt.id} evt={evt} hourPx={HOUR_PX} onOpen={onOpen} />)}
        </div>
      </div>
    </div>
  )
}

function WeekGrid({ date, appointments, onOpen }) {
  const HOUR_PX = 46
  const total = (END_HOUR - START_HOUR) * HOUR_PX
  const start = startOfWeek(date)
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
  const today = new Date()
  return (
    <div className="emf-card p-3 overflow-x-auto">
      <div className="min-w-[640px]">
        {/* Header dos dias */}
        <div className="flex border-b border-line pb-2 mb-1">
          <div className="w-10 shrink-0" />
          {days.map((d, i) => (
            <div key={i} className={`flex-1 text-center text-xs font-semibold ${isSameDay(d, today) ? 'text-primary' : 'text-content-muted'}`}>
              {DAY_LABELS[d.getDay()]} {d.getDate()}
            </div>
          ))}
        </div>
        {/* Corpo */}
        <div className="flex" style={{ height: total }}>
          <div className="w-10 shrink-0 relative">
            {HOURS.map((h) => (
              <div key={h} className="absolute right-1 -translate-y-1/2 text-[10px] text-content-subtle" style={{ top: (h - START_HOUR) * HOUR_PX }}>{h}h</div>
            ))}
          </div>
          {days.map((d, i) => {
            const evts = processOverlaps(appointments.filter((a) => a.date === ymd(d)))
            return (
              <div key={i} className="flex-1 relative border-l border-line">
                {HOURS.map((h) => (
                  <div key={h} className="absolute left-0 right-0 border-t border-line/60" style={{ top: (h - START_HOUR) * HOUR_PX }} />
                ))}
                {evts.map((evt) => <ApptCard key={evt.id} evt={evt} hourPx={HOUR_PX} compact onOpen={onOpen} />)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MonthGrid({ date, appointments, onSelectDay }) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = firstDay.getDay()
  const today = new Date()
  const cells = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="emf-card p-3">
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d) => <div key={d} className="text-center text-[11px] font-semibold text-content-muted py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-line rounded-xl overflow-hidden">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e${idx}`} className="bg-surface min-h-[72px]" />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayApps = appointments.filter((a) => a.date === dateStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
          const isToday = isSameDay(new Date(year, month, day), today)
          return (
            <button
              key={dateStr}
              onClick={() => onSelectDay(dateStr)}
              className="bg-surface min-h-[72px] sm:min-h-[92px] p-1 text-left hover:bg-muted transition-colors flex flex-col gap-0.5"
            >
              <span className={`text-xs font-bold ${isToday ? 'bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-content-muted'}`}>{day}</span>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayApps.slice(0, 3).map((a) => {
                  const meta = TYPE_META[a.type] || TYPE_META.fisica
                  return (
                    <span key={a.id} className={`text-[9px] leading-tight truncate px-1 rounded ${meta.card}`}>
                      {(a.time || '').slice(0, 5)} {(a.client_name || '').split(' ')[0]}
                    </span>
                  )
                })}
                {dayApps.length > 3 && <span className="text-[9px] text-content-subtle px-1">+{dayApps.length - 3}</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SearchResults({ results, onOpen }) {
  if (!results.length) {
    return (
      <div className="text-center py-12 emf-card border-dashed">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
          <span className="material-icons text-content-subtle">search_off</span>
        </div>
        <p className="text-sm text-content-muted">Nenhum agendamento encontrado.</p>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {results.map((appt) => {
        const meta = TYPE_META[appt.type] || TYPE_META.fisica
        const st = STATUS_META[appt.status] || STATUS_META.pending
        return (
          <button
            key={appt.id}
            onClick={() => onOpen(appt)}
            className="w-full emf-card px-4 py-3 flex items-center gap-3 text-left hover:bg-muted transition-colors"
          >
            <div className="text-center min-w-[60px]">
              <div className="text-sm font-bold text-primary">{(appt.time || '').slice(0, 5)}</div>
              <div className="text-[10px] text-content-subtle">{appt.date ? appt.date.split('-').reverse().join('/') : ''}</div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-content truncate">{appt.client_name}</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${meta.card}`}>{meta.short}</span>
            </div>
            <span className="flex items-center gap-1 text-xs text-content-muted">
              <span className={`w-2 h-2 rounded-full ${st.dot}`} /> {st.label}
            </span>
            <span className="material-icons text-content-subtle">chevron_right</span>
          </button>
        )
      })}
    </div>
  )
}
