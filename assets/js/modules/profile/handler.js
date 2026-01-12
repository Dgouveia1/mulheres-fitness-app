import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';

export const ProfileHandler = {
    async load() {
        // 1. Setup do botão de Logout
        const btn = document.getElementById('logout-btn-profile');
        if (btn) btn.onclick = async () => { await auth.signOut(); window.location.hash = '/login'; };

        // 2. Buscar Dados e Calcular Níveis
        const { data: sessionData } = await auth.getSession();
        if (!sessionData.session) return;
        const userId = sessionData.session.user.id;

        const stats = await Services.getUserStats(userId);

        // Preenche Stats Básicos
        document.getElementById('stat-workouts').innerText = stats.totalWorkouts;
        document.getElementById('stat-streak').innerText = stats.streak;

        // Lógica de Gamificação (Níveis)
        const levels = [
            { max: 10, title: '🌱 Iniciante', color: '#888' },
            { max: 30, title: '🦋 Em Evolução', color: '#ff40ac' },
            { max: 60, title: '🔥 Imparável', color: '#ff0080' },
            { max: 9999, title: '👑 Musa Fitness', color: '#FFD700' }
        ];

        let currentLevel = 0;
        let nextLevelGoal = 10;
        let levelTitle = 'Iniciante';

        for (let i = 0; i < levels.length; i++) {
            if (stats.totalWorkouts < levels[i].max) {
                currentLevel = i + 1;
                nextLevelGoal = levels[i].max;
                levelTitle = levels[i].title;
                break;
            }
        }
        if (currentLevel === 0) { // Max level case
            currentLevel = levels.length;
            nextLevelGoal = stats.totalWorkouts * 1.5;
            levelTitle = levels[levels.length - 1].title;
        }

        // Atualiza UI do Nível
        document.getElementById('level-badge').innerText = currentLevel;
        document.getElementById('level-title').innerText = levelTitle;

        // Barra de Progresso XP
        const previousGoal = currentLevel > 1 ? levels[currentLevel - 2].max : 0;
        const range = nextLevelGoal - previousGoal;
        const currentProgress = stats.totalWorkouts - previousGoal;
        const percent = Math.min(100, Math.max(0, (currentProgress / range) * 100));

        setTimeout(() => {
            const bar = document.getElementById('xp-bar');
            if (bar) bar.style.width = `${percent}%`;
        }, 100);
        document.getElementById('xp-text').innerText = `${stats.totalWorkouts} / ${nextLevelGoal} treinos para subir de nível`;

        // Preenche Dias da Semana
        const todayDay = new Date().getDay();
        stats.weeklyFreq.forEach((done, index) => {
            const circle = document.getElementById(`day-${index}`);
            if (circle) {
                if (done) {
                    circle.classList.add('active');
                    circle.innerText = '✓';
                }
                // Destaque para o dia de hoje
                if (index === todayDay) {
                    circle.style.border = '2px solid var(--primary-color)';
                }
            }
        });

        // Gráfico de Volume
        const chartContainer = document.getElementById('volume-chart');
        if (chartContainer) {
            const barsHTML = stats.weeklyFreq.map((active, idx) => {
                const height = active ? (Math.random() * 50 + 40) + '%' : '4px';
                const isFilled = active ? 'filled' : '';
                return `
                <div class="chart-bar-wrapper">
                    <div class="chart-bar ${isFilled}" style="height: ${height}"></div>
                </div>`;
            }).join('');
            chartContainer.innerHTML = barsHTML;
        }
    }
};
