import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';
import { AsaasService } from '../../core/asaas.js';

export const DashboardHandler = {
    async load() {
        const { data } = await auth.getSession();
        if (data.session) {
            const user = data.session.user;
            const stats = await Services.getDashboardStats(user.id);
            const el = document.getElementById('dash-stats');
            if (el) el.innerText = `${stats.completedWorkouts} treinos`;

            // Setup Assinatura
            const btnSubscribe = document.getElementById('btn-subscribe');
            if (btnSubscribe) {
                btnSubscribe.onclick = () => this.handleSubscription(user);
            }
        }
    },

    async handleSubscription(user) {
        alert('A funcionalidade de assinatura em breve estará de volta!');
        return;
    }
};

