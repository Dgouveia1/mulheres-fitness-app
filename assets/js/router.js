// assets/js/router.js - Gerenciamento de Rotas e Navegação Animada
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
        window.addEventListener('popstate', () => this.handleRoute(window.location.pathname));

        document.body.addEventListener('click', e => {
            const link = e.target.closest('[data-link]');
            if (link) {
                e.preventDefault();
                const href = link.getAttribute('href');
                
                // --- LÓGICA DO BOTÃO CENTRAL DINÂMICO ---
                // Se já estamos no FitGran e clicamos no link do FitGran de novo (botão central)
                if (href === '/fitgran' && window.location.pathname === '/fitgran') {
                    // Dispara evento para abrir a câmera (ouvido no pages.js)
                    window.dispatchEvent(new CustomEvent('fitgran-open-camera'));
                    return; // Não navega, apenas executa a ação
                }

                this.navigate(href);
            }
        });

        this.attachGlobalListeners();
        await this.handleRoute(window.location.pathname);
        
        setTimeout(() => this.updateNavIndicator(window.location.pathname), 100);
    },

    navigate(path) {
        window.history.pushState({}, '', path);
        const cleanPath = path.split('?')[0];
        this.handleRoute(cleanPath);
    },

    async handleRoute(path) {
        const cleanPath = window.location.pathname;
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
            
            // --- TRANSFORMAÇÃO DO ÍCONE FITGRAN ---
            if (href === '/fitgran') {
                const iconSpan = item.querySelector('span');
                if (path === '/fitgran') {
                    // Se estamos no FitGran, vira botão de ADICIONAR (+)
                    iconSpan.innerText = '➕'; 
                    iconSpan.style.filter = 'brightness(2)'; // Destaca mais
                    iconSpan.style.transform = 'scale(1.2)';
                } else {
                    // Se estamos fora, volta a ser CÂMERA/LOGO 📸
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
        document.getElementById('app').addEventListener('submit', async (e) => {
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