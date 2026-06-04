import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getVideoById } from '@/services/api'

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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-6">
        <span className="text-4xl mb-2">😕</span>
        <p className="text-gray-500">Vídeo não encontrado.</p>
        <button onClick={() => navigate('/fitflix')} className="mt-4 text-primary font-semibold text-sm">Voltar</button>
      </div>
    )
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate('/fitflix')}
        className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600 font-medium hover:text-gray-900 transition-colors"
      >
        <span className="material-icons text-base">arrow_back</span>
        Voltar para FitFlix
      </button>

      {/* Video */}
      {video.video_url ? (
        <video
          src={video.video_url}
          controls
          autoPlay
          className="w-full bg-black"
          style={{ maxHeight: '60vw' }}
        />
      ) : video.thumbnail_url ? (
        <img src={video.thumbnail_url} alt={video.title} className="w-full object-cover" style={{ maxHeight: '60vw' }} />
      ) : (
        <div className="w-full h-48 bg-gray-900 flex items-center justify-center">
          <span className="material-icons text-gray-600 text-5xl">videocam_off</span>
        </div>
      )}

      {/* Info */}
      <div className="p-4 space-y-3">
        <h1 className="text-lg font-bold text-gray-800">{video.title}</h1>
        {video.description && <p className="text-sm text-gray-500 leading-relaxed">{video.description}</p>}
      </div>
    </div>
  )
}
