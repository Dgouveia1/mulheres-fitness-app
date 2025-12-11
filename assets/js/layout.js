// layout.js - Componentes de Layout Atualizados
// Agora com o indicador de navegação animado

export const Layout = {
    // Layout principal com navegação inferior (Mobile First)
    Main: (contentHTML, activeRoute) => `
        <header class="app-header">
            <div class="logo-container">
                <span class="logo-main">Espaço</span>
                <span class="logo-script">Mulher</span>
            </div>
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary-color); opacity: 0.1;"></div>
        </header>

        <main class="main-content-scroll">
            ${contentHTML}
        </main>

        <nav class="bottom-nav">
            <!-- A Bolha Mágica que vai andar -->
            <div class="nav-indicator"></div>

            <a href="/" class="nav-item" data-link>
                <span class="material-icons">🏠</span>
            </a>
            
            <a href="/treinos" class="nav-item" data-link>
                <span class="material-icons">💪</span>
            </a>

            <!-- O FitGran agora é um item normal na lista, a bolha que o destaca -->
            <a href="/fitgran" class="nav-item" data-link>
                <span class="material-icons">📸</span>
            </a>

            <a href="/fitflix" class="nav-item" data-link>
                <span class="material-icons">🎬</span>
            </a>

            <a href="/perfil" class="nav-item" data-link>
                <span class="material-icons">👤</span>
            </a>
        </nav>
    `,

    // Layout simples para autenticação
    Auth: (contentHTML) => `
        <main class="auth-layout">
            ${contentHTML}
        </main>
    `
};