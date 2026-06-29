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
    <div className="space-y-5 animate-fade-in">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-light p-5 shadow-soft-lg">
        <span className="material-icons pointer-events-none absolute -right-4 -top-4 select-none text-[120px] text-white/15">restaurant_menu</span>
        <div className="relative min-w-0">
          <h1 className="text-2xl font-extrabold text-white drop-shadow-sm">Nutrição</h1>
          <p className="mt-1 text-sm text-white/80">Monte planos alimentares e salve modelos reutilizáveis</p>
        </div>
      </div>

      {/* Header do plano */}
      <div className="emf-card space-y-3 p-4 animate-slide-up">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-content">
            <span className="material-icons text-base text-primary">description</span>
            Informações do Plano
          </h2>
          {templates.length > 0 && (
            <select
              aria-label="Carregar modelo de plano"
              onChange={(e) => { loadTemplate(e.target.value); e.target.value = '' }}
              defaultValue=""
              className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-content-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
            >
              <option value="">Carregar modelo…</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          )}
        </div>
        <input value={dietTitle} onChange={(e) => setDietTitle(e.target.value)} placeholder="Nome do plano alimentar" className="emf-input" />
        <textarea value={dietDesc} onChange={(e) => setDietDesc(e.target.value)} rows={2} placeholder="Descrição / observações (opcional)" className="emf-input resize-none" />
        <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="emf-input">
          <option value="">Atribuir a…</option>
          <option value="template">⭐ Salvar como modelo</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
      </div>

      {/* Refeições */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-content">
            <span className="material-icons text-base text-primary">restaurant</span>
            Refeições
            <span className="emf-badge bg-primary/10 text-primary">{meals.length}</span>
          </h2>
          <button
            onClick={addMeal}
            aria-label="Adicionar refeição"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-primary/10 px-3.5 text-xs font-bold text-primary transition-colors hover:bg-primary/15 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="material-icons text-base">add_circle</span>
            Adicionar
          </button>
        </div>

        {meals.map((meal, mIdx) => (
          <div key={mIdx} className="emf-card space-y-3 p-4 animate-scale-in transition-shadow hover:shadow-soft-lg">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <div className="relative">
                  <span className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-content-subtle">lunch_dining</span>
                  <input
                    value={meal.name}
                    onChange={(e) => updateMeal(mIdx, 'name', e.target.value)}
                    placeholder="Ex: Café da manhã"
                    aria-label="Nome da refeição"
                    className="w-full rounded-xl border border-line bg-surface py-2 pl-10 pr-3 text-sm font-semibold text-content placeholder:font-normal placeholder:text-content-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
                  />
                </div>
                <div className="relative">
                  <span className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-content-subtle">schedule</span>
                  <input
                    type="time"
                    value={meal.time}
                    onChange={(e) => updateMeal(mIdx, 'time', e.target.value)}
                    aria-label="Horário da refeição"
                    className="w-full rounded-xl border border-line bg-surface py-2 pl-10 pr-3 text-sm text-content transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary sm:w-36"
                  />
                </div>
              </div>
              <button
                onClick={() => removeMeal(mIdx)}
                aria-label="Remover refeição"
                title="Remover refeição"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <span className="material-icons text-base">remove_circle</span>
              </button>
            </div>

            <div className="space-y-2 border-t border-line pt-3">
              {meal.foods.map((food, fIdx) => (
                <div key={fIdx} className="flex items-center gap-2">
                  <input
                    value={food.food_item}
                    onChange={(e) => updateFood(mIdx, fIdx, 'food_item', e.target.value)}
                    placeholder="Alimento"
                    aria-label="Alimento"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-muted px-3 py-2 text-xs text-content placeholder:text-content-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary focus:bg-surface"
                  />
                  <input
                    value={food.portion}
                    onChange={(e) => updateFood(mIdx, fIdx, 'portion', e.target.value)}
                    placeholder="Porção"
                    aria-label="Porção"
                    className="w-24 shrink-0 rounded-xl border border-line bg-muted px-3 py-2 text-xs text-content placeholder:text-content-subtle transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary focus:bg-surface sm:w-28"
                  />
                  <button
                    onClick={() => removeFood(mIdx, fIdx)}
                    aria-label="Remover alimento"
                    title="Remover alimento"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-content-subtle transition-colors hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <span className="material-icons text-sm">close</span>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addFood(mIdx)}
                aria-label="Adicionar alimento"
                className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg px-1"
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
        className="emf-btn-primary w-full py-3 text-sm font-bold"
      >
        {saving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
        {!saving && <span className="material-icons text-base">{assignTo === 'template' ? 'bookmark' : 'send'}</span>}
        {assignTo === 'template' ? 'Salvar Modelo' : 'Salvar Plano Alimentar'}
      </button>
    </div>
  )
}
