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
    <div className="space-y-5 animate-fade-in">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-light p-5 shadow-soft-lg">
        <span className="material-icons pointer-events-none absolute -right-4 -top-4 text-white/15 text-[120px] select-none">fitness_center</span>
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-white drop-shadow-sm">Treinos</h1>
            <p className="mt-1 text-sm text-white/80">Monte fichas e gerencie sua biblioteca de exercícios</p>
          </div>
          {activeTab === 'library' && (
            <button
              onClick={openCreateEx}
              aria-label="Novo exercício"
              className="flex shrink-0 items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 text-sm font-bold text-primary shadow-soft transition-all hover:bg-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 min-h-[44px]"
            >
              <span className="material-icons text-base">add</span>
              Exercício
            </button>
          )}
        </div>
      </div>

      {/* Tabs — segmented control */}
      <div className="flex gap-1 rounded-2xl bg-muted p-1 shadow-soft">
        {[['builder', 'construction', 'Montador'], ['library', 'menu_book', 'Biblioteca']].map(([tab, icon, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              activeTab === tab
                ? 'bg-surface text-primary shadow-soft'
                : 'text-content-muted hover:text-content'
            }`}
          >
            <span className="material-icons text-lg">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Library */}
      {activeTab === 'library' && (
        <div className="space-y-3 animate-slide-up">
          <div className="relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-content-subtle text-lg pointer-events-none">search</span>
            <input
              value={searchEx}
              onChange={(e) => setSearchEx(e.target.value)}
              placeholder="Buscar exercício..."
              aria-label="Buscar exercício"
              className="emf-input pl-10"
            />
          </div>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="emf-skeleton h-20 rounded-2xl" />)}</div>
          ) : filteredEx.length === 0 ? (
            <div className="emf-card flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <span className="material-icons text-primary text-3xl">search_off</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-content">Nenhum exercício encontrado</p>
              <p className="mt-1 text-xs text-content-muted">{searchEx ? 'Tente outra busca.' : 'Crie seu primeiro exercício.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEx.map((ex) => (
                <div key={ex.id} className="emf-card group flex items-center gap-3 p-3 transition-all hover:shadow-soft-lg hover:border-primary/30">
                  {ex.image_url ? (
                    <img src={ex.image_url} alt={ex.name} className="h-16 w-16 shrink-0 rounded-xl object-cover bg-muted" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15">
                      <span className="material-icons text-primary text-2xl">fitness_center</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-content">{ex.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="emf-badge bg-secondary/15 capitalize text-secondary">{ex.muscle_group}</span>
                      {ex.video_url && (
                        <span className="emf-badge inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15">
                          <span className="material-icons text-[14px]">videocam</span>
                          Vídeo
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => addToBuilder(ex)}
                      title="Adicionar ao montador"
                      aria-label={`Adicionar ${ex.name} ao montador`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span className="material-icons text-xl">add_circle</span>
                    </button>
                    <button
                      onClick={() => openEditEx(ex)}
                      title="Editar exercício"
                      aria-label={`Editar ${ex.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-content-muted transition-colors hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span className="material-icons text-xl">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteEx(ex.id)}
                      title="Excluir exercício"
                      aria-label={`Excluir ${ex.name}`}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-red-400 transition-colors hover:bg-red-500/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                    >
                      <span className="material-icons text-xl">delete</span>
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
        <div className="space-y-4 animate-slide-up">
          <div className="emf-card space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold text-content">
                <span className="material-icons text-primary text-lg">tune</span>
                Informações do Treino
              </h2>
              {templates.length > 0 && (
                <select
                  onChange={(e) => { loadTemplate(e.target.value); e.target.value = '' }}
                  defaultValue=""
                  aria-label="Carregar modelo de treino"
                  className="rounded-xl border border-line bg-surface px-2.5 py-2 text-xs font-medium text-content-muted transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <option value="">Carregar modelo…</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              )}
            </div>
            <input value={builderTitle} onChange={(e) => setBuilderTitle(e.target.value)} placeholder="Título do treino (ex: Treino A - Pernas)" aria-label="Título do treino" className="emf-input" />
            <textarea value={builderDesc} onChange={(e) => setBuilderDesc(e.target.value)} rows={2} placeholder="Descrição / observações (opcional)" aria-label="Descrição do treino" className="emf-input resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <select value={builderLevel} onChange={(e) => setBuilderLevel(e.target.value)} aria-label="Nível de dificuldade" className="emf-input">
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} aria-label="Atribuir treino a" className="emf-input">
                <option value="">Atribuir a…</option>
                <option value="template">⭐ Salvar como modelo</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
          </div>

          {builderItems.length === 0 ? (
            <div className="emf-card flex flex-col items-center justify-center border-dashed px-4 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-secondary/15">
                <span className="material-icons text-primary text-3xl">add_task</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-content">Sua ficha está vazia</p>
              <p className="mt-1 text-xs text-content-muted">Adicione exercícios da aba Biblioteca</p>
              <button
                onClick={() => setActiveTab('library')}
                className="emf-btn emf-btn-secondary mt-4"
              >
                <span className="material-icons text-base">menu_book</span>
                Ir para Biblioteca
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {builderItems.map((item, idx) => (
                <div key={idx} className="emf-card p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="material-icons cursor-grab text-content-subtle text-xl" title="Arrastar para reordenar" aria-hidden="true">drag_indicator</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{idx + 1}</span>
                    <p className="min-w-0 flex-1 truncate text-sm font-bold text-content">{item.exercise?.name}</p>
                    <button
                      onClick={() => removeFromBuilder(idx)}
                      aria-label={`Remover ${item.exercise?.name || 'exercício'} da ficha`}
                      title="Remover da ficha"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-500/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
                    >
                      <span className="material-icons text-lg">remove_circle</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      ['sets', 'Séries', 'number', undefined],
                      ['reps', 'Reps', 'text', undefined],
                      ['rest_seconds', 'Desc. (s)', 'number', 'Descanso em segundos'],
                      ['suggested_load_kg', 'Carga (kg)', 'number', 'Carga sugerida em quilos'],
                    ].map(([field, label, type, hint]) => (
                      <div key={field}>
                        <label htmlFor={`builder-${idx}-${field}`} title={hint} className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-content-muted">{label}</label>
                        <input
                          id={`builder-${idx}-${field}`}
                          type={type}
                          title={hint}
                          value={item[field]}
                          onChange={(e) => updateBuilderItem(idx, field, e.target.value)}
                          className="w-full rounded-lg border border-line bg-surface px-2 py-2 text-center text-xs font-semibold text-content transition-colors focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
              className="emf-btn emf-btn-primary w-full py-3 text-sm font-bold disabled:opacity-60"
            >
              {savingWorkout
                ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                : <span className="material-icons text-base">save</span>}
              {assignTo === 'template' ? 'Salvar Modelo' : 'Salvar Treino'}
            </button>
          )}
        </div>
      )}

      {/* Exercise Modal */}
      <Modal isOpen={showExModal} onClose={() => setShowExModal(false)} title={editingEx ? 'Editar Exercício' : 'Novo Exercício'}>
        <form onSubmit={handleSaveEx} className="space-y-4">
          <div>
            <label htmlFor="ex-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-content-muted">Nome</label>
            <input id="ex-name" value={exForm.name} onChange={(e) => setExForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Nome do exercício" className="emf-input" />
          </div>
          <div>
            <label htmlFor="ex-muscle" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-content-muted">Grupo Muscular</label>
            <select id="ex-muscle" value={exForm.muscle_group} onChange={(e) => setExForm((f) => ({ ...f, muscle_group: e.target.value }))} className="emf-input">
              {MUSCLE_GROUPS.map((g) => <option key={g} value={g.toLowerCase()}>{g}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-content-muted">Imagem</label>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => setExImageFile(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => imgRef.current?.click()}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-muted py-3 text-xs font-medium text-content-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[44px]"
              >
                <span className="material-icons text-base">{exImageFile || exForm.image_url ? 'check_circle' : 'image'}</span>
                {exImageFile ? exImageFile.name : exForm.image_url ? 'Imagem atual' : 'Escolher imagem'}
              </button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-content-muted">Vídeo</label>
              <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={(e) => setExVideoFile(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => vidRef.current?.click()}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-muted py-3 text-xs font-medium text-content-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[44px]"
              >
                <span className="material-icons text-base">{exVideoFile || exForm.video_url ? 'check_circle' : 'videocam'}</span>
                {exVideoFile ? exVideoFile.name : exForm.video_url ? 'Vídeo atual' : 'Escolher vídeo'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={savingEx}
            className="emf-btn emf-btn-primary w-full py-3 text-sm font-bold disabled:opacity-60"
          >
            {savingEx
              ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : <span className="material-icons text-base">{editingEx ? 'save' : 'add'}</span>}
            {(exImageFile || exVideoFile) && savingEx ? 'Enviando arquivos...' : editingEx ? 'Salvar Alterações' : 'Criar Exercício'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
