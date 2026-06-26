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
    try {
      let videoUrl = editingVideo?.video_url
      let thumbnailUrl = editingVideo?.thumbnail_url

      if (videoFile) videoUrl = await uploadFitFlixFile(videoFile, 'videos')
      if (thumbFile) thumbnailUrl = await uploadFitFlixFile(thumbFile, 'thumbnails')

      const payload = { ...form, video_url: videoUrl, thumbnail_url: thumbnailUrl }

      if (editingVideo) {
        const { data, error } = await updateVideo(editingVideo.id, payload)
        if (error) throw error
        setVideos((prev) => prev.map((v) => v.id === editingVideo.id ? data : v))
        show('Vídeo atualizado!', 'success')
      } else {
        const { data, error } = await createVideo(payload)
        if (error) throw error
        setVideos((prev) => [data, ...prev])
        show('Vídeo criado!', 'success')
      }
      setShowVideoModal(false)
    } catch (err) {
      show('Erro ao salvar vídeo.', 'error')
    }
    setSaving(false)
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">FitFlix</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all"
        >
          <span className="material-icons text-base">add</span>
          Vídeo
        </button>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-600">Categorias</h2>
        <div className="flex gap-2">
          <input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nova categoria..."
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <button onClick={handleAddCategory} className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-semibold hover:bg-primary/20 transition-colors">
            Criar
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1.5 bg-gray-100 rounded-full pl-3 pr-2 py-1">
              <span className="text-xs font-medium text-gray-700">{cat.name}</span>
              <button onClick={() => handleDeleteCat(cat.id)} className="w-4 h-4 flex items-center justify-center">
                <span className="material-icons text-gray-400 hover:text-red-400 text-xs">close</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Videos */}
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">🎬</span>
          <p className="text-sm text-gray-400 mt-2">Nenhum vídeo cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {videos.map((v) => (
            <div key={v.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
              {v.thumbnail_url ? (
                <img src={v.thumbnail_url} alt="" className="w-16 h-12 rounded-lg object-cover bg-gray-100 shrink-0" />
              ) : (
                <div className="w-16 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-icons text-primary">play_circle</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{v.title}</p>
                <p className="text-xs text-gray-400">{v.category || 'Sem categoria'}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(v)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="material-icons text-gray-400 text-base">edit</span>
                </button>
                <button onClick={() => handleDelete(v.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors">
                  <span className="material-icons text-red-400 text-base">delete</span>
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Título</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              placeholder="Título do vídeo"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Categoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors bg-white"
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Arquivo de Vídeo</label>
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => setVideoFile(e.target.files?.[0])} />
              <button type="button" onClick={() => videoInputRef.current?.click()} className="w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-xs text-gray-500 hover:border-primary transition-colors">
                {videoFile ? videoFile.name : editingVideo?.video_url ? '✓ Vídeo atual' : 'Escolher vídeo'}
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Thumbnail</label>
              <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setThumbFile(e.target.files?.[0])} />
              <button type="button" onClick={() => thumbInputRef.current?.click()} className="w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-xs text-gray-500 hover:border-primary transition-colors">
                {thumbFile ? thumbFile.name : editingVideo?.thumbnail_url ? '✓ Imagem atual' : 'Escolher imagem'}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {editingVideo ? 'Salvar Alterações' : 'Publicar Vídeo'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
