import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';
import { StudentWorkoutView } from './view.js';
import { WorkoutSessionController } from './controller.js';
import { Toast } from '../../core/toast.js';

export const StudentWorkoutHandler = {
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
            // Busca treinos da aluna
            const workouts = await Services.getMyWorkouts(user.id);
            
            // Renderiza a lista
            if(mainContent) {
                mainContent.innerHTML = StudentWorkoutView.List(workouts);
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
    }
};

// Exporta para global window para ser acessível via onclick no HTML string
window.StudentWorkoutHandler = StudentWorkoutHandler;