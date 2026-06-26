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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!diet) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 p-6 text-center">
        <span className="text-5xl">🥗</span>
        <h3 className="font-bold text-gray-700">Nenhuma dieta ativa</h3>
        <p className="text-sm text-gray-400">Seu nutricionista irá configurar seu plano alimentar em breve.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-5">
        <div className="text-xs opacity-80 font-semibold uppercase tracking-wider">Plano Ativo</div>
        <h1 className="text-xl font-bold mt-1">{diet.name}</h1>
        {diet.description && <p className="text-sm opacity-90 mt-1">{diet.description}</p>}
        <div className="flex gap-4 mt-3">
          {diet.total_calories && (
            <div>
              <div className="text-2xl font-extrabold">{diet.total_calories}</div>
              <div className="text-xs opacity-70">kcal/dia</div>
            </div>
          )}
        </div>
      </div>

      {/* Meals */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Refeições ({diet.meals?.length || 0})</h2>
        {diet.meals?.map((meal, idx) => (
          <div key={meal.id} className="bg-white rounded-2xl border border-gray-100 shadow-pink-sm overflow-hidden">
            <button
              className="w-full p-4 flex items-center gap-3 text-left"
              onClick={() => setOpenMeal(openMeal === idx ? null : idx)}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <span className="material-icons text-emerald-600 text-lg">restaurant</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-sm">{meal.name}</h3>
                {meal.time && <p className="text-xs text-gray-400 mt-0.5">{meal.time}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{meal.foods?.length || 0} alimentos</span>
                <span className={`material-icons text-gray-400 text-sm transition-transform ${openMeal === idx ? 'rotate-180' : ''}`}>expand_more</span>
              </div>
            </button>

            {openMeal === idx && (
              <div className="border-t border-gray-50 px-4 pb-4 space-y-2">
                {meal.foods?.map((food) => (
                  <div key={food.id} className="flex items-start gap-2 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm text-gray-700">{food.food_item}</span>
                      {food.portion && <span className="text-xs text-gray-400 ml-2">— {food.portion}</span>}
                    </div>
                  </div>
                ))}
                {(!meal.foods || meal.foods.length === 0) && (
                  <p className="text-xs text-gray-400 py-2">Nenhum alimento cadastrado.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
