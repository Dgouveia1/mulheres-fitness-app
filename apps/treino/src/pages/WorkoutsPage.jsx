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
      <div className="p-4 space-y-4">
        <div className="emf-skeleton h-7 w-44 rounded-xl" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="emf-card overflow-hidden p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-2">
                <div className="emf-skeleton h-5 w-2/3 rounded-lg" />
                <div className="emf-skeleton h-3 w-24 rounded-md" />
              </div>
              <div className="emf-skeleton h-6 w-6 rounded-full" />
            </div>
            <div className="emf-skeleton h-12 w-full rounded-xl" />
          </div>
        ))}
      </div>
    )
  }

  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[16rem] gap-4 p-8 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="material-icons text-primary text-3xl">fitness_center</span>
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-content">Nenhum treino ainda</h3>
          <p className="text-sm text-content-muted max-w-xs">Seu personal irá configurar seu plano de treinos em breve.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center gap-3 animate-fade-in">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-light text-white shadow-pink-md shrink-0">
          <span className="material-icons">fitness_center</span>
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-content leading-tight">Meus Treinos</h1>
          <p className="text-xs text-content-muted">{workouts.length} {workouts.length === 1 ? 'plano disponível' : 'planos disponíveis'}</p>
        </div>
      </header>

      {workouts.map((workout, index) => {
        const isOpen = selectedWorkout?.id === workout.id
        return (
          <div
            key={workout.id}
            className="emf-card overflow-hidden animate-slide-up"
            style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
          >
            <div className="p-4 flex items-center gap-3">
              <button
                className="flex-1 flex items-center justify-between gap-3 text-left min-w-0 min-h-[44px] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                onClick={() => setSelectedWorkout(isOpen ? null : workout)}
                aria-expanded={isOpen}
                aria-label={`${isOpen ? 'Recolher' : 'Expandir'} treino ${workout.title}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <span className="material-icons">list_alt</span>
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-content truncate">{workout.title}</h3>
                    <p className="text-xs text-content-muted mt-0.5">{workout.items?.length || 0} exercícios</p>
                  </div>
                </div>
                <span className={`material-icons text-content-subtle transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`}>expand_more</span>
              </button>
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => setSessionWorkout(workout)}
                disabled={!workout.items?.length}
                className="w-full flex items-center justify-center gap-2 py-3 min-h-[44px] bg-gradient-to-br from-primary to-primary-light text-white rounded-xl text-sm font-bold shadow-pink-md hover:shadow-pink-lg active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
              >
                <span className="material-icons text-lg">play_arrow</span>
                Iniciar treino
              </button>
            </div>

            {isOpen && (
              <div className="border-t border-line divide-y divide-line animate-fade-in">
                {workout.items?.map((item) => (
                  <button
                    key={item.id}
                    className="w-full p-3 flex items-center gap-3 text-left min-h-[44px] hover:bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 cursor-pointer"
                    onClick={() => setSelectedExercise(item)}
                  >
                    {item.exercise?.image_url ? (
                      <img src={item.exercise.image_url} alt={item.exercise.name} className="w-14 h-14 rounded-xl object-cover bg-muted shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="material-icons text-primary">fitness_center</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-content truncate">{item.exercise?.name}</p>
                      <p className="text-xs text-content-muted mt-0.5">{MUSCLE_LABELS[item.exercise?.muscle_group] || item.exercise?.muscle_group}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                        <span className="emf-badge bg-primary/10 text-primary">{item.sets}x</span>
                        <span className="text-xs font-medium text-content-muted self-center">{item.reps} reps</span>
                        {item.rest_seconds > 0 && <span className="text-xs text-content-subtle self-center">Desc: {item.rest_seconds}s</span>}
                      </div>
                    </div>
                    {item.exercise?.video_url && (
                      <span className="material-icons text-primary text-xl shrink-0" aria-hidden="true">play_circle</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Exercise Detail Modal */}
      <Modal isOpen={!!selectedExercise} onClose={() => setSelectedExercise(null)} title={selectedExercise?.exercise?.name}>
        {selectedExercise && (
          <div className="space-y-4">
            {selectedExercise.exercise?.video_url ? (
              <video src={selectedExercise.exercise.video_url} controls className="w-full rounded-2xl bg-black shadow-soft" />
            ) : selectedExercise.exercise?.image_url ? (
              <img src={selectedExercise.exercise.image_url} alt={selectedExercise.exercise?.name || ''} className="w-full rounded-2xl object-cover max-h-48 shadow-soft" />
            ) : null}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Séries', value: selectedExercise.sets, icon: 'repeat' },
                { label: 'Repetições', value: selectedExercise.reps, icon: 'fitness_center' },
                { label: 'Descanso', value: `${selectedExercise.rest_seconds}s`, icon: 'timer' },
              ].map((stat) => (
                <div key={stat.label} className="bg-primary/5 dark:bg-primary/10 border border-primary/10 rounded-2xl p-3 text-center">
                  <span className="material-icons text-primary/70 text-base" aria-hidden="true">{stat.icon}</span>
                  <div className="text-xl font-bold text-primary leading-tight">{stat.value}</div>
                  <div className="text-xs text-content-muted mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {selectedExercise.suggested_load_kg > 0 && (
              <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 rounded-2xl p-3 flex items-center gap-2">
                <span className="material-icons text-amber-500 text-base" aria-hidden="true">fitness_center</span>
                <span className="text-sm text-amber-700 dark:text-amber-300">Carga sugerida: <strong>{selectedExercise.suggested_load_kg} kg</strong></span>
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
