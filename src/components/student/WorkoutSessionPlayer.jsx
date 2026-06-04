import { useEffect, useRef, useState } from 'react'
import { logWorkoutSet } from '@/services/api'
import { useToast } from '@/components/ui/Toast'

const MUSCLE_LABELS = {
  pernas: 'Pernas', gluteos: 'Glúteos', costas: 'Costas', peito: 'Peito',
  ombros: 'Ombros', bracos: 'Braços', abdomen: 'Abdômen', cardio: 'Cardio',
}

// Player de treino guiado: percorre exercícios e séries, registra cada série
// concluída em workout_logs e roda o timer de descanso entre séries.
export function WorkoutSessionPlayer({ workout, userId, onClose }) {
  const { show } = useToast()
  const items = (workout?.items || [])

  const [index, setIndex] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [load, setLoad] = useState(0)
  const [reps, setReps] = useState(0)
  const [resting, setResting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [saving, setSaving] = useState(false)

  const mountedRef = useRef(true)
  const savingRef = useRef(false) // dedup síncrono contra toques rápidos

  const item = items[index]
  const exercise = item?.exercise

  // Inicializa carga/reps ao trocar de exercício
  useEffect(() => {
    if (!item) return
    setLoad(item.suggested_load_kg || 0)
    setReps(item.reps || 10)
    setCurrentSet(1)
    setResting(false)
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps

  // Contagem regressiva do descanso (fecha no último tick, sem mostrar "0s")
  useEffect(() => {
    if (!resting) return
    if (timeLeft <= 0) { setResting(false); return }
    const t = setTimeout(() => {
      if (timeLeft <= 1) setResting(false)
      else setTimeLeft((s) => s - 1)
    }, 1000)
    return () => clearTimeout(t)
  }, [resting, timeLeft])

  // Trava o scroll do body e marca desmontagem
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      mountedRef.current = false
    }
  }, [])

  if (!item) return null

  const totalSets = item.sets || 1
  const isLastSet = currentSet >= totalSets
  const isLastExercise = index >= items.length - 1
  const actionLabel = isLastSet
    ? (isLastExercise ? 'Concluir treino' : 'Finalizar exercício')
    : 'Concluir série'
  const progress = items.length ? ((index + (currentSet - 1) / totalSets) / items.length) * 100 : 0

  function goNextExercise() {
    if (isLastExercise) {
      show('Treino concluído! Parabéns! 💪', 'success')
      onClose(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  async function completeSet() {
    if (savingRef.current || resting) return
    savingRef.current = true
    setSaving(true)

    const repsVal = Math.round(Number(reps)) || item.reps || 10
    const loadVal = Number(load) || 0

    let logError = null
    if (userId && exercise?.id) {
      try {
        const { error } = await logWorkoutSet({
          user_id: userId,
          workout_id: workout.id,
          exercise_id: exercise.id,
          load_kg: loadVal,
          reps_performed: repsVal,
        })
        logError = error
      } catch (e) {
        logError = e
      }
    }

    if (!mountedRef.current) return
    savingRef.current = false
    setSaving(false)

    // Falha de log é visível (toast) mas não trava o treino
    if (logError) show('Não foi possível registrar a série.', 'error')

    if (currentSet < totalSets) {
      setCurrentSet((s) => s + 1)
      if (item.rest_seconds > 0) {
        setTimeLeft(item.rest_seconds)
        setResting(true)
      }
    } else {
      goNextExercise()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-gray-900 flex flex-col">
      {/* Topo: progresso + fechar */}
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <button onClick={() => onClose(false)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
          <span className="material-icons">close</span>
        </button>
        <div className="flex-1">
          <div className="text-xs text-white/60">Exercício {index + 1} de {items.length}</div>
          <div className="h-1 bg-white/15 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Mídia */}
      <div className="relative flex-1 min-h-0 bg-black">
        {exercise?.video_url ? (
          <video src={exercise.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
        ) : exercise?.image_url ? (
          <img src={exercise.image_url} alt={exercise?.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">
            <span className="material-icons text-6xl">fitness_center</span>
          </div>
        )}

        {/* Overlay de descanso */}
        {resting && (
          <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center gap-4 text-white">
            <div className="text-sm uppercase tracking-widest text-white/60">Descanso</div>
            <div className="text-7xl font-bold tabular-nums">{timeLeft}s</div>
            <div className="text-sm text-white/60">Próxima: Série {Math.min(currentSet, totalSets)} de {totalSets}</div>
            <button
              onClick={() => { setResting(false); setTimeLeft(0) }}
              className="mt-2 px-6 py-2.5 bg-white/15 hover:bg-white/25 rounded-full text-sm font-semibold transition-colors"
            >
              Pular descanso
            </button>
          </div>
        )}
      </div>

      {/* Painel de controle */}
      <div className="bg-white rounded-t-3xl px-5 pt-5 pb-6 space-y-4 shadow-2xl">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{exercise?.name}</h2>
          <p className="text-xs text-gray-400">
            {MUSCLE_LABELS[exercise?.muscle_group] || exercise?.muscle_group || 'Geral'} • {totalSets} séries de {item.reps || 10} reps
            {item.rest_seconds > 0 && ` • descanso ${item.rest_seconds}s`}
          </p>
        </div>

        {/* Dots das séries */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSets }).map((_, i) => {
            const n = i + 1
            const state = n < currentSet ? 'done' : n === currentSet ? 'active' : 'todo'
            return (
              <div
                key={n}
                className={`flex-1 h-2 rounded-full ${state === 'done' ? 'bg-emerald-500' : state === 'active' ? 'bg-primary' : 'bg-gray-200'}`}
              />
            )
          })}
        </div>
        <div className="text-center text-sm font-semibold text-gray-600">Série {Math.min(currentSet, totalSets)} de {totalSets}</div>

        {/* Inputs carga / reps */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Carga (kg)</span>
            <input
              type="number" inputMode="decimal" min="0" step="0.5" value={load}
              onChange={(e) => setLoad(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-lg font-bold text-gray-800 focus:outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Repetições</span>
            <input
              type="number" inputMode="numeric" min="0" step="1" value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-center text-lg font-bold text-gray-800 focus:outline-none focus:border-primary"
            />
          </label>
        </div>

        <button
          onClick={completeSet}
          disabled={saving || resting}
          className={`w-full py-4 rounded-2xl text-white font-bold text-base active:scale-[0.99] transition-all disabled:opacity-60 ${isLastSet ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-primary hover:bg-primary-dark'}`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  )
}
