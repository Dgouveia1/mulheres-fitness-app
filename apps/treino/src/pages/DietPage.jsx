import { useEffect, useState } from 'react'
import { useAuth } from '@emf/shared'
import { getActiveDiet } from '@emf/shared'

export function DietPage() {
  const { user } = useAuth()
  const [diet, setDiet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openMeal, setOpenMeal] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    getActiveDiet(user.id).then((data) => {
      setDiet(data)
      setLoading(false)
    })
  }, [user?.id])

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="emf-skeleton h-32 rounded-2xl" />
        <div className="emf-skeleton h-4 w-32 rounded-full" />
        <div className="space-y-3">
          <div className="emf-skeleton h-20 rounded-2xl" />
          <div className="emf-skeleton h-20 rounded-2xl" />
          <div className="emf-skeleton h-20 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!diet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-64 h-64 gap-4 p-6 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center">
          <span className="material-icons text-emerald-600 text-3xl">restaurant_menu</span>
        </div>
        <h3 className="font-bold text-content">Nenhuma dieta ativa</h3>
        <p className="text-sm text-content-muted max-w-xs">Seu nutricionista irá configurar seu plano alimentar em breve.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-5 shadow-soft-lg animate-scale-in">
        <span
          className="material-icons absolute -right-3 -top-3 text-white/15 text-[7rem] leading-none pointer-events-none select-none"
          aria-hidden="true"
        >
          eco
        </span>
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="material-icons text-sm" aria-hidden="true">verified</span>
            Plano Ativo
          </div>
          <h1 className="text-xl font-bold mt-2.5">{diet.title}</h1>
          {diet.description && <p className="text-sm opacity-90 mt-1">{diet.description}</p>}
          <div className="flex gap-4 mt-4">
            {diet.total_calories && (
              <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-xl px-3.5 py-2">
                <span className="material-icons text-2xl opacity-90" aria-hidden="true">local_fire_department</span>
                <div>
                  <div className="text-2xl font-extrabold leading-none">{diet.total_calories}</div>
                  <div className="text-xs opacity-80 mt-0.5">kcal/dia</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Meals */}
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold text-content-muted uppercase tracking-wider">
          <span className="material-icons text-emerald-600 text-base" aria-hidden="true">restaurant</span>
          Refeições ({diet.meals?.length || 0})
        </h2>

        {/* Timeline */}
        <div className="relative space-y-3">
          {(diet.meals?.length || 0) > 0 && (
            <span
              className="absolute left-[26px] top-3 bottom-3 w-px bg-gradient-to-b from-emerald-300 via-emerald-200 to-transparent dark:from-emerald-500/40 dark:via-emerald-500/20 pointer-events-none"
              aria-hidden="true"
            />
          )}

          {diet.meals?.map((meal, idx) => (
            <div
              key={meal.id}
              className="relative pl-9 animate-slide-up"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {/* Timeline marker */}
              <span
                className={`absolute left-[19px] top-5 z-10 w-3.5 h-3.5 rounded-full ring-4 ring-background transition-colors ${
                  openMeal === idx ? 'bg-emerald-500' : 'bg-emerald-400/60'
                }`}
                aria-hidden="true"
              />

              <div className="emf-card overflow-hidden">
                <button
                  type="button"
                  className="w-full min-h-[44px] p-4 flex items-center gap-3 text-left cursor-pointer transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  onClick={() => setOpenMeal(openMeal === idx ? null : idx)}
                  aria-expanded={openMeal === idx}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <span className="material-icons text-emerald-600 text-lg" aria-hidden="true">restaurant</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-content text-sm truncate">{meal.name}</h3>
                    {meal.time && (
                      <p className="flex items-center gap-1 text-xs text-content-muted mt-0.5">
                        <span className="material-icons text-[0.85rem] leading-none" aria-hidden="true">schedule</span>
                        {meal.time}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="emf-badge bg-muted text-content-muted">{meal.foods?.length || 0} alimentos</span>
                    <span className={`material-icons text-content-subtle text-sm transition-transform duration-200 ${openMeal === idx ? 'rotate-180' : ''}`} aria-hidden="true">expand_more</span>
                  </div>
                </button>

                {openMeal === idx && (
                  <div className="border-t border-line px-4 pb-4 pt-1 space-y-1 animate-fade-in">
                    {meal.foods?.map((food) => (
                      <div key={food.id} className="flex items-start gap-2.5 py-2">
                        <span className="material-icons text-emerald-500 text-base mt-0.5 shrink-0" aria-hidden="true">check_circle</span>
                        <div className="flex-1">
                          <span className="text-sm text-content">{food.food_item}</span>
                          {food.portion && <span className="text-xs text-content-muted ml-2">— {food.portion}</span>}
                        </div>
                      </div>
                    ))}
                    {(!meal.foods || meal.foods.length === 0) && (
                      <p className="flex items-center gap-2 text-xs text-content-muted py-2">
                        <span className="material-icons text-sm text-content-subtle" aria-hidden="true">info</span>
                        Nenhum alimento cadastrado.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
