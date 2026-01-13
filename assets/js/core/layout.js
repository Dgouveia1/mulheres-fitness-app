export const Layout = {
    // Layout App Mobile (Aluna)
    Main: (contentHTML, activeRoute) => {
        // Injeta CSS de Nutrição se não existir
        if (!document.getElementById('nutrition-css')) {
            const link = document.createElement('link');
            link.id = 'nutrition-css';
            link.rel = 'stylesheet';
            link.href = 'assets/css/modules/nutrition.css';
            document.head.appendChild(link);
        }

        return `
        <header class="app-header">
            <div class="logo-container">
                <span class="logo-main">Espaço</span>
                <span class="logo-script">Mulher</span>
            </div>
            <div class="header-actions">
                <button onclick="import('./assets/js/core/auth.js').then(m => m.auth.signOut().then(() => window.location.reload()))" style="background:none; border:none; color:var(--primary-color);">
                    <span class="material-icons">logout</span>
                </button>
            </div>
        </header>

        <main class="main-content-scroll">
            ${contentHTML}
        </main>

        <nav class="bottom-nav">
            <div class="nav-container-inner" style="justify-content: space-evenly;">
                <div class="nav-indicator"></div>
                <a href="/" class="nav-item ${activeRoute === '/' ? 'active' : ''}" data-link><span class="material-icons">🏠</span></a>
                <a href="/treinos" class="nav-item ${activeRoute === '/treinos' ? 'active' : ''}" data-link><span class="material-icons">💪</span></a>
                
                <!-- NOVO ÍCONE DE DIETA -->
                <a href="/dieta" class="nav-item ${activeRoute === '/dieta' ? 'active' : ''}" data-link><span class="material-icons">restaurant</span></a>
                
                <a href="/fitgran" class="nav-item ${activeRoute === '/fitgran' ? 'active' : ''}" data-link><span class="material-icons" id="nav-icon-fitgran">📸</span></a>
                <a href="/fitflix" class="nav-item ${activeRoute === '/fitflix' ? 'active' : ''}" data-link><span class="material-icons">🎬</span></a>
                <a href="/perfil" class="nav-item ${activeRoute === '/perfil' ? 'active' : ''}" data-link><span class="material-icons">👤</span></a>
            </div>
        </nav>
    `},

    Auth: (contentHTML) => `
        <main class="auth-layout">
            ${contentHTML}
        </main>
    `,

    // Layout Administrativo
    Admin: (contentHTML, user) => {
        const role = user?.profile?.role || 'user';
        const isAdmin = role === 'admin';
        const showAgenda = isAdmin || role === 'reception';
        const showClients = isAdmin || role === 'reception';
        const showWorkouts = isAdmin || role === 'coach';
        const showDiet = isAdmin || role === 'nutri';

        // CSS Injections
        if (!document.getElementById('chat-css')) {
            const link = document.createElement('link');
            link.id = 'chat-css';
            link.rel = 'stylesheet';
            link.href = 'assets/css/modules/chat.css';
            document.head.appendChild(link);
        }
        if (!document.getElementById('nutrition-css')) {
            const link = document.createElement('link');
            link.id = 'nutrition-css';
            link.rel = 'stylesheet';
            link.href = 'assets/css/modules/nutrition.css';
            document.head.appendChild(link);
        }

        return `
        <div id="admin-layout" class="admin-container">
            <aside class="admin-sidebar">
                <div class="admin-brand">
                    <span class="logo-main">Gestão</span>
                    <span class="logo-script">Mulher</span>
                </div>
                
                <div class="admin-user-card">
                    <div class="admin-avatar">${user.email.charAt(0).toUpperCase()}</div>
                    <div class="admin-user-info">
                        <strong>${user.profile?.full_name?.split(' ')[0] || 'Profissional'}</strong>
                        <small>${role.toUpperCase()}</small>
                    </div>
                </div>

                <nav class="admin-nav">
                    <a href="/admin" class="admin-nav-item" data-link>
                        <span class="material-icons">dashboard</span> Dashboard
                    </a>
                    
                    ${showAgenda ? `
                    <a href="/admin/agenda" class="admin-nav-item" data-link>
                        <span class="material-icons">calendar_today</span> Agenda
                    </a>` : ''}

                    <a href="/admin/chat" class="admin-nav-item" data-link>
                        <span class="material-icons">chat</span> Mensagens
                    </a>

                    ${showClients ? `
                    <a href="/admin/clientes" class="admin-nav-item" data-link>
                        <span class="material-icons">people</span> Clientes
                    </a>` : ''}

                    ${showWorkouts ? `
                    <a href="/admin/treinos" class="admin-nav-item" data-link>
                        <span class="material-icons">fitness_center</span> Treinos
                    </a>` : ''}

                    ${showDiet ? `
                    <a href="/admin/nutricao" class="admin-nav-item" data-link>
                        <span class="material-icons">restaurant_menu</span> Nutrição
                    </a>` : ''}

                    <a href="/admin/fitflix" class="admin-nav-item" data-link>
                        <span class="material-icons">video_library</span> FitFlix
                    </a>
                </nav>

                <div class="admin-footer">
                    <button id="admin-logout" onclick="import('./assets/js/core/auth.js').then(m => m.auth.signOut().then(() => window.location.hash='/login'))">
                        <span class="material-icons">logout</span> Sair
                    </button>
                </div>
            </aside>

            <main class="admin-main" style="position:relative;">
                <header class="admin-header-mobile">
                    <span>Painel Administrativo</span>
                </header>
                <div id="admin-content-area" class="admin-content animate-fade-in">
                    ${contentHTML}
                </div>
                <div id="chat-dock-wrapper"></div>
            </main>
        </div>
        `;
    }
};