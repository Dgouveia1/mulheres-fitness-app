import { useEffect, useState } from 'react'
import { getClients, createDietPlan, getDietTemplates, getDietById, useToast, useAuth } from '@emf/shared'

const NEW_MEAL = () => ({ name: '', time: '', foods: [{ food_item: '', portion: '' }] })

export function NutritionAdminPage() {
  const { user } = useAuth()
  const { show } = useToast()
  const [clients, setClients] = useState([])
  const [templates, setTemplates] = useState([])
  const [assignTo, setAssignTo] = useState('')
  const [dietTitle, setDietTitle] = useState('')
  const [dietDesc, setDietDesc] = useState('')
  const [meals, setMeals] = useState([NEW_MEAL()])
  const [saving, setSaving] = useState(false)

  async function refreshTemplates() {
    if (user?.id) setTemplates(await getDietTemplates(user.id))
  }

  useEffect(() => {
    getClients().then(setClients)
    refreshTemplates()
  }, [user?.id])

  function addMeal() { setMeals((prev) => [...prev, NEW_MEAL()]) }
  function removeMeal(idx) { setMeals((prev) => prev.filter((_, i) => i !== idx)) }
  function updateMeal(idx, field, value) { setMeals((prev) => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m)) }
  function addFood(mealIdx) { setMeals((prev) => prev.map((m, i) => i === mealIdx ? { ...m, foods: [...m.foods, { food_item: '', portion: '' }] } : m)) }
  function removeFood(mealIdx, foodIdx) { setMeals((prev) => prev.map((m, i) => i === mealIdx ? { ...m, foods: m.foods.filter((_, fi) => fi !== foodIdx) } : m)) }
  function updateFood(mealIdx, foodIdx, field, value) {
    setMeals((prev) => prev.map((m, i) => i === mealIdx ? { ...m, foods: m.foods.map((f, fi) => fi === foodIdx ? { ...f, [field]: value } : f) } : m))
  }

  async function loadTemplate(templateId) {
    if (!templateId) return
    if (meals.some((m) => m.name.trim() || m.foods.some((f) => f.food_item.trim())) && !confirm('Isso substituirá as refeições atuais. Continuar?')) return
    const diet = await getDietById(templateId)
    if (!diet) return
    setDietTitle(diet.title || '')
    setDietDesc(diet.description || '')
    setMeals((diet.meals || []).map((m) => ({
      name: m.name, time: m.time || '',
      foods: (m.foods || []).map((f) => ({ food_item: f.food_item, portion: f.portion })),
    })))
    if (!diet.meals?.length) setMeals([NEW_MEAL()])
    show('Modelo carregado!', 'info')
  }

  function resetBuilder() {
    setDietTitle(''); setDietDesc(''); setAssignTo(''); setMeals([NEW_MEAL()])
  }

  async function handleSave() {
    if (!dietTitle.trim()) { show('Dê um título ao plano.', 'warning'); return }
    if (!assignTo) { show('Selecione a aluna (ou "Salvar como modelo").', 'warning'); return }
    const cleanMeals = meals
      .map((m) => ({ ...m, foods: m.foods.filter((f) => f.food_item.trim()) }))
      .filter((m) => m.name.trim() && m.foods.length > 0)
    if (cleanMeals.length === 0) { show('O plano precisa de refeições com alimentos.', 'warning'); return }

    setSaving(true)
    const assignedTo = assignTo === 'template' ? user?.id : assignTo
    const { error } = await createDietPlan(
      { title: dietTitle, description: dietDesc, assigned_to: assignedTo, is_active: true, created_by: user?.id },
      cleanMeals,
    )
    setSaving(false)
    if (error) { show('Erro ao salvar dieta.', 'error'); return }
    show(assignTo === 'template' ? 'Modelo salvo!' : 'Plano enviado para a aluna!', 'success')
    if (assignTo === 'template') refreshTemplates()
    resetBuilder()
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-800">Nutrição</h1>

      {/* Header do plano */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-600">Informações do Plano</h2>
          {templates.length > 0 && (
            <select onChange={(e) => { loadTemplate(e.target.value); e.target.value = '' }} defaultValue="" className="text-xs px-2 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none focus:border-primary">
              <option value="">Carregar modelo…</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          )}
        </div>
        <input value={dietTitle} onChange={(e) => setDietTitle(e.target.value)} placeholder="Nome do plano alimentar" className="emf-input" />
        <textarea value={dietDesc} onChange={(e) => setDietDesc(e.target.value)} rows={2} placeholder="Descrição / observações (opcional)" className="emf-input resize-none" />
        <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="emf-input bg-white">
          <option value="">Atribuir a…</option>
          <option value="template">⭐ Salvar como modelo</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
      </div>

      {/* Refeições */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-600">Refeições</h2>
          <button onClick={addMeal} className="flex items-center gap-1 text-xs text-primary font-semibold hover:text-primary-dark transition-colors">
            <span className="material-icons text-base">add_circle</span>
            Adicionar
          </button>
        </div>

        {meals.map((meal, mIdx) => (
          <div key={mIdx} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input value={meal.name} onChange={(e) => updateMeal(mIdx, 'name', e.target.value)} placeholder="Ex: Café da manhã" className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors" />
                <input type="time" value={meal.time} onChange={(e) => updateMeal(mIdx, 'time', e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-primary transition-colors" />
              </div>
              <button onClick={() => removeMeal(mIdx)} className="w-8 h-8 flex items-center justify-center"><span className="material-icons text-red-400 text-base">remove_circle</span></button>
            </div>

            <div className="space-y-2">
              {meal.foods.map((food, fIdx) => (
                <div key={fIdx} className="flex gap-2">
                  <input value={food.food_item} onChange={(e) => updateFood(mIdx, fIdx, 'food_item', e.target.value)} placeholder="Alimento" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-primary transition-colors" />
                  <input value={food.portion} onChange={(e) => updateFood(mIdx, fIdx, 'portion', e.target.value)} placeholder="Porção" className="w-28 px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-primary transition-colors" />
                  <button onClick={() => removeFood(mIdx, fIdx)} className="w-8 h-8 flex items-center justify-center"><span className="material-icons text-gray-300 text-sm hover:text-red-400 transition-colors">close</span></button>
                </div>
              ))}
              <button type="button" onClick={() => addFood(mIdx)} className="text-xs text-primary font-semibold flex items-center gap-1 hover:text-primary-dark transition-colors">
                <span className="material-icons text-sm">add</span>
                Adicionar alimento
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-dark disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2">
        {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
        {assignTo === 'template' ? 'Salvar Modelo' : 'Salvar Plano Alimentar'}
      </button>
    </div>
  )
}
