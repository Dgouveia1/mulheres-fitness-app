import { useEffect, useState } from 'react'
import { getAllExercises, createExercise, updateExercise, deleteExercise, getClients, createWorkoutRoutine } from '@emf/shared'
import { Modal } from '@emf/shared'
import { useToast } from '@emf/shared'
import { useAuth } from '@emf/shared'

const MUSCLE_GROUPS = ['Pernas', 'Glúteos', 'Costas', 'Peito', 'Ombros', 'Braços', 'Abdômen', 'Cardio']

export function WorkoutsAdminPage() {
  const { user } = useAuth()
  const { show } = useToast()
  const [activeTab, setActiveTab] = useState('library')
  const [exercises, setExercises] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchEx, setSearchEx] = useState('')
  const [showExModal, setShowExModal] = useState(false)
  const [editingEx, setEditingEx] = useState(null)
  const [exForm, setExForm] = useState({ name: '', muscle_group: 'pernas', description: '' })
  const [savingEx, setSavingEx] = useState(false)
  // Builder
  const [builderName, setBuilderName] = useState('')
  const [assignTo, setAssignTo] = useState('')
  const [builderItems, setBuilderItems] = useState([])
  const [savingWorkout, setSavingWorkout] = useState(false)

  useEffect(() => {
    Promise.all([getAllExercises(), getClients()]).then(([exs, cls]) => {
      setExercises(exs)
      setClients(cls)
      setLoading(false)
    })
  }, [])

  const filteredEx = exercises.filter((e) => e.name?.toLowerCase().includes(searchEx.toLowerCase()))

  function openCreateEx() {
    setEditingEx(null)
    setExForm({ name: '', muscle_group: 'pernas', description: '' })
    setShowExModal(true)
  }

  function openEditEx(ex) {
    setEditingEx(ex)
    setExForm({ name: ex.name, muscle_group: ex.muscle_group, description: ex.description || '' })
    setShowExModal(true)
  }

  async function handleSaveEx(e) {
    e.preventDefault()
    setSavingEx(true)
    const payload = { ...exForm, muscle_group: exForm.muscle_group.toLowerCase() }
    if (editingEx) {
      const { data, error } = await updateExercise(editingEx.id, payload)
      if (error) show('Erro ao atualizar.', 'error')
      else { setExercises((prev) => prev.map((ex) => ex.id === editingEx.id ? data : ex)); show('Exercício atualizado!', 'success') }
    } else {
      const { data, error } = await createExercise(payload)
      if (error) show('Erro ao criar.', 'error')
      else { setExercises((prev) => [data, ...prev]); show('Exercício criado!', 'success') }
    }
    setSavingEx(false)
    setShowExModal(false)
  }

  async function handleDeleteEx(id) {
    if (!confirm('Excluir exercício?')) return
    const { error } = await deleteExercise(id)
    if (error) show('Erro ao excluir.', 'error')
    else { setExercises((prev) => prev.filter((e) => e.id !== id)); show('Exercício excluído!', 'success') }
  }

  function addToBuilder(ex) {
    setBuilderItems((prev) => [...prev, { exercise_id: ex.id, exercise: ex, sets: 3, reps: '12', rest_seconds: 60, suggested_load_kg: 0 }])
  }

  function removeFromBuilder(idx) {
    setBuilderItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateBuilderItem(idx, field, value) {
    setBuilderItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function handleSaveWorkout() {
    if (!builderName.trim() || !assignTo || builderItems.length === 0) {
      show('Preencha nome, aluna e adicione exercícios.', 'warning')
      return
    }
    setSavingWorkout(true)
    const { error } = await createWorkoutRoutine(
      { title: builderName, assigned_to: assignTo, created_by: user?.id },
      builderItems
    )
    setSavingWorkout(false)
    if (error) show('Erro ao salvar treino.', 'error')
    else {
      show('Treino salvo!', 'success')
      setBuilderName('')
      setAssignTo('')
      setBuilderItems([])
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Treinos</h1>
        {activeTab === 'library' && (
          <button
            onClick={openCreateEx}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all"
          >
            <span className="material-icons text-base">add</span>
            Exercício
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {['library', 'builder'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab === 'library' ? '📚 Biblioteca' : '🏗️ Montador'}
          </button>
        ))}
      </div>

      {/* Library */}
      {activeTab === 'library' && (
        <div className="space-y-3">
          <div className="relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
            <input
              type="text"
              value={searchEx}
              onChange={(e) => setSearchEx(e.target.value)}
              placeholder="Buscar exercício..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : (
            <div className="space-y-2">
              {filteredEx.map((ex) => (
                <div key={ex.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
                  {ex.image_url ? (
                    <img src={ex.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-icons text-primary text-base">fitness_center</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{ex.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{ex.muscle_group}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => addToBuilder(ex)}
                      title="Adicionar ao montador"
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      <span className="material-icons text-primary text-base">add_circle</span>
                    </button>
                    <button onClick={() => openEditEx(ex)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                      <span className="material-icons text-gray-400 text-base">edit</span>
                    </button>
                    <button onClick={() => handleDeleteEx(ex.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors">
                      <span className="material-icons text-red-400 text-base">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Builder */}
      {activeTab === 'builder' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h2 className="text-sm font-bold text-gray-600">Informações do Treino</h2>
            <input
              value={builderName}
              onChange={(e) => setBuilderName(e.target.value)}
              placeholder="Nome do treino (ex: Treino A - Pernas)"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
            />
            <select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors bg-white"
            >
              <option value="">Selecionar aluna...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>

          {builderItems.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
              <span className="text-3xl">💪</span>
              <p className="text-sm text-gray-400 mt-2">Adicione exercícios da biblioteca</p>
            </div>
          ) : (
            <div className="space-y-2">
              {builderItems.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-800">{item.exercise?.name}</p>
                    <button onClick={() => removeFromBuilder(idx)} className="w-6 h-6 flex items-center justify-center">
                      <span className="material-icons text-red-400 text-sm">remove_circle</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { field: 'sets', label: 'Séries', type: 'number' },
                      { field: 'reps', label: 'Reps', type: 'text' },
                      { field: 'rest_seconds', label: 'Desc(s)', type: 'number' },
                      { field: 'suggested_load_kg', label: 'Carga(kg)', type: 'number' },
                    ].map((f) => (
                      <div key={f.field}>
                        <label className="block text-[10px] text-gray-400 mb-1">{f.label}</label>
                        <input
                          type={f.type}
                          value={item[f.field]}
                          onChange={(e) => updateBuilderItem(idx, f.field, e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-primary transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {builderItems.length > 0 && (
            <button
              onClick={handleSaveWorkout}
              disabled={savingWorkout}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {savingWorkout && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Salvar Treino
            </button>
          )}
        </div>
      )}

      {/* Exercise Modal */}
      <Modal isOpen={showExModal} onClose={() => setShowExModal(false)} title={editingEx ? 'Editar Exercício' : 'Novo Exercício'}>
        <form onSubmit={handleSaveEx} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nome</label>
            <input
              type="text"
              value={exForm.name}
              onChange={(e) => setExForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="Nome do exercício"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Grupo Muscular</label>
            <select
              value={exForm.muscle_group}
              onChange={(e) => setExForm((f) => ({ ...f, muscle_group: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors bg-white"
            >
              {MUSCLE_GROUPS.map((g) => <option key={g} value={g.toLowerCase()}>{g}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={savingEx}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-60 active:scale-95 transition-all"
          >
            {editingEx ? 'Salvar Alterações' : 'Criar Exercício'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
