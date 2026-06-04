import { useEffect, useState } from 'react'
import { getClients, createDietPlan } from '@/services/api'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/contexts/AuthContext'

const DEFAULT_MEAL = { name: '', time: '', foods: [{ food_item: '', portion: '' }] }

export function NutritionAdminPage() {
  const { user } = useAuth()
  const { show } = useToast()
  const [clients, setClients] = useState([])
  const [assignTo, setAssignTo] = useState('')
  const [dietName, setDietName] = useState('')
  const [meals, setMeals] = useState([{ ...DEFAULT_MEAL, foods: [{ food_item: '', portion: '' }] }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getClients().then(setClients)
  }, [])

  function addMeal() {
    setMeals((prev) => [...prev, { name: '', time: '', foods: [{ food_item: '', portion: '' }] }])
  }

  function removeMeal(idx) {
    setMeals((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateMeal(idx, field, value) {
    setMeals((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  function addFood(mealIdx) {
    setMeals((prev) => prev.map((m, i) => i === mealIdx ? { ...m, foods: [...m.foods, { food_item: '', portion: '' }] } : m))
  }

  function removeFood(mealIdx, foodIdx) {
    setMeals((prev) => prev.map((m, i) => i === mealIdx ? { ...m, foods: m.foods.filter((_, fi) => fi !== foodIdx) } : m))
  }

  function updateFood(mealIdx, foodIdx, field, value) {
    setMeals((prev) => prev.map((m, i) =>
      i === mealIdx ? { ...m, foods: m.foods.map((f, fi) => fi === foodIdx ? { ...f, [field]: value } : f) } : m
    ))
  }

  async function handleSave() {
    if (!dietName.trim() || !assignTo) { show('Preencha o nome e selecione a aluna.', 'warning'); return }
    setSaving(true)
    const { error } = await createDietPlan(
      { name: dietName, assigned_to: assignTo, is_active: true, created_by: user?.id },
      meals.filter((m) => m.name.trim())
    )
    setSaving(false)
    if (error) show('Erro ao salvar dieta.', 'error')
    else {
      show('Dieta salva!', 'success')
      setDietName('')
      setAssignTo('')
      setMeals([{ name: '', time: '', foods: [{ food_item: '', portion: '' }] }])
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-800">Nutrição</h1>

      {/* Header do plano */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-600">Informações do Plano</h2>
        <input
          value={dietName}
          onChange={(e) => setDietName(e.target.value)}
          placeholder="Nome do plano alimentar"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
        />
        <select
          value={assignTo}
          onChange={(e) => setAssignTo(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors bg-white"
        >
          <option value="">Selecionar aluna...</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
      </div>

      {/* Refeições */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-600">Refeições</h2>
          <button
            onClick={addMeal}
            className="flex items-center gap-1 text-xs text-primary font-semibold hover:text-primary-dark transition-colors"
          >
            <span className="material-icons text-base">add_circle</span>
            Adicionar
          </button>
        </div>

        {meals.map((meal, mIdx) => (
          <div key={mIdx} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input
                  value={meal.name}
                  onChange={(e) => updateMeal(mIdx, 'name', e.target.value)}
                  placeholder="Ex: Café da manhã"
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
                />
                <input
                  type="time"
                  value={meal.time}
                  onChange={(e) => updateMeal(mIdx, 'time', e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <button onClick={() => removeMeal(mIdx)} className="w-8 h-8 flex items-center justify-center">
                <span className="material-icons text-red-400 text-base">remove_circle</span>
              </button>
            </div>

            {/* Alimentos */}
            <div className="space-y-2">
              {meal.foods.map((food, fIdx) => (
                <div key={fIdx} className="flex gap-2">
                  <input
                    value={food.food_item}
                    onChange={(e) => updateFood(mIdx, fIdx, 'food_item', e.target.value)}
                    placeholder="Alimento"
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-primary transition-colors"
                  />
                  <input
                    value={food.portion}
                    onChange={(e) => updateFood(mIdx, fIdx, 'portion', e.target.value)}
                    placeholder="Porção"
                    className="w-28 px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-primary transition-colors"
                  />
                  <button onClick={() => removeFood(mIdx, fIdx)} className="w-8 h-8 flex items-center justify-center">
                    <span className="material-icons text-gray-300 text-sm hover:text-red-400 transition-colors">close</span>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addFood(mIdx)}
                className="text-xs text-primary font-semibold flex items-center gap-1 hover:text-primary-dark transition-colors"
              >
                <span className="material-icons text-sm">add</span>
                Adicionar alimento
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        Salvar Plano Alimentar
      </button>
    </div>
  )
}
