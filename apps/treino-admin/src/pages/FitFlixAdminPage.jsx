import { useEffect, useRef, useState } from 'react'
import { getVideos, getFitFlixCategories, createVideo, updateVideo, deleteVideo, uploadFitFlixFile, createFitFlixCategory, deleteFitFlixCategory } from '@emf/shared'
import { Modal } from '@emf/shared'
import { useToast } from '@emf/shared'

export function FitFlixAdminPage() {
  const { show } = useToast()
  const [videos, setVideos] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [editingVideo, setEditingVideo] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', category: '' })
  const [videoFile, setVideoFile] = useState(null)
  const [thumbFile, setThumbFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const videoInputRef = useRef()
  const thumbInputRef = useRef()

  useEffect(() => {
    Promise.all([getVideos(), getFitFlixCategories()]).then(([vids, cats]) => {
      setVideos(vids)
      setCategories(cats)
      setLoading(false)
    })
  }, [])

  function openCreate() {
    setEditingVideo(null)
    setForm({ title: '', description: '', category: categories[0]?.name || '' })
    setVideoFile(null)
    setThumbFile(null)
    setShowVideoModal(true)
  }

  function openEdit(v) {
    setEditingVideo(v)
    setForm({ title: v.title, description: v.description || '', category: v.category || '' })
    setVideoFile(null)
    setThumbFile(null)
    setShowVideoModal(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setProgress(0); setStatus('')
    try {
      let videoUrl = editingVideo?.video_url
      let thumbnailUrl = editingVideo?.thumbnail_url

      if (thumbFile) { setStatus('Enviando capa…'); setProgress(20); thumbnailUrl = await uploadFitFlixFile(thumbFile, 'thumbnails') }
      if (videoFile) { setStatus('Enviando vídeo… (pode demorar)'); setProgress(60); videoUrl = await uploadFitFlixFile(videoFile, 'videos') }
      setStatus('Salvando…'); setProgress(90)

      const payload = { ...form, video_url: videoUrl, thumbnail_url: thumbnailUrl }

      if (editingVideo) {
        const { data, error } = await updateVideo(editingVideo.id, payload)
        if (error) throw error
        setVideos((prev) => prev.map((v) => v.id === editingVideo.id ? data : v))
        show('Vídeo atualizado!', 'success')
      } else {
        const { data, error } = await createVideo({ ...payload, duration_minutes: 0 })
        if (error) throw error
        setVideos((prev) => [data, ...prev])
        show('Vídeo criado!', 'success')
      }
      setProgress(100)
      setShowVideoModal(false)
    } catch (err) {
      show('Erro ao salvar vídeo.', 'error')
    }
    setSaving(false)
    setProgress(0); setStatus('')
  }

  async function handleDelete(id) {
    if (!confirm('Excluir vídeo?')) return
    const { error } = await deleteVideo(id)
    if (error) show('Erro ao excluir.', 'error')
    else { setVideos((prev) => prev.filter((v) => v.id !== id)); show('Vídeo excluído!', 'success') }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return
    const { data, error } = await createFitFlixCategory(newCatName)
    if (error) show('Erro ao criar categoria.', 'error')
    else { setCategories((prev) => [...prev, data]); setNewCatName(''); show('Categoria criada!', 'success') }
  }

  async function handleDeleteCat(id) {
    if (!confirm('Excluir categoria?')) return
    const { error } = await deleteFitFlixCategory(id)
    if (error) show('Erro ao excluir.', 'error')
    else { setCategories((prev) => prev.filter((c) => c.id !== id)); show('Categoria excluída!', 'success') }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-light p-5 shadow-pink-md">
        <span className="material-icons pointer-events-none absolute -right-4 -top-4 text-[120px] leading-none text-white/15 select-none" aria-hidden="true">movie</span>
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <span className="material-icons text-xl text-white">smart_display</span>
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">FitFlix</h1>
            </div>
            <p className="mt-1 text-sm text-white/80">Gerencie os vídeos e categorias da plataforma.</p>
          </div>
          <button
            onClick={openCreate}
            className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-primary shadow-soft transition-all hover:bg-white/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 min-h-[44px]"
          >
            <span className="material-icons text-base">add</span>
            Vídeo
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="emf-card p-5 space-y-4 animate-slide-up">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
            <span className="material-icons text-lg">sell</span>
          </span>
          <h2 className="text-sm font-bold text-content">Categorias</h2>
        </div>
        <div className="flex gap-2">
          <label htmlFor="fitflix-new-cat" className="sr-only">Nova categoria</label>
          <input
            id="fitflix-new-cat"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nova categoria..."
            className="emf-input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <button
            onClick={handleAddCategory}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary/10 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[44px]"
          >
            <span className="material-icons text-base">add</span>
            Criar
          </button>
        </div>
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span key={cat.id} className="emf-chip bg-muted text-content pr-1.5 cursor-default">
                {cat.name}
                <button
                  onClick={() => handleDeleteCat(cat.id)}
                  aria-label={`Excluir categoria ${cat.name}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-content-subtle transition-colors hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="material-icons text-sm">close</span>
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-content-subtle">Nenhuma categoria ainda. Crie a primeira acima.</p>
        )}
      </div>

      {/* Videos */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="emf-skeleton h-[76px]" />)}</div>
      ) : videos.length === 0 ? (
        <div className="emf-card flex flex-col items-center justify-center py-14 text-center animate-scale-in">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <span className="material-icons text-3xl text-primary">movie</span>
          </span>
          <p className="mt-4 text-sm font-semibold text-content">Nenhum vídeo cadastrado</p>
          <p className="mt-1 text-xs text-content-muted">Adicione o primeiro vídeo à plataforma.</p>
          <button
            onClick={openCreate}
            className="mt-5 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-dark active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[44px]"
          >
            <span className="material-icons text-base">add</span>
            Adicionar vídeo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {videos.map((v) => (
            <div key={v.id} className="emf-card group flex items-center gap-3 p-3 transition-all hover:border-primary/30 hover:shadow-soft-lg animate-slide-up">
              {v.thumbnail_url ? (
                <div className="relative shrink-0">
                  <img src={v.thumbnail_url} alt={`Capa do vídeo ${v.title}`} className="h-14 w-20 rounded-xl bg-muted object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 transition-colors group-hover:bg-black/25">
                    <span className="material-icons text-white opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true">play_arrow</span>
                  </span>
                </div>
              ) : (
                <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15">
                  <span className="material-icons text-primary">play_circle</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-content">{v.title}</p>
                <span className="emf-badge mt-1 bg-secondary/15 text-secondary">
                  <span className="material-icons text-[13px]">label</span>
                  {v.category || 'Sem categoria'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(v)}
                  aria-label={`Editar vídeo ${v.title}`}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-content-muted transition-colors hover:bg-muted hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="material-icons text-base">edit</span>
                </button>
                <button
                  onClick={() => handleDelete(v.id)}
                  aria-label={`Excluir vídeo ${v.title}`}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-red-500 transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <span className="material-icons text-base">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal */}
      <Modal isOpen={showVideoModal} onClose={() => setShowVideoModal(false)} title={editingVideo ? 'Editar Vídeo' : 'Novo Vídeo'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="fitflix-title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-content-muted">Título</label>
            <input
              id="fitflix-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              placeholder="Título do vídeo"
              className="emf-input"
            />
          </div>
          <div>
            <label htmlFor="fitflix-category" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-content-muted">Categoria</label>
            <select
              id="fitflix-category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="emf-input"
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="fitflix-description" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-content-muted">Descrição</label>
            <textarea
              id="fitflix-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="emf-input resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-content-muted">Arquivo de Vídeo</label>
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-4 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${videoFile || editingVideo?.video_url ? 'border-primary/40 bg-primary/5 text-primary' : 'border-line text-content-muted hover:border-primary hover:text-primary'}`}
              >
                <span className="material-icons text-xl" aria-hidden="true">{videoFile || editingVideo?.video_url ? 'check_circle' : 'movie'}</span>
                <span className="max-w-full truncate">{videoFile ? videoFile.name : editingVideo?.video_url ? 'Vídeo atual' : 'Escolher vídeo'}</span>
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-content-muted">Thumbnail</label>
              <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setThumbFile(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-3 py-4 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${thumbFile || editingVideo?.thumbnail_url ? 'border-primary/40 bg-primary/5 text-primary' : 'border-line text-content-muted hover:border-primary hover:text-primary'}`}
              >
                <span className="material-icons text-xl" aria-hidden="true">{thumbFile || editingVideo?.thumbnail_url ? 'check_circle' : 'image'}</span>
                <span className="max-w-full truncate">{thumbFile ? thumbFile.name : editingVideo?.thumbnail_url ? 'Imagem atual' : 'Escolher imagem'}</span>
              </button>
            </div>
          </div>
          {saving && (thumbFile || videoFile) && (
            <div className="rounded-xl border border-line bg-muted p-3">
              <div className="mb-2 flex justify-between text-xs font-semibold text-primary">
                <span className="flex items-center gap-1.5">
                  <span className="material-icons animate-spin text-sm" aria-hidden="true">progress_activity</span>
                  {status}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do envio">
                <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-pink-md transition-all hover:bg-primary-dark active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[44px]"
          >
            {saving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {editingVideo ? 'Salvar Alterações' : 'Publicar Vídeo'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
