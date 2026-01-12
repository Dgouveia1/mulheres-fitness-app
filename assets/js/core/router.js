import { auth } from './auth.js';
import { Layout } from './layout.js';
import { Toast } from './toast.js';

// Modules Views
import { AuthView } from '../modules/auth/view.js';
import { DashboardView } from '../modules/dashboard/view.js';
import { DashboardHandler } from '../modules/dashboard/handler.js';
import { FitGranView } from '../modules/fitgran/view.js';
import { FitGranHandler } from '../modules/fitgran/handler.js';
import { FitFlixView } from '../modules/fitflix/view.js';
import { FitFlixHandler } from '../modules/fitflix/handler.js';
import { ProfileView } from '../modules/profile/view.js';
import { ProfileHandler } from '../modules/profile/handler.js';
import { AdminView } from '../modules/admin/view.js';
import { AdminHandlers } from '../modules/admin/handler.js';
import { ChatHandler } from '../modules/chat/handler.js';

// WORKOUTS - Separados por Role
import { AdminWorkoutHandler } from '../modules/workouts/admin_handler.js';
import { StudentWorkoutHandler } from '../modules/workouts/student_handler.js';
import { StudentWorkoutView } from '../modules/workouts/view.js'; // Apenas para placeholder na config

export const router = {
    routes: {
        // Rotas Públicas
        '/login': { component: AuthView.Login, layout: 'auth', title: 'Login' },
        '/register': { component: AuthView.Register, layout: 'auth', title: 'Cadastro' },

        // Rotas da Aluna (User)
        '/': { component: DashboardView.Template, protected: true, role: 'user', title: 'Dashboard', navIndex: 0 },
        
        // ROTA DE TREINOS AGORA ATIVA E CORRETA
        // Nota: component aqui é uma função vazia pois o StudentWorkoutHandler.load() que injeta o HTML.
        // Mas para manter compatibilidade, passamos uma função que retorna string vazia.
        '/treinos': { component: () => '', protected: true, role: 'user', title: 'Meus Treinos', navIndex: 1 },
        
        '/fitgran': { component: FitGranView.Main, protected: true, allow_all: true, title: 'Comunidade', navIndex: 2 },
        '/fitflix': { component: FitFlixView.List, protected: true, allow_all: true, title: 'FitFlix', navIndex: 3 },
        '/perfil': { component: ProfileView.Template, protected: true, role: 'user', title: 'Meu Perfil', navIndex: 4 },

        // Player (Sem menu)
        '/watch': { component: FitFlixView.Player, protected: true, allow_all: true, title: 'Assistir', layout: 'fullscreen' },

        // Rotas Administrativas
        '/admin': { component: AdminView.Dashboard, protected: true, layout: 'admin', title: 'Painel Gestão' },
        '/admin/agenda': { component: AdminView.Agenda, protected: true, layout: 'admin', title: 'Agenda' },
        '/admin/clientes': { component: AdminView.Clients, protected: true, layout: 'admin', title: 'Clientes' },
        '/admin/treinos': { component: AdminView.ManageWorkouts, protected: true, layout: 'admin', title: 'Gestão de Treinos' },
        '/admin/nutricao': { component: AdminView.ManageDiet, protected: true, layout: 'admin', title: 'Nutrição' },
        '/admin/chat': { component: AdminView.Chat, protected: true, layout: 'admin', title: 'Mensagens' },
        '/admin/fitflix': { component: AdminView.ManageFitFlix, protected: true, layout: 'admin', title: 'Gestão de Vídeos' },
    },

    async init() {
        window.addEventListener('hashchange', () => this.handleRoute());

        document.body.addEventListener('click', e => {
            const link = e.target.closest('[data-link]');
            if (link) {
                e.preventDefault();
                const path = link.getAttribute('href');
                if (path === '/fitgran' && this.getHash() === '/fitgran') {
                    FitGranHandler.openCamera();
                    return;
                }
                this.navigate(path);
            }
        });

        this.attachAuthListener();
        await this.handleRoute();
        window.addEventListener('resize', () => this.updateNavIndicator());
        this.updateNavIndicator();
    },

    attachAuthListener() {
        const app = document.getElementById('app');
        app.addEventListener('submit', async (e) => {
            if (e.target.id === 'login-form') {
                e.preventDefault();
                const email = e.target.email.value;
                const password = e.target.password.value;
                const btn = e.target.querySelector('button');

                btn.disabled = true;
                btn.innerText = 'Entrando...';

                const { data, error } = await auth.signIn(email, password);

                if (error) {
                    Toast.error('Erro: ' + error.message);
                    btn.disabled = false;
                    btn.innerText = 'Entrar';
                } else {
                    await this.checkRoleAndRedirect(data.user);
                }
            } else if (e.target.id === 'register-form') {
                e.preventDefault();
                const fullName = e.target.full_name.value;
                const email = e.target.email.value;
                const password = e.target.password.value;
                const btn = e.target.querySelector('button');

                btn.disabled = true;
                btn.innerText = 'Cadastrando...';

                const { data, error } = await auth.signUp(email, password, { full_name: fullName, role: 'user' });

                if (error) {
                    Toast.error('Erro: ' + error.message);
                    btn.disabled = false;
                    btn.innerText = 'Começar Agora';
                } else {
                    Toast.success('Cadastro realizado com sucesso!');
                    this.navigate('/');
                }
            }
        });
    },

    async checkRoleAndRedirect(user) {
        const { data: profile, error } = await auth.getProfile();

        if (error || !profile) {
            console.error('Erro ao buscar perfil:', error);
            Toast.error(`Perfil de usuário não encontrado! ID: ${user.id}`);
            this.navigate('/');
            return;
        }

        const role = profile.role || 'user';
        const isProfessional = ['admin', 'reception', 'coach', 'nutri'].includes(role);

        if (window.location.hash === '#/login' || window.location.hash === '') {
            this.navigate(isProfessional ? '/admin' : '/');
        }
    },

    getHash() {
        const hash = window.location.hash.slice(1);
        if (!hash) return '/';
        return hash.split('?')[0];
    },

    navigate(path) {
        window.location.hash = path;
    },

    async handleRoute() {
        const path = this.getHash();
        let route = this.routes[path];

        if (!route) {
            if (path.startsWith('/admin')) route = this.routes['/admin'];
            else route = this.routes['/'];
        }

        const { data } = await auth.getSession();
        const user = data.session?.user;

        if (route.protected && !user) {
            this.navigate('/login');
            return;
        }

        if (user && route.layout === 'admin') {
            const role = user.profile?.role || 'user';
            const allowedRoles = ['admin', 'reception', 'coach', 'nutri'];
            if (!allowedRoles.includes(role)) {
                Toast.error('Acesso não autorizado.');
                this.navigate('/');
                return;
            }
        }

        const app = document.getElementById('app');
        const contentHTML = route.component(user);

        if (route.layout === 'admin') {
            if (!document.getElementById('admin-layout')) {
                app.innerHTML = Layout.Admin(contentHTML, user);
            } else {
                const contentArea = document.getElementById('admin-content-area');
                if (contentArea) contentArea.innerHTML = contentHTML;
            }
            this.updateAdminMenu(path);
            
            if (path === '/admin/chat') ChatHandler.initPageMode(); 
            else ChatHandler.initDockMode();

        } else if (route.layout === 'auth' || route.layout === 'fullscreen') {
            app.innerHTML = Layout.Auth(contentHTML);
        } else {
            // Layout Principal (User App)
            const mainContent = document.querySelector('.main-content-scroll');
            if (mainContent && document.querySelector('.bottom-nav')) {
                if (path !== '/treinos') mainContent.innerHTML = contentHTML; // Evita sobrescrever se for treinos (handler cuida disso)
                
                document.querySelectorAll('.nav-item').forEach(el => {
                    el.classList.toggle('active', el.getAttribute('href') === path);
                });
            } else {
                app.innerHTML = Layout.Main(contentHTML, path);
            }
            setTimeout(() => this.updateNavIndicator(path), 50);
        }

        document.title = `${route.title} - Espaço Mulher`;
        this.executeScripts(path, user);
    },

    updateNavIndicator(path) {
        const currentPath = path || this.getHash();
        const activeLink = document.querySelector(`.nav-item[href="${currentPath}"]`);
        const indicator = document.querySelector('.nav-indicator');
        const navContainer = document.querySelector('.nav-container-inner');

        if (activeLink && indicator && navContainer) {
            const linkRect = activeLink.getBoundingClientRect();
            const containerRect = navContainer.getBoundingClientRect();
            const leftPosition = (linkRect.left - containerRect.left) + (linkRect.width / 2) - (60 / 2);
            indicator.style.left = `${leftPosition}px`;
        }
        
        // Atualiza ícone do FitGran
        const fitGranIcon = document.getElementById('nav-icon-fitgran');
        if (fitGranIcon) {
            if (currentPath === '/fitgran') {
                fitGranIcon.innerText = '➕'; 
            } else {
                fitGranIcon.innerText = '📸'; 
            }
        }
    },

    updateAdminMenu(path) {
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            if (item.getAttribute('href') === path) item.classList.add('active');
            else item.classList.remove('active');
        });
    },

    executeScripts(path, user) {
        if (path.startsWith('/admin')) {
            AdminHandlers.init(path, user);
        } else {
            if (path === '/') DashboardHandler.load();
            if (path === '/fitflix') FitFlixHandler.loadList();
            if (path === '/watch') FitFlixHandler.loadPlayer();
            
            // AGORA SIM: Rota de treinos carregada corretamente
            if (path === '/treinos') StudentWorkoutHandler.load();
            
            if (path === '/fitgran') FitGranHandler.load();
            if (path === '/perfil') ProfileHandler.load();
        }
    }
};