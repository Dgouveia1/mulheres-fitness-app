import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getVideoById } from '@emf/shared'

export function WatchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const videoId = params.get('id')
  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!videoId) { navigate('/fitflix', { replace: true }); return }
    getVideoById(videoId).then((data) => {
      setVideo(data)
      setLoading(false)
    })
  }, [videoId])

  if (loading) {
    return (
      <div className="min-h-[60vh] bg-background animate-fade-in">
        {/* Back button placeholder */}
        <div className="px-4 py-3">
          <div className="emf-skeleton h-10 w-44 rounded-xl" />
        </div>
        {/* Player placeholder */}
        <div className="emf-skeleton w-full rounded-none sm:rounded-2xl sm:mx-4" style={{ height: '56vw', maxHeight: 420 }} />
        {/* Info placeholders */}
        <div className="p-4 space-y-3">
          <div className="emf-skeleton h-6 w-3/4 rounded-lg" />
          <div className="space-y-2">
            <div className="emf-skeleton h-4 w-full rounded-md" />
            <div className="emf-skeleton h-4 w-11/12 rounded-md" />
            <div className="emf-skeleton h-4 w-2/3 rounded-md" />
          </div>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-background animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span className="material-icons text-primary text-3xl">sentiment_dissatisfied</span>
        </div>
        <p className="text-content font-semibold">Vídeo não encontrado.</p>
        <p className="text-content-muted text-sm mt-1">Ele pode ter sido removido ou o link está incorreto.</p>
        <button
          onClick={() => navigate('/fitflix')}
          className="emf-btn-primary mt-5 inline-flex items-center gap-2"
        >
          <span className="material-icons text-base" aria-hidden="true">arrow_back</span>
          Voltar para FitFlix
        </button>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen animate-fade-in">
      {/* Back button */}
      <div className="px-4 pt-3 pb-1">
        <button
          onClick={() => navigate('/fitflix')}
          aria-label="Voltar para FitFlix"
          className="inline-flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-xl text-sm text-content-muted font-medium hover:text-content hover:bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
        >
          <span className="material-icons text-base" aria-hidden="true">arrow_back</span>
          Voltar para FitFlix
        </button>
      </div>

      {/* Video */}
      <div className="sm:px-4">
        {video.video_url ? (
          <video
            src={video.video_url}
            controls
            autoPlay
            className="w-full bg-black sm:rounded-2xl sm:shadow-soft-lg animate-scale-in"
            style={{ maxHeight: '60vw' }}
          />
        ) : video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full object-cover sm:rounded-2xl sm:shadow-soft-lg animate-scale-in"
            style={{ maxHeight: '60vw' }}
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-br from-content to-background flex items-center justify-center sm:rounded-2xl">
            <span className="material-icons text-content-subtle text-5xl" aria-hidden="true">videocam_off</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-3 animate-slide-up">
        <div className="emf-card p-4 space-y-3">
          <h1 className="text-lg font-bold text-content leading-snug">{video.title}</h1>
          {video.description && (
            <p className="text-sm text-content-muted leading-relaxed whitespace-pre-line">{video.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
