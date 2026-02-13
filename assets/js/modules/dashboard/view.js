export const DashboardView = {
    Template: (user) => `
    <div class="page-content">
        <header class="page-header" style="margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom:0;">Bem-vinda de volta,</p>
                <h1 style="font-size: 1.5rem; color: #333; line-height:1.2;">${user?.profile?.full_name?.split(' ')[0] || 'Aluna'}! ✨</h1>
            </div>
            <div style="width:40px;height:40px;border-radius:50%;background:#eee;overflow:hidden;border: 2px solid white;box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <img src="${user?.profile?.avatar_url || 'https://ui-avatars.com/api/?name=' + (user?.email || 'User')}" style="width:100%;height:100%;object-fit:cover;">
            </div>
        </header>

        <!-- CARROSSEL DE BANNERS -->
        <div class="banner-carousel">
            <div class="banner-item" style="background: linear-gradient(135deg, #ff0080, #7928ca);">
                <div class="banner-content">
                    <span class="banner-tag">NOVIDADE</span>
                    <h3 style="font-size:1.4rem; margin-top:4px; line-height:1.1;">Desafio de Verão ☀️</h3>
                    <p style="font-size:0.85rem; opacity:0.9;">Participe agora!</p>
                </div>
                <div style="position:absolute; right:-20px; bottom:-20px; font-size:8rem; opacity:0.1; transform: rotate(-15deg);">🔥</div>
            </div>

            <div class="banner-item" style="background: linear-gradient(135deg, #10b981, #059669);">
                 <div class="banner-content">
                    <span class="banner-tag">DICA NUTRI</span>
                    <h3 style="font-size:1.4rem; margin-top:4px; line-height:1.1;">Hidrate-se! 💧</h3>
                    <p style="font-size:0.85rem; opacity:0.9;">A água é essencial para...</p>
                </div>
                 <div style="position:absolute; right:-20px; bottom:-20px; font-size:8rem; opacity:0.1; transform: rotate(15deg);">🥒</div>
            </div>

             <div class="banner-item" style="background: linear-gradient(135deg, #3b82f6, #2563eb);">
                 <div class="banner-content">
                    <span class="banner-tag">AVISO</span>
                    <h3 style="font-size:1.4rem; margin-top:4px; line-height:1.1;">Avaliação Física 📋</h3>
                    <p style="font-size:0.85rem; opacity:0.9;">Agende sua renovação.</p>
                </div>
            </div>
        </div>

        <!-- QUADRO DE AVISOS -->
        <div class="section-title">Avisos Importantes 📢</div>
        <div class="notice-board">
            <div class="notice-icon">🗓️</div>
            <div class="notice-content">
                <h4>Horário de Feriado</h4>
                <p>Neste feriado (15/11), funcionaremos das 09h às 13h. Programe seu treino!</p>
            </div>
        </div>

        <!-- GRID DE ACESSO RÁPIDO -->
        <div class="dashboard-grid">
            <div class="card highlight-card">
                <div class="card-content">
                    <h3>Treinos Concluídos</h3>
                    <p id="dash-stats">Carregando...</p>
                </div>
            </div>
            
            <div class="section-title">Acesso Rápido</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div class="card action-card" onclick="window.location.hash='/treinos'" style="flex-direction: column; text-align: center; padding: 20px;">
                    <span class="icon" style="margin: 0 auto;">💪</span>
                    <div class="text"><h3>Treinar</h3></div>
                </div>
                <div class="card action-card" onclick="window.location.hash='/fitflix'" style="flex-direction: column; text-align: center; padding: 20px;">
                    <span class="icon" style="margin: 0 auto;">🎬</span>
                    <div class="text"><h3>Aulas</h3></div>
                </div>
            </div>
            <div class="card action-card" onclick="window.location.hash='/fitgran'" style="margin-top: 8px;">
                <span class="icon">📸</span>
                <div class="text"><h3>Comunidade VIP</h3><p>Ver novidades</p></div>
            </div>
            
            <div class="card action-card" id="btn-subscribe" style="margin-top: 8px; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: white;">
                <span class="icon">👑</span>
                <div class="text"><h3 style="color: white;">Seja Premium</h3><p style="color: rgba(255,255,255,0.9);">Assinar Agora</p></div>
            </div>
        </div>
    </div>
    `
};
