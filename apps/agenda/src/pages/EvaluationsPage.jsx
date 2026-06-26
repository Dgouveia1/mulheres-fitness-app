import { useEffect, useState } from 'react'
import { getClients, getAssessments, createAssessment } from '@emf/shared'
import { Modal } from '@emf/shared'
import { useToast } from '@emf/shared'
import { useAuth } from '@emf/shared'

const FIELDS = [
  { key: 'weight_kg', label: 'Peso (kg)', placeholder: '65.5' },
  { key: 'height_cm', label: 'Altura (cm)', placeholder: '165' },
  { key: 'body_fat_pct', label: '% Gordura', placeholder: '22.5' },
  { key: 'waist_cm', label: 'Cintura (cm)', placeholder: '70' },
  { key: 'hip_cm', label: 'Quadril (cm)', placeholder: '98' },
  { key: 'thigh_cm', label: 'Coxa (cm)', placeholder: '55' },
  { key: 'arm_cm', label: 'Braço (cm)', placeholder: '28' },
  { key: 'chest_cm', label: 'Busto (cm)', placeholder: '88' },
]

export function EvaluationsPage() {
  const { user } = useAuth()
  const { show } = useToast()
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [assessments, setAssessments] = useState([])
  const [loadingAssessments, setLoadingAssessments] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')

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

  async function handleSave(e) {
    e.preventDefault()
    if (!selectedClient) { show('Selecione uma aluna.', 'warning'); return }
    setSaving(true)
    const payload = {
      user_id: selectedClient,
      evaluated_by: user?.id,
      notes,
      ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, parseFloat(v) || null])),
    }
    const { data, error } = await createAssessment(payload)
    setSaving(false)
    if (error) { show('Erro ao salvar avaliação.', 'error'); return }
    setAssessments((prev) => [data, ...prev])
    show('Avaliação registrada!', 'success')
    setShowModal(false)
    setForm({})
    setNotes('')
  }

  const selectedClientName = clients.find((c) => c.id === selectedClient)?.full_name || ''

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Avaliações Físicas</h1>
        <button
          onClick={() => { if (!selectedClient) { show('Selecione uma aluna primeiro.', 'warning'); return }; setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all"
        >
          <span className="material-icons text-base">add</span>
          Nova Avaliação
        </button>
      </div>

      {/* Client selector */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Selecionar aluna</label>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors bg-white"
        >
          <option value="">Escolha uma aluna...</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
      </div>

      {/* Assessments history */}
      {selectedClient && (
        <div>
          <h2 className="text-sm font-bold text-gray-600 mb-3">Histórico de {selectedClientName}</h2>
          {loadingAssessments ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200">
              <span className="text-3xl">📋</span>
              <p className="text-sm text-gray-400 mt-2">Nenhuma avaliação registrada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assessments.map((a) => (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-gray-800">
                      {new Date(a.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {a.weight_kg && (
                      <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full">
                        <span className="text-sm font-bold">{a.weight_kg} kg</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {FIELDS.filter((f) => a[f.key] != null).map((f) => (
                      <div key={f.key} className="bg-gray-50 rounded-xl p-2 text-center">
                        <div className="text-sm font-bold text-gray-800">{a[f.key]}</div>
                        <div className="text-[10px] text-gray-400">{f.label}</div>
                      </div>
                    ))}
                  </div>
                  {a.notes && (
                    <p className="text-xs text-gray-500 mt-3 italic border-t border-gray-50 pt-3">{a.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New evaluation modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`Nova Avaliação — ${selectedClientName}`} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{f.label}</label>
                <input
                  type="number"
                  step="0.1"
                  value={form[f.key] || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notas da avaliação, objetivos, recomendações..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-primary transition-colors"
            />
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
