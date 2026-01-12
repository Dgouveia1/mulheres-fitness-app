export const ProfileView = {
    Template: (user) => `
    <div style="background: #fdf2f8; min-height: 100vh;">
        <!-- Header Moderno -->
        <div class="profile-header-modern">
            <div class="profile-avatar-container">
                <img src="${user?.profile?.avatar_url || 'https://ui-avatars.com/api/?name=' + user?.email + '&background=random'}" class="profile-avatar">
                <div class="level-badge" id="level-badge">1</div>
            </div>
            <h2 class="profile-name">${user?.profile?.full_name || 'Usuário'}</h2>
            <div class="profile-level-title" id="level-title">Iniciante</div>
            
            <div class="xp-bar-container">
                <div class="xp-bar-fill" id="xp-bar" style="width: 0%"></div>
            </div>
            <div class="xp-text" id="xp-text">0 / 10 para o próximo nível</div>
        </div>

        <!-- Cards de Stats -->
        <div class="stats-overview">
            <div class="stat-box">
                <span class="stat-value" id="stat-workouts">0</span>
                <span class="stat-label">Treinos Totais</span>
            </div>
            <div class="stat-box">
                <span class="stat-value" id="stat-streak">0</span>
                <span class="stat-label">Dias Seguidos 🔥</span>
            </div>
        </div>

        <!-- Frequência Semanal -->
        <div class="streak-section">
            <div class="streak-card">
                <div class="streak-header">
                    <span class="streak-title">📅 Sua Semana</span>
                    <span style="font-size: 0.8rem; color: #999;">Histórico Recente</span>
                </div>
                <div class="streak-days">
                    <div class="day-circle"><span>D</span><div class="circle" id="day-0"></div></div>
                    <div class="day-circle"><span>S</span><div class="circle" id="day-1"></div></div>
                    <div class="day-circle"><span>T</span><div class="circle" id="day-2"></div></div>
                    <div class="day-circle"><span>Q</span><div class="circle" id="day-3"></div></div>
                    <div class="day-circle"><span>Q</span><div class="circle" id="day-4"></div></div>
                    <div class="day-circle"><span>S</span><div class="circle" id="day-5"></div></div>
                    <div class="day-circle"><span>S</span><div class="circle" id="day-6"></div></div>
                </div>
                
                <!-- Gráfico de Volume Simples (HTML/CSS) -->
                <div style="margin-top: 20px; border-top: 1px dashed #eee; padding-top: 15px;">
                    <span class="streak-title" style="font-size: 0.9rem; margin-bottom: 10px;">📊 Esforço Diário (Carga Total)</span>
                    <div class="chart-container" id="volume-chart">
                        <!-- Barras injetadas via JS -->
                    </div>
                </div>
            </div>
        </div>

        <!-- Menu de Configurações -->
        <div class="settings-list">
            <div class="setting-item" onclick="alert('Em breve: Edição de perfil')">
                <div class="setting-icon">⚙️</div>
                <div class="setting-text">Editar Dados</div>
            </div>
            <div class="setting-item" id="logout-btn-profile">
                <div class="setting-icon" style="color: var(--error-color); background: #fee2e2;">🚪</div>
                <div class="setting-text" style="color: var(--error-color);">Sair da Conta</div>
            </div>
        </div>
    </div>
    `
};
