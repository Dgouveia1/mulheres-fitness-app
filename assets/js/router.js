// assets/js/router.js - Atualizado para Hash Routing (compatível com GitHub Pages)
import { auth } from './auth.js';
import { Pages, PageHandlers } from './pages.js';
import { Layout } from './layout.js';

export const router = {
    routes: {
        '/': { component: Pages.Dashboard, protected: true, title: 'Dashboard' },
        '/login': { component: Pages.Login, layout: 'auth', title: 'Login' },
        '/register': { component: Pages.Register, layout: 'auth', title: 'Cadastro' },
        '/fitflix': { component: Pages.FitFlix, protected: true, title: 'FitFlix' },
        '/watch': { component: Pages.Player, protected: true, title: 'Assistir', layout: 'fullscreen' },
        '/fitgran': { component: Pages.FitGran, protected: true, title: 'FitGran' },
        '/treinos': { component: Pages.Workouts, protected: true, title: 'Treinos' },
        '/receitas': { component: Pages.Recipes, protected: true, title: 'Receitas' },
        '/perfil': { component: Pages.Profile, protected: true, title: 'Perfil' },
        '/admin': { component: Pages.AdminDashboard, protected: true, role: 'admin', title: 'Admin' },
    },

    async init() {
        // Ouve mudanças na #hash da URL
        window.addEventListener('hashchange', () => this.handleRoute());

        document.body.addEventListener('click', e => {
            const link = e.target.closest('[data-link]');
            if (link) {
                e.preventDefault();
                const href = link.getAttribute('href');
                
                // LÓGICA DO BOTÃO CENTRAL DINÂMICO
                // Compara o hash atual com o destino
                const currentHash = this.getHash();
                if (href === '/fitgran' && currentHash === '/fitgran') {
                    window.dispatchEvent(new CustomEvent('fitgran-open-camera'));
                    return; 
                }

                this.navigate(href);
            }
        });

        this.attachGlobalListeners();
        // Carrega a rota inicial baseada no Hash atual
        await this.handleRoute();
        
        // Atualiza indicador visual
        setTimeout(() => this.updateNavIndicator(this.getHash()), 100);
    },

    // Função auxiliar para pegar o caminho limpo da hash (ex: #/login -> /login)
    getHash() {
        return window.location.hash.slice(1) || '/';
    },

    navigate(path) {
        // Muda o hash, o que dispara o evento 'hashchange' automaticamente
        window.location.hash = path;
    },

    async handleRoute() {
        const path = this.getHash();
        // Remove query params para encontrar a rota
        const cleanPath = path.split('?')[0]; 
        let route = this.routes[cleanPath] || this.routes['/'];

        const { data } = await auth.getSession();
        const user = data.session?.user;

        if (route.protected && !user) {
            this.navigate('/login');
            return;
        }

        if (cleanPath === '/login' && user) {
            this.navigate('/');
            return;
        }

        const isMainLayout = !route.layout;
        const app = document.getElementById('app');
        const existingNav = document.querySelector('.bottom-nav');
        
        if (existingNav && isMainLayout) {
            const contentContainer = document.querySelector('.main-content-scroll');
            if (contentContainer) {
                contentContainer.innerHTML = route.component(user);
                window.scrollTo(0, 0);
                document.title = `${route.title} - Espaço Mulher`;
                this.updateNavIndicator(cleanPath);
            } else {
                const contentHTML = route.component(user);
                app.innerHTML = Layout.Main(contentHTML, cleanPath);
                setTimeout(() => this.updateNavIndicator(cleanPath), 50);
            }
        } else {
            const contentHTML = route.component(user);
            if (route.layout === 'auth') {
                app.innerHTML = Layout.Auth(contentHTML);
            } else if (route.layout === 'fullscreen') {
                app.innerHTML = Layout.Main(contentHTML, cleanPath); 
            } else {
                app.innerHTML = Layout.Main(contentHTML, cleanPath);
            }

            if (isMainLayout) {
                setTimeout(() => this.updateNavIndicator(cleanPath), 50);
            }
        }

        this.executePageScripts(cleanPath);
    },

    updateNavIndicator(path) {
        const navItems = document.querySelectorAll('.nav-item');
        const indicator = document.querySelector('.nav-indicator');
        const navContainer = document.querySelector('.bottom-nav');

        if (!indicator || !navContainer) return;

        navItems.forEach(item => {
            const href = item.getAttribute('href');
            
            // TRANSFORMAÇÃO DO ÍCONE FITGRAN
            if (href === '/fitgran') {
                const iconSpan = item.querySelector('span');
                if (path === '/fitgran') {
                    iconSpan.innerText = '➕'; 
                    iconSpan.style.filter = 'brightness(2)';
                    iconSpan.style.transform = 'scale(1.2)';
                } else {
                    iconSpan.innerText = '📸';
                    iconSpan.style.filter = '';
                    iconSpan.style.transform = '';
                }
            }

            if (href === path) {
                item.classList.add('active');
                const itemRect = item.getBoundingClientRect();
                const navRect = navContainer.getBoundingClientRect();
                const leftPosition = (itemRect.left - navRect.left) + (itemRect.width / 2) - 30;
                indicator.style.transform = `translateX(${leftPosition}px)`;
            } else {
                item.classList.remove('active');
            }
        });
    },

    attachGlobalListeners() {
        // Previne múltiplos listeners se o init rodar de novo (opcional, mas boa prática)
        const app = document.getElementById('app');
        // Remove listener antigo clonando o elemento (hack rápido para limpar event listeners anônimos)
        // Mas como nosso app é simples, vamos apenas adicionar uma flag ou manter simples
        
        // Listener de formulários
        app.addEventListener('submit', async (e) => {
            if (e.target.id === 'login-form') {
                e.preventDefault();
                const email = e.target.email.value;
                const password = e.target.password.value;
                const { error } = await auth.signIn(email, password);
                if (error) alert('Erro: ' + error.message);
                else this.navigate('/');
            } else if (e.target.id === 'register-form') {
                e.preventDefault();
                const email = e.target.email.value;
                const password = e.target.password.value;
                const fullName = e.target.full_name.value;
                const { error } = await auth.signUp(email, password, { full_name: fullName });
                if (error) alert('Erro: ' + error.message);
                else {
                    alert('Cadastro realizado!');
                    this.navigate('/login');
                }
            }
        });
    },

    executePageScripts(path) {
        switch (path) {
            case '/': PageHandlers.loadDashboard(); break;
            case '/fitflix': PageHandlers.loadFitFlix(); break;
            case '/watch': PageHandlers.loadPlayer(); break;
            case '/fitgran': PageHandlers.loadFitGran(); break;
            case '/treinos': PageHandlers.loadWorkouts(); break;
            case '/perfil': PageHandlers.loadProfile(); break;
        }
    }
};