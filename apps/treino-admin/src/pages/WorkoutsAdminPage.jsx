import { useEffect, useRef, useState } from 'react'
import {
  getAllExercises, createExercise, updateExercise, deleteExercise,
  getClients, createWorkoutRoutine, getTemplates, getWorkoutDetails, uploadExerciseAsset,
  Modal, useToast, useAuth,
} from '@emf/shared'

const MUSCLE_GROUPS = ['Pernas', 'Glúteos', 'Costas', 'Peito', 'Ombros', 'Braços', 'Abdômen', 'Cardio']
const LEVELS = ['Iniciante', 'Intermediário', 'Avançado']
const EMPTY_EX = { name: '', muscle_group: 'pernas', image_url: '', video_url: '' }

export function WorkoutsAdminPage() {
  const { user } = useAuth()
  const { show } = useToast()
  const [activeTab, setActiveTab] = useState('builder')
  const [exercises, setExercises] = useState([])
  const [clients, setClients] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchEx, setSearchEx] = useState('')

  // Exercise modal
  const [showExModal, setShowExModal] = useState(false)
  const [editingEx, setEditingEx] = useState(null)
  const [exForm, setExForm] = useState(EMPTY_EX)
  const [exImageFile, setExImageFile] = useState(null)
  const [exVideoFile, setExVideoFile] = useState(null)
  const [savingEx, setSavingEx] = useState(false)
  const imgRef = useRef()
  const vidRef = useRef()

  // Builder
  const [builderTitle, setBuilderTitle] = useState('')
  const [builderDesc, setBuilderDesc] = useState('')
  const [builderLevel, setBuilderLevel] = useState('Iniciante')
  const [assignTo, setAssignTo] = useState('')
  const [builderItems, setBuilderItems] = useState([])
  const [savingWorkout, setSavingWorkout] = useState(false)

  async function refreshTemplates() {
    if (user?.id) setTemplates(await getTemplates(user.id))
  }

  useEffect(() => {
    Promise.all([getAllExercises(), getClients(), user?.id ? getTemplates(user.id) : []]).then(([exs, cls, tpls]) => {
      setExercises(exs)
      setClients(cls)
      setTemplates(tpls)
      setLoading(false)
    })
  }, [user?.id])

  const filteredEx = exercises.filter((e) => e.name?.toLowerCase().includes(searchEx.toLowerCase()))

  // ---- Exercícios ----
  function openCreateEx() {
    setEditingEx(null)
    setExForm(EMPTY_EX)
    setExImageFile(null)
    setExVideoFile(null)
    setShowExModal(true)
  }

  function openEditEx(ex) {
    setEditingEx(ex)
    setExForm({ name: ex.name, muscle_group: ex.muscle_group || 'pernas', image_url: ex.image_url || '', video_url: ex.video_url || '' })
    setExImageFile(null)
    setExVideoFile(null)
    setShowExModal(true)
  }

  async function handleSaveEx(e) {
    e.preventDefault()
    setSavingEx(true)
    try {
      let imageUrl = exForm.image_url
      let videoUrl = exForm.video_url
      if (exImageFile) imageUrl = await uploadExerciseAsset(exImageFile)
      if (exVideoFile) videoUrl = await uploadExerciseAsset(exVideoFile)
      // Obs.: tabela exercises NÃO tem coluna `description`.
      const payload = { name: exForm.name, muscle_group: exForm.muscle_group.toLowerCase(), image_url: imageUrl, video_url: videoUrl }
      if (editingEx) {
        const { data, error } = await updateExercise(editingEx.id, payload)
        if (error) throw error
        setExercises((prev) => prev.map((ex) => ex.id === editingEx.id ? data : ex))
        show('Exercício atualizado!', 'success')
      } else {
        const { data, error } = await createExercise(payload)
        if (error) throw error
        setExercises((prev) => [data, ...prev])
        show('Exercício criado!', 'success')
      }
      setShowExModal(false)
    } catch (err) {
      show('Erro ao salvar exercício.', 'error')
    }
    setSavingEx(false)
  }

  async function handleDeleteEx(id) {
    if (!confirm('Excluir exercício? Pode afetar treinos existentes.')) return
    const { error } = await deleteExercise(id)
    if (error) show('Erro ao excluir.', 'error')
    else { setExercises((prev) => prev.filter((e) => e.id !== id)); show('Exercício excluído!', 'success') }
  }

  // ---- Builder ----
  function addToBuilder(ex) {
    setBuilderItems((prev) => [...prev, { exercise_id: ex.id, exercise: ex, sets: 3, reps: '12', rest_seconds: 60, suggested_load_kg: 0 }])
    setActiveTab('builder')
  }
  function removeFromBuilder(idx) {
    setBuilderItems((prev) => prev.filter((_, i) => i !== idx))
  }
  function updateBuilderItem(idx, field, value) {
    setBuilderItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  async function loadTemplate(templateId) {
    if (!templateId) return
    if (builderItems.length > 0 && !confirm('Isso substituirá os itens atuais da ficha. Continuar?')) return
    const { data: workout } = await getWorkoutDetails(templateId)
    if (!workout) return
    setBuilderTitle(workout.title || '')
    setBuilderDesc(workout.description || '')
    setBuilderLevel(workout.difficulty_level || 'Iniciante')
    setBuilderItems((workout.items || []).map((item) => ({
      exercise_id: item.exercise_id, exercise: item.exercise,
      sets: item.sets, reps: item.reps, rest_seconds: item.rest_seconds, suggested_load_kg: item.suggested_load_kg,
    })))
    show('Modelo carregado!', 'info')
  }

  function resetBuilder() {
    setBuilderTitle(''); setBuilderDesc(''); setBuilderLevel('Iniciante'); setAssignTo(''); setBuilderItems([])
  }

  async function handleSaveWorkout() {
    if (!builderTitle.trim()) { show('Dê um título ao treino.', 'warning'); return }
    if (!assignTo) { show('Selecione a aluna (ou "Salvar como modelo").', 'warning'); return }
    if (builderItems.length === 0) { show('Adicione exercícios.', 'warning'); return }
    setSavingWorkout(true)
    const assignedTo = assignTo === 'template' ? user?.id : assignTo
    const { error } = await createWorkoutRoutine(
      { title: builderTitle, description: builderDesc, difficulty_level: builderLevel, assigned_to: assignedTo, created_by: user?.id },
      builderItems,
    )
    setSavingWorkout(false)
    if (error) { show('Erro ao salvar treino.', 'error'); return }
    show(assignTo === 'template' ? 'Modelo salvo!' : 'Treino salvo!', 'success')
    if (assignTo === 'template') refreshTemplates()
    resetBuilder()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">Treinos</h1>
        {activeTab === 'library' && (
          <button onClick={openCreateEx} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all">
            <span className="material-icons text-base">add</span>
            Exercício
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[['builder', '🏗️ Montador'], ['library', '📚 Biblioteca']].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Library */}
      {activeTab === 'library' && (
        <div className="space-y-3">
          <div className="relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
            <input value={searchEx} onChange={(e) => setSearchEx(e.target.value)} placeholder="Buscar exercício..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors" />
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
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center"><span className="material-icons text-primary text-base">fitness_center</span></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{ex.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{ex.muscle_group}{ex.video_url ? ' • 📹' : ''}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => addToBuilder(ex)} title="Adicionar ao montador" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary/10 transition-colors"><span className="material-icons text-primary text-base">add_circle</span></button>
                    <button onClick={() => openEditEx(ex)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"><span className="material-icons text-gray-400 text-base">edit</span></button>
                    <button onClick={() => handleDeleteEx(ex.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"><span className="material-icons text-red-400 text-base">delete</span></button>
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
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-600">Informações do Treino</h2>
              {templates.length > 0 && (
                <select onChange={(e) => { loadTemplate(e.target.value); e.target.value = '' }} defaultValue="" className="text-xs px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none focus:border-primary">
                  <option value="">Carregar modelo…</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              )}
            </div>
            <input value={builderTitle} onChange={(e) => setBuilderTitle(e.target.value)} placeholder="Título do treino (ex: Treino A - Pernas)" className="emf-input" />
            <textarea value={builderDesc} onChange={(e) => setBuilderDesc(e.target.value)} rows={2} placeholder="Descrição / observações (opcional)" className="emf-input resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <select value={builderLevel} onChange={(e) => setBuilderLevel(e.target.value)} className="emf-input bg-white">
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="emf-input bg-white">
                <option value="">Atribuir a…</option>
                <option value="template">⭐ Salvar como modelo</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
          </div>

          {builderItems.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200">
              <span className="text-3xl">💪</span>
              <p className="text-sm text-gray-400 mt-2">Adicione exercícios da aba Biblioteca</p>
            </div>
          ) : (
            <div className="space-y-2">
              {builderItems.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-gray-800">{item.exercise?.name}</p>
                    <button onClick={() => removeFromBuilder(idx)} className="w-6 h-6 flex items-center justify-center"><span className="material-icons text-red-400 text-sm">remove_circle</span></button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[['sets', 'Séries', 'number'], ['reps', 'Reps', 'text'], ['rest_seconds', 'Desc(s)', 'number'], ['suggested_load_kg', 'Carga(kg)', 'number']].map(([field, label, type]) => (
                      <div key={field}>
                        <label className="block text-[10px] text-gray-400 mb-1">{label}</label>
                        <input type={type} value={item[field]} onChange={(e) => updateBuilderItem(idx, field, e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-primary transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {builderItems.length > 0 && (
            <button onClick={handleSaveWorkout} disabled={savingWorkout} className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2">
              {savingWorkout && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {assignTo === 'template' ? 'Salvar Modelo' : 'Salvar Treino'}
            </button>
          )}
        </div>
      )}

      {/* Exercise Modal */}
      <Modal isOpen={showExModal} onClose={() => setShowExModal(false)} title={editingEx ? 'Editar Exercício' : 'Novo Exercício'}>
        <form onSubmit={handleSaveEx} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Nome</label>
            <input value={exForm.name} onChange={(e) => setExForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Nome do exercício" className="emf-input" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Grupo Muscular</label>
            <select value={exForm.muscle_group} onChange={(e) => setExForm((f) => ({ ...f, muscle_group: e.target.value }))} className="emf-input bg-white">
              {MUSCLE_GROUPS.map((g) => <option key={g} value={g.toLowerCase()}>{g}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Imagem</label>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => setExImageFile(e.target.files?.[0])} />
              <button type="button" onClick={() => imgRef.current?.click()} className="w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-xs text-gray-500 hover:border-primary transition-colors">
                {exImageFile ? exImageFile.name : exForm.image_url ? '✓ Imagem atual' : 'Escolher imagem'}
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vídeo</label>
              <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={(e) => setExVideoFile(e.target.files?.[0])} />
              <button type="button" onClick={() => vidRef.current?.click()} className="w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-xs text-gray-500 hover:border-primary transition-colors">
                {exVideoFile ? exVideoFile.name : exForm.video_url ? '✓ Vídeo atual' : 'Escolher vídeo'}
              </button>
            </div>
          </div>
          <button type="submit" disabled={savingEx} className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2">
            {savingEx && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {(exImageFile || exVideoFile) && savingEx ? 'Enviando arquivos...' : editingEx ? 'Salvar Alterações' : 'Criar Exercício'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
