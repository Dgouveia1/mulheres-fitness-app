import { useEffect, useState } from 'react'
import { useAuth } from '@emf/shared'
import { getMyWorkouts } from '@emf/shared'
import { Modal } from '@emf/shared'
import { WorkoutSessionPlayer } from '@/components/student/WorkoutSessionPlayer'

const MUSCLE_LABELS = {
  pernas: 'Pernas', gluteos: 'Glúteos', costas: 'Costas', peito: 'Peito',
  ombros: 'Ombros', bracos: 'Braços', abdomen: 'Abdômen', cardio: 'Cardio',
}

export function WorkoutsPage() {
  const { user } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [sessionWorkout, setSessionWorkout] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    getMyWorkouts(user.id).then((data) => {
      setWorkouts(data)
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

  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 p-6 text-center">
        <span className="text-5xl">💪</span>
        <h3 className="font-bold text-gray-700">Nenhum treino ainda</h3>
        <p className="text-sm text-gray-400">Seu personal irá configurar seu plano de treinos em breve.</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-800">Meus Treinos</h1>

      {workouts.map((workout) => (
        <div key={workout.id} className="bg-white rounded-2xl border border-gray-100 shadow-pink-sm overflow-hidden">
          <div className="p-4 flex items-center gap-3">
            <button
              className="flex-1 flex items-center justify-between text-left min-w-0"
              onClick={() => setSelectedWorkout(selectedWorkout?.id === workout.id ? null : workout)}
            >
              <div className="min-w-0">
                <h3 className="font-bold text-gray-800 truncate">{workout.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{workout.items?.length || 0} exercícios</p>
              </div>
              <span className={`material-icons text-gray-400 transition-transform ${selectedWorkout?.id === workout.id ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
          </div>

          <div className="px-4 pb-4">
            <button
              onClick={() => setSessionWorkout(workout)}
              disabled={!workout.items?.length}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark active:scale-[0.99] transition-all disabled:opacity-50"
            >
              <span className="material-icons text-lg">play_arrow</span>
              Iniciar treino
            </button>
          </div>

          {selectedWorkout?.id === workout.id && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {workout.items?.map((item) => (
                <button
                  key={item.id}
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setSelectedExercise(item)}
                >
                  {item.exercise?.image_url ? (
                    <img src={item.exercise.image_url} alt={item.exercise.name} className="w-14 h-14 rounded-xl object-cover bg-gray-100" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="material-icons text-primary">fitness_center</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{item.exercise?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{MUSCLE_LABELS[item.exercise?.muscle_group] || item.exercise?.muscle_group}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs font-medium text-primary">{item.sets}x</span>
                      <span className="text-xs text-gray-500">{item.reps} reps</span>
                      {item.rest_seconds > 0 && <span className="text-xs text-gray-400">Desc: {item.rest_seconds}s</span>}
                    </div>
                  </div>
                  {item.exercise?.video_url && (
                    <span className="material-icons text-primary text-lg">play_circle</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Exercise Detail Modal */}
      <Modal isOpen={!!selectedExercise} onClose={() => setSelectedExercise(null)} title={selectedExercise?.exercise?.name}>
        {selectedExercise && (
          <div className="space-y-4">
            {selectedExercise.exercise?.video_url ? (
              <video src={selectedExercise.exercise.video_url} controls className="w-full rounded-xl bg-black" />
            ) : selectedExercise.exercise?.image_url ? (
              <img src={selectedExercise.exercise.image_url} alt="" className="w-full rounded-xl object-cover max-h-48" />
            ) : null}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Séries', value: selectedExercise.sets },
                { label: 'Repetições', value: selectedExercise.reps },
                { label: 'Descanso', value: `${selectedExercise.rest_seconds}s` },
              ].map((stat) => (
                <div key={stat.label} className="bg-primary/5 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-primary">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {selectedExercise.suggested_load_kg > 0 && (
              <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-2">
                <span className="material-icons text-amber-500 text-base">fitness_center</span>
                <span className="text-sm text-amber-800">Carga sugerida: <strong>{selectedExercise.suggested_load_kg} kg</strong></span>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Player de treino guiado */}
      {sessionWorkout && (
        <WorkoutSessionPlayer
          workout={sessionWorkout}
          userId={user?.id}
          onClose={() => setSessionWorkout(null)}
        />
      )}
    </div>
  )
}
