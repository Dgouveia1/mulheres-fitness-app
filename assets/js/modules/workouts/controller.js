import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';
import { Toast } from '../../core/toast.js';

export const WorkoutSessionController = {
    currentWorkout: null,
    currentItemIndex: 0,
    currentSet: 1,
    timerInterval: null,

    async open(workoutId, exerciseIndex = 0) {
        const { data: session } = await auth.getSession();
        if (!session.session) return Toast.error('Faça login para treinar.');

        const workouts = await Services.getMyWorkouts(session.session.user.id);
        this.currentWorkout = workouts.find(w => w.id == workoutId);

        if (!this.currentWorkout) return Toast.error('Treino não encontrado.');

        this.currentItemIndex = parseInt(exerciseIndex);
        this.currentSet = 1;
        this.loadExerciseUI();

        document.getElementById('workout-modal').classList.add('active');

        const actionBtn = document.getElementById('modal-action-btn');
        const skipBtn = document.getElementById('skip-timer-btn');

        const newActionBtn = actionBtn.cloneNode(true);
        actionBtn.parentNode.replaceChild(newActionBtn, actionBtn);
        newActionBtn.onclick = () => this.logSet();

        skipBtn.onclick = () => this.skipTimer();

        const item = this.currentWorkout.items[this.currentItemIndex];
        document.getElementById('input-load').value = item.suggested_load_kg || 0;
        document.getElementById('input-reps').value = item.reps || 10;
    },

    loadExerciseUI() {
        const item = this.currentWorkout.items[this.currentItemIndex];
        const exercise = item.exercise;

        document.getElementById('modal-ex-name').innerText = exercise.name;
        document.getElementById('modal-ex-muscle').innerText = exercise.muscle_group || 'Geral';
        document.getElementById('modal-meta-info').innerText = `${item.sets} Séries de ${item.reps} reps • Descanso: ${item.rest_seconds}s`;
        document.getElementById('modal-set-text').innerText = `Série ${this.currentSet} de ${item.sets}`;

        const mediaContainer = document.getElementById('modal-media');
        const imgUrl = exercise.image_url || 'https://placehold.co/600x400?text=Exercicio';

        if (exercise.video_url) {
            mediaContainer.innerHTML = `<video src="${exercise.video_url}" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>`;
        } else {
            mediaContainer.innerHTML = `<img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover;">`;
        }

        const dotsContainer = document.getElementById('modal-dots');
        dotsContainer.innerHTML = '';
        for (let i = 1; i <= item.sets; i++) {
            const dot = document.createElement('div');
            dot.className = `set-dot ${i < this.currentSet ? 'completed' : ''} ${i === this.currentSet ? 'active' : ''}`;
            dotsContainer.appendChild(dot);
        }

        const btn = document.getElementById('modal-action-btn');
        if (this.currentSet > item.sets) {
            btn.innerText = 'Próximo Exercício';
        } else if (this.currentSet === item.sets) {
            btn.innerText = 'Finalizar Exercício';
            btn.style.background = '#10b981';
        } else {
            btn.innerText = 'Concluir Série';
            btn.style.background = 'var(--primary-color)';
        }
    },

    async logSet() {
        const item = this.currentWorkout.items[this.currentItemIndex];
        const load = document.getElementById('input-load').value;
        const reps = document.getElementById('input-reps').value;

        const { data: userSession } = await auth.getSession();
        if (userSession.session) {
            Services.logWorkoutSet({
                user_id: userSession.session.user.id,
                workout_id: this.currentWorkout.id,
                exercise_id: item.exercise.id,
                load_kg: load,
                reps_performed: reps
            });
            // Toast sutil para confirmar o salvamento
            // Toast.success(`Série ${this.currentSet} registrada!`); 
        }

        if (this.currentSet < item.sets) {
            this.startTimer(item.rest_seconds);
            this.currentSet++;
        } else {
            this.nextExercise();
        }
    },

    startTimer(seconds) {
        const overlay = document.querySelector('.timer-overlay');
        const display = document.getElementById('timer-countdown');
        let timeLeft = seconds;

        overlay.classList.add('active');
        display.innerText = timeLeft;

        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            timeLeft--;
            display.innerText = timeLeft;
            if (timeLeft <= 0) this.skipTimer();
        }, 1000);
    },

    skipTimer() {
        clearInterval(this.timerInterval);
        document.querySelector('.timer-overlay').classList.remove('active');
        this.loadExerciseUI();
    },

    nextExercise() {
        if (this.currentItemIndex < this.currentWorkout.items.length - 1) {
            this.currentItemIndex++;
            this.currentSet = 1;
            this.loadExerciseUI();
        } else {
            Toast.success('Treino Concluído! Parabéns! 💪');
            document.getElementById('workout-modal').classList.remove('active');
            window.location.hash = '/';
        }
    }
};
