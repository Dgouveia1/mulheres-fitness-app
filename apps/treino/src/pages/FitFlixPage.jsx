import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getVideos, getFitFlixCategories } from '@emf/shared'

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

  const filtered = activeCategory === 'all' ? videos : videos.filter((v) => v.category === activeCategory)

  if (loading) {
    return (
      <div className="p-4 space-y-5">
        {/* Hero skeleton */}
        <div className="emf-skeleton h-9 w-40 rounded-xl" />

        {/* Filter skeleton */}
        <div className="flex gap-2 overflow-hidden pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="emf-skeleton shrink-0 h-9 w-20 rounded-full" />
          ))}
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="emf-card overflow-hidden p-0">
              <div className="emf-skeleton h-28 w-full rounded-none" />
              <div className="p-3 space-y-2">
                <div className="emf-skeleton h-3 w-full rounded-md" />
                <div className="emf-skeleton h-3 w-2/3 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      {/* Hero header */}
      <header className="flex items-center gap-3 animate-fade-in">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-soft shrink-0">
          <span className="material-icons text-white text-2xl" aria-hidden="true">movie</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-content leading-tight">FitFlix</h1>
          <p className="text-xs text-content-muted">Sua biblioteca de vídeos de treino</p>
        </div>
      </header>

      {/* Category filter */}
      <div
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1"
        role="tablist"
        aria-label="Filtrar vídeos por categoria"
      >
        <button
          onClick={() => setActiveCategory('all')}
          role="tab"
          aria-selected={activeCategory === 'all'}
          className={`emf-chip shrink-0 min-h-[44px] ${
            activeCategory === 'all' ? 'bg-primary text-white border-primary shadow-soft' : ''
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.name)}
            role="tab"
            aria-selected={activeCategory === cat.name}
            className={`emf-chip shrink-0 min-h-[44px] ${
              activeCategory === cat.name ? 'bg-primary text-white border-primary shadow-soft' : ''
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Videos grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/15 flex items-center justify-center mb-3">
            <span className="material-icons text-primary text-3xl" aria-hidden="true">movie</span>
          </div>
          <p className="text-sm font-medium text-content">Nenhum vídeo nesta categoria.</p>
          <p className="text-xs text-content-muted mt-1">Tente selecionar outra categoria acima.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((video) => (
            <button
              key={video.id}
              onClick={() => navigate(`/watch?id=${video.id}`)}
              aria-label={`Assistir ${video.title}`}
              className="emf-card group overflow-hidden p-0 text-left active:scale-95 transition-all duration-200 hover:shadow-soft-lg hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="relative">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-28 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-28 bg-gradient-to-br from-primary/20 to-secondary/10 flex items-center justify-center">
                    <span className="material-icons text-primary text-3xl" aria-hidden="true">play_circle</span>
                  </div>
                )}
                {/* Gradient veil for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" aria-hidden="true" />
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-11 h-11 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center shadow-soft transition-transform duration-200 group-hover:scale-110">
                    <span className="material-icons text-white text-2xl" aria-hidden="true">play_arrow</span>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <h3 className="text-xs font-bold text-content line-clamp-2 leading-tight">{video.title}</h3>
                {video.description && <p className="text-xs text-content-muted mt-1 line-clamp-1">{video.description}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
