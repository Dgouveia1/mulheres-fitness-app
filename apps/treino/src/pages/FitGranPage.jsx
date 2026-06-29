import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@emf/shared'
import { getPosts, toggleLike, getComments, addComment, uploadPostImage, createPost } from '@emf/shared'
import { useToast } from '@emf/shared'

function PostCard({ post, currentUserId, onLike, onComment }) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [posting, setPosting] = useState(false)

  async function handleToggleComments() {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true)
      const data = await getComments(post.id)
      setComments(data)
      setLoadingComments(false)
    }
    setShowComments((s) => !s)
  }

  async function handleAddComment(e) {
    e.preventDefault()
    if (!commentText.trim()) return
    setPosting(true)
    const { data } = await addComment(post.id, currentUserId, commentText)
    if (data) setComments((c) => [...c, data])
    setCommentText('')
    setPosting(false)
  }

  return (
    <article className="emf-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 p-3.5">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-soft shrink-0">
          <span className="material-icons text-white text-lg">person</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-content truncate">{post.profiles?.full_name || 'Anônima'}</p>
          <p className="text-xs text-content-subtle flex items-center gap-1">
            <span className="material-icons text-[12px] leading-none">schedule</span>
            {new Date(post.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Image */}
      {post.image_url && (
        <img src={post.image_url} alt={post.caption || 'Publicação da comunidade'} className="w-full object-cover max-h-96" />
      )}

      {/* Caption */}
      {post.caption && <p className="px-4 py-3 text-sm text-content leading-relaxed">{post.caption}</p>}

      {/* Actions */}
      <div className="px-3 pb-2.5 pt-1.5 flex items-center gap-1">
        <button
          onClick={() => onLike(post.id)}
          aria-label={post.is_liked ? 'Remover curtida' : 'Curtir publicação'}
          aria-pressed={post.is_liked}
          className={`flex items-center gap-1.5 text-sm font-semibold rounded-full px-3 min-h-[44px] transition-all duration-200 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${post.is_liked ? 'text-primary bg-primary/10' : 'text-content-muted hover:text-primary hover:bg-primary/10'}`}
        >
          <span className="material-icons text-xl">{post.is_liked ? 'favorite' : 'favorite_border'}</span>
          {post.likes_count || 0}
        </button>
        <button
          onClick={handleToggleComments}
          aria-expanded={showComments}
          className="flex items-center gap-1.5 text-sm font-semibold rounded-full px-3 min-h-[44px] text-content-muted hover:text-content hover:bg-muted transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span className="material-icons text-xl">chat_bubble_outline</span>
          Comentários
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-line bg-muted/40 px-4 py-3 space-y-3 animate-slide-up">
          {loadingComments ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-2">
                  <div className="emf-skeleton w-7 h-7 rounded-full shrink-0" />
                  <div className="emf-skeleton flex-1 h-12 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 animate-fade-in">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-secondary to-secondary-light flex items-center justify-center shrink-0 shadow-soft">
                    <span className="material-icons text-white text-sm">person</span>
                  </div>
                  <div className="flex-1 bg-surface border border-line rounded-xl px-3 py-2">
                    <p className="text-xs font-semibold text-content">{c.profiles?.full_name || 'Aluna'}</p>
                    <p className="text-xs text-content-muted mt-0.5 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
              <form onSubmit={handleAddComment} className="flex gap-2 items-center">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escreva um comentário..."
                  aria-label="Escreva um comentário"
                  className="emf-input flex-1 text-xs py-2.5 min-h-[44px]"
                />
                <button
                  type="submit"
                  disabled={posting || !commentText.trim()}
                  aria-label="Enviar comentário"
                  className="emf-btn-primary px-4 min-h-[44px] text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {posting ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="material-icons text-base">send</span>
                  )}
                  Enviar
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </article>
  )
}

