import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';
import { UserNutritionView } from './user_view.js';
import { Toast } from '../../core/toast.js';

export const UserNutritionHandler = {
    async load() {
        const content = document.querySelector('.main-content-scroll');
        if(content) content.innerHTML = '<div class="loader-spinner" style="margin:50px auto;"></div>';

        const { data: sessionData } = await auth.getSession();
        if (!sessionData.session) return;

        try {
            const diet = await Services.getActiveDiet(sessionData.session.user.id);
            
            if(content) {
                content.innerHTML = UserNutritionView.Main(diet);
            }
        } catch (e) {
            console.error(e);
            Toast.error('Erro ao carregar dieta.');
        }
    }
};

window.UserNutritionHandler = UserNutritionHandler;