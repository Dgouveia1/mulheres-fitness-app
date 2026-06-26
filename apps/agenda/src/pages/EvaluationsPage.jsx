import { useEffect, useState } from 'react'
import { getClients, getAssessments, createAssessment, Modal, useToast } from '@emf/shared'

// Medidas guardadas no JSON `measurements` (mesmo formato do app de produção).
const MEASURES = [
  { key: 'bust', label: 'Busto' },
  { key: 'waist', label: 'Cintura' },
  { key: 'abdomen', label: 'Abdômen' },
  { key: 'hip', label: 'Quadril' },
  { key: 'thigh_r', label: 'Coxa D.' },
  { key: 'thigh_l', label: 'Coxa E.' },
]

const EMPTY_FORM = { weight: '', height: '', bust: '', waist: '', abdomen: '', hip: '', thigh_r: '', thigh_l: '', notes: '' }

function imc(weight, height) {
  const w = parseFloat(weight); const h = parseFloat(height)
  if (!w || !h) return null
  return w / (h * h)
}

function imcColor(v) {
  if (v == null) return 'text-gray-400'
  if (v < 18.5) return 'text-blue-500'
  if (v < 24.9) return 'text-emerald-500'
  if (v < 29.9) return 'text-amber-500'
  return 'text-red-500'
}

function EvolutionChart({ assessments }) {
  // Últimas 10, em ordem cronológica (antigo -> novo)
  const data = assessments.slice(0, 10).reverse().filter((a) => a.weight != null)
  if (data.length < 2) {
    return <p className="text-sm text-gray-400 text-center py-8">Precisa de pelo menos 2 avaliações para gerar o gráfico.</p>
  }
  const weights = data.map((d) => Number(d.weight))
  const minW = Math.min(...weights) - 2
  const maxW = Math.max(...weights) + 2
  const range = maxW - minW || 1
  return (
    <div className="flex items-end justify-between gap-2 h-40 px-1">
      {data.map((d, i) => {
        const pct = ((Number(d.weight) - minW) / range) * 100
        const date = new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
            <span className="text-[10px] font-bold text-gray-600">{d.weight}</span>
            <div className="w-full bg-primary/70 rounded-t-md" style={{ height: `${Math.max(8, pct)}%` }} />
            <span className="text-[9px] text-gray-400">{date}</span>
          </div>
        )
      })}
    </div>
  )
}

export function EvaluationsPage() {
  const { show } = useToast()
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [assessments, setAssessments] = useState([])
  const [loadingAssessments, setLoadingAssessments] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getClients().then(setClients)
  }, [])

  useEffect(() => {
    if (!selectedClient) { setAssessments([]); return }
    setLoadingAssessments(true)
    getAssessments(selectedClient).then((data) => {
      setAssessments(data)
      setLoadingAssessments(false)
    })
  }, [selectedClient])

  const selectedClientName = clients.find((c) => c.id === selectedClient)?.full_name || ''
  const latest = assessments[0] || null
  const latestImc = latest ? imc(latest.weight, latest.height) : null

  async function handleSave(e) {
    e.preventDefault()
    if (!selectedClient) { show('Selecione uma aluna.', 'warning'); return }
    const weight = parseFloat(form.weight)
    // Altura em metros; se vazia, herda da última avaliação
    let height = parseFloat(form.height)
    if (!height && latest?.height) height = Number(latest.height)
    if (!weight || !height) { show('Peso e altura são obrigatórios (ou histórico anterior de altura).', 'warning'); return }

    setSaving(true)
    const measurements = {}
    MEASURES.forEach(({ key }) => { if (form[key] !== '') measurements[key] = parseFloat(form[key]) })
    const payload = { user_id: selectedClient, weight, height, measurements, notes: form.notes }
    const { data, error } = await createAssessment(payload)
    setSaving(false)
    if (error) { show('Erro ao salvar avaliação.', 'error'); return }
    setAssessments((prev) => [data, ...prev])
    show('Avaliação registrada!', 'success')
    setShowModal(false)
    setForm(EMPTY_FORM)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Avaliações Físicas</h1>
        <button
          onClick={() => { if (!selectedClient) { show('Selecione uma aluna primeiro.', 'warning'); return } setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all"
        >
          <span className="material-icons text-base">add</span>
          Nova Avaliação
        </button>
      </div>

      {/* Seletor de aluna */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Selecionar aluna</label>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="emf-input bg-white"
        >
          <option value="">Escolha uma aluna...</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
      </div>

      {selectedClient && (
        loadingAssessments ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 flex justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : assessments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
            <span className="text-3xl">📋</span>
            <p className="text-sm text-gray-400 mt-2">Nenhuma avaliação registrada para {selectedClientName}.</p>
          </div>
        ) : (
          <>
            {/* Stats atuais */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">IMC Atual</div>
                <div className={`text-2xl font-extrabold ${imcColor(latestImc)}`}>{latestImc ? latestImc.toFixed(1) : '--'}</div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">Peso Atual</div>
                <div className="text-2xl font-extrabold text-gray-800">{latest?.weight ?? '--'}<span className="text-sm font-semibold text-gray-400"> kg</span></div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
                <div className="text-xs text-gray-400 mb-1">Altura</div>
                <div className="text-2xl font-extrabold text-gray-800">{latest?.height ?? '--'}<span className="text-sm font-semibold text-gray-400"> m</span></div>
              </div>
            </div>

            {/* Gráfico de evolução */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h2 className="text-sm font-bold text-gray-600 mb-3">Evolução de Peso</h2>
              <EvolutionChart assessments={assessments} />
            </div>

            {/* Histórico */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <h2 className="text-sm font-bold text-gray-600 p-4 pb-2">Histórico de {selectedClientName}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="px-4 py-2 font-semibold">Data</th>
                      <th className="px-2 py-2 font-semibold">Peso</th>
                      <th className="px-2 py-2 font-semibold">Cintura</th>
                      <th className="px-2 py-2 font-semibold">Quadril</th>
                      <th className="px-4 py-2 font-semibold text-right">IMC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessments.map((a) => {
                      const v = imc(a.weight, a.height)
                      return (
                        <tr key={a.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-2.5 text-gray-600">{new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
                          <td className="px-2 py-2.5 font-semibold text-gray-800">{a.weight} kg</td>
                          <td className="px-2 py-2.5 text-gray-600">{a.measurements?.waist ?? '—'}</td>
                          <td className="px-2 py-2.5 text-gray-600">{a.measurements?.hip ?? '—'}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`font-bold ${imcColor(v)}`}>{v ? v.toFixed(1) : '—'}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}

      {/* Modal Nova Avaliação */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Nova Avaliação — ${selectedClientName}`} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Peso (kg)</label>
              <input type="number" step="0.1" value={form.weight} onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))} placeholder="65.5" required className="emf-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Altura (m)</label>
              <input type="number" step="0.01" value={form.height} onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))} placeholder="1.65" className="emf-input" />
              <small className="text-[11px] text-gray-400">Em branco mantém a anterior.</small>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Medidas (cm)</h4>
            <div className="grid grid-cols-3 gap-3">
              {MEASURES.map((m) => (
                <div key={m.key}>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">{m.label}</label>
                  <input type="number" step="0.5" value={form[m.key]} onChange={(e) => setForm((f) => ({ ...f, [m.key]: e.target.value }))} className="emf-input !px-3 !py-2" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Observações</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Notas, objetivos, recomendações..." className="emf-input resize-none" />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Salvar Avaliação
          </button>
        </form>
      </Modal>
    </div>
  )
}
