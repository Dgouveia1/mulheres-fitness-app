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
    <article className="bg-white rounded-2xl border border-gray-100 shadow-pink-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="material-icons text-primary text-base">person</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{post.profiles?.full_name || 'Anônima'}</p>
          <p className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      {/* Image */}
      {post.image_url && (
        <img src={post.image_url} alt="" className="w-full object-cover max-h-96" />
      )}

      {/* Caption */}
      {post.caption && <p className="px-4 py-2 text-sm text-gray-700">{post.caption}</p>}

      {/* Actions */}
      <div className="px-4 pb-3 flex items-center gap-4">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${post.is_liked ? 'text-primary' : 'text-gray-400 hover:text-primary'}`}
        >
          <span className="material-icons text-lg">{post.is_liked ? 'favorite' : 'favorite_border'}</span>
          {post.likes_count || 0}
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className="material-icons text-lg">chat_bubble_outline</span>
          Comentários
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-gray-50 px-4 py-3 space-y-3">
          {loadingComments ? (
            <div className="flex justify-center py-2">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-icons text-primary text-xs">person</span>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-xs font-semibold text-gray-700">{c.profiles?.full_name || 'Aluna'}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escreva um comentário..."
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="submit"
                  disabled={posting || !commentText.trim()}
                  className="px-3 py-2 bg-primary text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all active:scale-95"
                >
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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">FitGran</h1>
        <button
          onClick={() => setShowPostForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all"
        >
          <span className="material-icons text-base">{showPostForm ? 'close' : 'add_a_photo'}</span>
          {showPostForm ? 'Cancelar' : 'Postar'}
        </button>
      </div>

      {/* Post form */}
      {showPostForm && (
        <form onSubmit={handlePost} className="bg-white rounded-2xl border border-gray-100 shadow-pink-sm p-4 space-y-3">
          {imagePreview ? (
            <div className="relative">
              <img src={imagePreview} alt="preview" className="w-full rounded-xl object-cover max-h-64" />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null) }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
              >
                <span className="material-icons text-white text-sm">close</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-36 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary/40 transition-colors"
            >
              <span className="material-icons text-3xl">add_photo_alternate</span>
              <span className="text-xs">Adicionar foto</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Compartilhe algo com a comunidade..."
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-primary transition-colors"
          />
          <button
            type="submit"
            disabled={posting || (!imageFile && !caption.trim())}
            className="w-full py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {posting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Publicar
          </button>
        </form>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <span className="text-4xl mb-2">📸</span>
          <p className="text-sm text-gray-400">Nenhuma publicação ainda. Seja a primeira!</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} currentUserId={user?.id} onLike={handleLike} />
        ))
      )}
    </div>
  )
}
