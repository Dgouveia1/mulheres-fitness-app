import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';
import { StudentWorkoutView } from './view.js';
import { WorkoutSessionController } from './controller.js';
import { Toast } from '../../core/toast.js';

export const StudentWorkoutHandler = {
    workoutsCache: [], // Cache local para busca

    async load() {
        const { data: sessionData } = await auth.getSession();
        
        // Verifica se tem sessão
        if (!sessionData || !sessionData.session) {
            Toast.error('Você precisa estar logada.');
            window.location.hash = '/login';
            return;
        }

        const user = sessionData.session.user;
        const mainContent = document.querySelector('.main-content-scroll');
        
        // Estado de Loading
        if(mainContent) mainContent.innerHTML = '<div class="loader-spinner" style="margin:50px auto;"></div>';

        try {
            // Busca treinos da aluna e armazena no cache
            const workouts = await Services.getMyWorkouts(user.id);
            this.workoutsCache = workouts || [];
            
            // Renderiza a lista
            if(mainContent) {
                mainContent.innerHTML = StudentWorkoutView.List(this.workoutsCache);
            }

        } catch (error) {
            console.error('Erro ao carregar treinos:', error);
            Toast.error('Erro ao carregar seus treinos.');
            if(mainContent) mainContent.innerHTML = '<p class="text-center" style="padding:20px;">Erro de conexão.</p>';
        }
    },

    openSession(workoutId) {
        // Delega para o Controller de Sessão existente
        WorkoutSessionController.open(workoutId, 0);
    },

    filterWorkouts(term) {
        const list = document.getElementById('student-workouts-list');
        if (!list) return;

        const lower = term.toLowerCase();
        
        const filtered = this.workoutsCache.filter(w => 
            w.title.toLowerCase().includes(lower) || 
            (w.description && w.description.toLowerCase().includes(lower))
        );

        if (filtered.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#999; padding:30px;">Nenhum treino encontrado com este termo.</p>';
            return;
        }

        // Reutiliza o método Card da View para renderizar apenas os itens
        list.innerHTML = filtered.map(w => StudentWorkoutView.Card(w)).join('');
    }
};

// Exporta para global window para ser acessível via onclick no HTML string
window.StudentWorkoutHandler = StudentWorkoutHandler;