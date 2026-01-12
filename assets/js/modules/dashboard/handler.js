import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';

export const DashboardHandler = {
    async load() {
        const { data } = await auth.getSession();
        if (data.session) {
            const stats = await Services.getDashboardStats(data.session.user.id);
            const el = document.getElementById('dash-stats');
            if (el) el.innerText = `${stats.completedWorkouts} treinos`;
        }
    }
};
