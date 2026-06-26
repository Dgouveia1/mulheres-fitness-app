import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';

export const ProfileHandler = {
    async load() {
        // 1. Setup do botão de Logout
        const btn = document.getElementById('logout-btn-profile');
        if (btn) btn.onclick = async () => { await auth.signOut(); window.location.hash = '/login'; };

        // 2. Buscar Sessão
        const { data: sessionData } = await auth.getSession();
        if (!sessionData.session) return;
        const userId = sessionData.session.user.id;

        // 3. Stats Gamification
        const stats = await Services.getUserStats(userId);
        document.getElementById('stat-workouts').innerText = stats.totalWorkouts;
        document.getElementById('stat-streak').innerText = stats.streak;
        this.calculateLevel(stats.totalWorkouts);
        this.renderWeeklyFreq(stats.weeklyFreq);

        // 4. Stats Físicos (NOVO)
        this.loadPhysicalStats(userId);
    },

    calculateLevel(totalWorkouts) {
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
            if (totalWorkouts < levels[i].max) {
                currentLevel = i + 1;
                nextLevelGoal = levels[i].max;
                levelTitle = levels[i].title;
                break;
            }
        }
        if (currentLevel === 0) { 
            currentLevel = levels.length;
            nextLevelGoal = totalWorkouts * 1.5;
            levelTitle = levels[levels.length - 1].title;
        }

        document.getElementById('level-badge').innerText = currentLevel;
        document.getElementById('level-title').innerText = levelTitle;

        const previousGoal = currentLevel > 1 ? levels[currentLevel - 2].max : 0;
        const range = nextLevelGoal - previousGoal;
        const currentProgress = totalWorkouts - previousGoal;
        const percent = Math.min(100, Math.max(0, (currentProgress / range) * 100));

        setTimeout(() => {
            const bar = document.getElementById('xp-bar');
            if (bar) bar.style.width = `${percent}%`;
        }, 100);
        document.getElementById('xp-text').innerText = `${totalWorkouts} / ${nextLevelGoal} treinos para subir de nível`;
    },

    renderWeeklyFreq(weeklyFreq) {
        const todayDay = new Date().getDay();
        weeklyFreq.forEach((done, index) => {
            const circle = document.getElementById(`day-${index}`);
            if (circle) {
                if (done) {
                    circle.classList.add('active');
                    circle.innerText = '✓';
                }
                if (index === todayDay) {
                    circle.style.border = '2px solid var(--primary-color)';
                }
            }
        });
    },

    async loadPhysicalStats(userId) {
        const loading = document.getElementById('stats-loading');
        const content = document.getElementById('stats-content');
        
        try {
            const assessments = await Services.getAssessments(userId);
            
            if (!assessments || assessments.length === 0) {
                loading.innerText = 'Nenhuma avaliação física registrada ainda.';
                return;
            }

            loading.style.display = 'none';
            content.style.display = 'block';

            // Última avaliação
            const latest = assessments[0];
            const imc = (latest.weight / (latest.height * latest.height)).toFixed(1);

            document.getElementById('user-weight').innerText = `${latest.weight} kg`;
            document.getElementById('user-imc').innerText = imc;
            document.getElementById('user-waist').innerText = latest.measurements?.waist ? `${latest.measurements.waist} cm` : '-';

            // Gráfico de Peso
            this.renderWeightChart(assessments);

        } catch (e) {
            console.error(e);
            loading.innerText = 'Erro ao carregar dados.';
        }
    },

    renderWeightChart(data) {
        const container = document.getElementById('weight-chart-user');
        // Pega as últimas 7 avaliações e ordena antiga -> nova
        const chartData = data.slice(0, 7).reverse();
        
        const weights = chartData.map(d => d.weight);
        const minW = Math.min(...weights) - 2;
        const maxW = Math.max(...weights) + 2;
        const range = maxW - minW;

        container.innerHTML = chartData.map(d => {
            const heightPercent = ((d.weight - minW) / range) * 100;
            const date = new Date(d.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            
            return `
            <div class="chart-bar-wrapper">
                <span style="font-size:0.7rem; color:#666; margin-bottom:2px;">${d.weight}</span>
                <div class="chart-bar filled" style="height: ${Math.max(15, heightPercent)}%"></div>
                <span style="font-size:0.65rem; color:#999; margin-top:4px;">${date}</span>
            </div>`;
        }).join('');
    }
};