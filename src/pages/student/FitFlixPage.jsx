import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVideos, getFitFlixCategories } from '@/services/api'

export function FitFlixPage() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getVideos(), getFitFlixCategories()]).then(([vids, cats]) => {
      setVideos(vids)
      setCategories(cats)
      setLoading(false)
    })
  }, [])

  const filtered = activeCategory === 'all' ? videos : videos.filter((v) => v.category_id === activeCategory)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">FitFlix</h1>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${activeCategory === 'all' ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${activeCategory === cat.id ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Videos grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <span className="text-4xl mb-2">🎬</span>
          <p className="text-sm text-gray-400">Nenhum vídeo nesta categoria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((video) => (
            <button
              key={video.id}
              onClick={() => navigate(`/watch?id=${video.id}`)}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-pink-sm text-left active:scale-95 transition-transform"
            >
              <div className="relative">
                {video.thumbnail_url ? (
                  <img src={video.thumbnail_url} alt={video.title} className="w-full h-28 object-cover" />
                ) : (
                  <div className="w-full h-28 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <span className="material-icons text-primary text-3xl">play_circle</span>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <span className="material-icons text-white text-xl">play_arrow</span>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight">{video.title}</h3>
                {video.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{video.description}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