export function FitGranPage() {
  const { user } = useAuth()
  const { show } = useToast()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPostForm, setShowPostForm] = useState(false)
  const [caption, setCaption] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [posting, setPosting] = useState(false)
  const fileInputRef = useRef()

  useEffect(() => {
    if (!user?.id) return
    getPosts(user.id).then((data) => {
      setPosts(data)
      setLoading(false)
    })
  }, [user?.id])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handlePost(e) {
    e.preventDefault()
    if (!imageFile && !caption.trim()) return
    setPosting(true)
    try {
      let imageUrl = null
      if (imageFile) imageUrl = await uploadPostImage(imageFile, user.id)
      const { data } = await createPost(user.id, imageUrl, caption)
      if (data) {
        setPosts((prev) => [{ ...data, profiles: { full_name: user.user_metadata?.full_name }, is_liked: false }, ...prev])
        show('Post publicado!', 'success')
      }
      setCaption('')
      setImageFile(null)
      setImagePreview(null)
      setShowPostForm(false)
    } catch {
      show('Erro ao publicar.', 'error')
    }
    setPosting(false)
  }

  async function handleLike(postId) {
    if (!user?.id) return
    const { newCount } = await toggleLike(postId, user.id)
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, is_liked: !p.is_liked, likes_count: newCount } : p
      )
    )
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="emf-skeleton h-7 w-28 rounded-lg" />
          <div className="emf-skeleton h-10 w-24 rounded-full" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="emf-card overflow-hidden">
            <div className="flex items-center gap-3 p-3.5">
              <div className="emf-skeleton w-10 h-10 rounded-full" />
              <div className="space-y-2">
                <div className="emf-skeleton h-3.5 w-32 rounded" />
                <div className="emf-skeleton h-3 w-20 rounded" />
              </div>
            </div>
            <div className="emf-skeleton h-56 w-full" />
            <div className="p-4 space-y-2">
              <div className="emf-skeleton h-3.5 w-3/4 rounded" />
              <div className="emf-skeleton h-3.5 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-content tracking-tight flex items-center gap-2">
            <span className="material-icons text-primary">groups</span>
            FitGran
          </h1>
          <p className="text-xs text-content-muted mt-0.5">Compartilhe sua jornada com a comunidade</p>
        </div>
        <button
          onClick={() => setShowPostForm((s) => !s)}
          aria-expanded={showPostForm}
          className={`flex items-center gap-2 min-h-[44px] px-5 rounded-full text-sm font-semibold active:scale-95 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 shadow-soft ${showPostForm ? 'bg-muted text-content hover:bg-muted/70' : 'bg-gradient-to-br from-primary to-primary-light text-white hover:shadow-pink-md'}`}
        >
          <span className="material-icons text-base">{showPostForm ? 'close' : 'add_a_photo'}</span>
          {showPostForm ? 'Cancelar' : 'Postar'}
        </button>
      </div>

      {/* Post form */}
      {showPostForm && (
        <form onSubmit={handlePost} className="emf-card p-4 space-y-3 animate-scale-in">
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="Pré-visualização da foto a publicar" className="w-full rounded-xl object-cover max-h-64" />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null) }}
                aria-label="Remover foto"
                className="absolute top-2 right-2 w-9 h-9 bg-black/55 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/70 active:scale-95 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="material-icons text-white text-base">close</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-36 border-2 border-dashed border-line rounded-xl flex flex-col items-center justify-center gap-2 text-content-muted hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-icons text-3xl text-primary">add_photo_alternate</span>
              </span>
              <span className="text-xs font-medium">Adicionar foto</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Compartilhe algo com a comunidade..."
            aria-label="Legenda da publicação"
            rows={2}
            className="emf-input w-full text-sm resize-none"
          />
          <button
            type="submit"
            disabled={posting || (!imageFile && !caption.trim())}
            className="emf-btn-primary w-full min-h-[44px] font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {posting ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-icons text-base">send</span>}
            Publicar
          </button>
        </form>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="emf-card flex flex-col items-center justify-center py-14 px-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <span className="material-icons text-3xl text-primary">photo_camera</span>
          </div>
          <p className="text-sm font-semibold text-content">Nenhuma publicação ainda</p>
          <p className="text-sm text-content-muted mt-1">Seja a primeira a compartilhar!</p>
          <button
            onClick={() => setShowPostForm(true)}
            className="emf-btn-primary mt-5 min-h-[44px] text-sm"
          >
            <span className="material-icons text-base">add_a_photo</span>
            Criar publicação
          </button>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={user?.id} onLike={handleLike} />
        ))
      )}
    </div>
  )
}
