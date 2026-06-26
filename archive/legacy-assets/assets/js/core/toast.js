// assets/js/toast.js - Sistema de Notificações (Toocast)

export const Toast = {
    container: null,

    init() {
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    },

    show(message, type = 'info', duration = 4000) {
        if (!this.container) this.init();

        // Ícones e Títulos baseados no tipo
        const config = {
            success: { icon: '✅', title: 'Sucesso' },
            error: { icon: '❌', title: 'Erro' },
            info: { icon: 'ℹ️', title: 'Informação' },
            warning: { icon: '⚠️', title: 'Atenção' }
        };

        const { icon, title } = config[type] || config.info;

        // Cria o elemento HTML
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <div class="toast-progress">
                <div class="toast-progress-bar" style="animation-duration: ${duration}ms"></div>
            </div>
        `;

        // Adiciona ao container
        this.container.appendChild(toast);

        // Remove após o tempo
        setTimeout(() => {
            toast.classList.add('hiding');
            toast.addEventListener('animationend', () => {
                if(toast.parentElement) toast.remove();
            });
        }, duration);
    },

    // Atalhos rápidos
    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    info(msg) { this.show(msg, 'info'); },
    warning(msg) { this.show(msg, 'warning'); }
};