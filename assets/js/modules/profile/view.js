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

        <!-- Cards de Stats Gamification -->
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
                    <span class="streak-title">📅 Sua Frequência</span>
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
            </div>
        </div>

        <!-- NOVA SEÇÃO: EVOLUÇÃO FÍSICA -->
        <div class="streak-section" id="physical-stats-section">
            <div class="streak-card">
                <div class="streak-header">
                    <span class="streak-title">⚖️ Minha Evolução</span>
                </div>
                
                <div id="stats-loading" style="text-align:center; color:#999;">Carregando dados...</div>

                <div id="stats-content" style="display:none;">
                     <!-- Resumo Atual -->
                     <div style="display:flex; justify-content:space-between; margin-bottom:20px; background:#f9fafb; padding:15px; border-radius:12px;">
                        <div style="text-align:center;">
                            <small style="color:#666; display:block;">Peso</small>
                            <strong id="user-weight" style="font-size:1.2rem; color:#333;">--</strong>
                        </div>
                         <div style="text-align:center;">
                            <small style="color:#666; display:block;">IMC</small>
                            <strong id="user-imc" style="font-size:1.2rem; color:var(--primary-color);">--</strong>
                        </div>
                         <div style="text-align:center;">
                            <small style="color:#666; display:block;">Cintura</small>
                            <strong id="user-waist" style="font-size:1.2rem; color:#333;">--</strong>
                        </div>
                     </div>

                     <!-- Gráfico de Peso -->
                     <p style="font-size:0.8rem; font-weight:700; color:#666; margin-bottom:10px;">HISTÓRICO DE PESO</p>
                     <div class="chart-container" id="weight-chart-user" style="height:150px; align-items:flex-end; gap:5px;">
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