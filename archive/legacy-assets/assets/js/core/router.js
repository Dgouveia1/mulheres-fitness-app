import { auth } from './auth.js';
import { Layout } from './layout.js';
import { Toast } from './toast.js';

// Views Existentes
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
import { AdminWorkoutHandler } from '../modules/workouts/admin_handler.js';
import { StudentWorkoutHandler } from '../modules/workouts/student_handler.js';

// NOVAS VIEWS DE NUTRIÇÃO
import { AdminNutritionView } from '../modules/admin/nutrition_view.js';
import { AdminNutritionHandler } from '../modules/admin/nutrition_handler.js';
import { UserNutritionHandler } from '../modules/nutrition/user_handler.js';
import { PaymentView } from '../modules/auth/payment_view.js';
import { AsaasService } from './asaas.js';
import { supabase } from './supabase.js';

export const router = {
    routes: {
        // ... (Rotas existentes: login, register) ...
        '/login': { component: AuthView.Login, layout: 'auth', title: 'Login' },
        '/register': { component: AuthView.Register, layout: 'auth', title: 'Cadastro' },
        '/payment': { component: PaymentView.Template, layout: 'auth', title: 'Pagamento Pendente' }, // NOVA ROTA

        // Aluna
        '/': { component: DashboardView.Template, protected: true, role: 'user', title: 'Dashboard', navIndex: 0 },
        '/treinos': { component: () => '', protected: true, role: 'user', title: 'Meus Treinos', navIndex: 1 },
        '/dieta': { component: () => '', protected: true, role: 'user', title: 'Minha Dieta', navIndex: 2 }, // NOVA ROTA
        '/fitgran': { component: FitGranView.Main, protected: true, allow_all: true, title: 'Comunidade', navIndex: 3 },
        '/fitflix': { component: FitFlixView.List, protected: true, allow_all: true, title: 'FitFlix', navIndex: 4 },
        '/perfil': { component: ProfileView.Template, protected: true, role: 'user', title: 'Meu Perfil', navIndex: 5 },
        '/watch': { component: FitFlixView.Player, protected: true, allow_all: true, title: 'Assistir', layout: 'fullscreen' },

        // Admin
        '/admin': { component: AdminView.Dashboard, protected: true, layout: 'admin', title: 'Painel Gestão' },
        '/admin/agenda': { component: AdminView.Agenda, protected: true, layout: 'admin', title: 'Agenda' },
        '/admin/clientes': { component: AdminView.Clients, protected: true, layout: 'admin', title: 'Clientes' },
        '/admin/treinos': { component: AdminView.ManageWorkouts, protected: true, layout: 'admin', title: 'Gestão de Treinos' },

        // NOVA ROTA ADMIN
        '/admin/nutricao': { component: AdminNutritionView.Main, protected: true, layout: 'admin', title: 'Gestão Nutricional' },

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

    // ... (Mantenha attachAuthListener, checkRoleAndRedirect, getHash, navigate) ...
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
                const cpf = e.target.cpf.value; // Captura CPF
                const phone = e.target.phone.value; // Captura Telefone
                const btn = e.target.querySelector('button');

                if (!cpf || !phone) {
                    Toast.error('Por favor, preencha todos os campos!');
                    return;
                }

                btn.disabled = true;
                btn.innerText = 'Criando conta...';

                // Envia metadados adicionais para o Supabase
                const { data, error } = await auth.signUp(email, password, {
                    full_name: fullName,
                    cpf: cpf,
                    phone: phone,
                    role: 'user'
                });

                if (error) {
                    Toast.error('Erro: ' + error.message);
                    btn.disabled = false;
                    btn.innerText = 'Tentar Novamente';
                    return;
                }

                // 2. Realiza a Assinatura Automaticamente (EM STAND BY)
                btn.innerText = 'Redirecionando...';
                try {
                    // Login automático para ter o token
                    await auth.signIn(email, password);

                    // Lógica de pagamento em stand by
                    /*
                    const customerData = { full_name: fullName, email, cpf, phone };
                    const subResult = await AsaasService.subscribe(1, customerData);

                    if (subResult.success) {
                        localStorage.setItem('pending_payment', JSON.stringify({
                            subscriptionId: subResult.subscriptionId,
                            paymentData: subResult.paymentData,
                            pixQrCode: subResult.paymentData?.pixQrCode
                        }));

                        Toast.success('Conta criada! Finalize o pagamento.');
                        this.navigate('/payment');
                    } else {
                        throw new Error('Falha ao gerar assinatura.');
                    }
                    */

                    Toast.success('Conta criada com sucesso!');
                    this.navigate('/');

                } catch (subError) {
                    console.error(subError);
                    Toast.error('Erro ao finalizar o cadastro da conta. Faça login novamente.');
                    this.navigate('/login');
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

        // CHECK DE PAGAMENTO PARA ALUNAS
        if (!isProfessional) {
            // Verifica se tem assinatura ATIVA na tabela local
            // (Assumindo que temos acesso a tabela 'asaas_subscriptions' via supabase client em auth ou services)
            // Aqui vamos fazer uma verificação simples ou redirecionar.
            // O ideal é consultar a tabela asaas_subscriptions.

            // Exemplo simplificado: Se não for prof, manda para home, 
            // mas o handleRoute vai checar se está ativo.
        }

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

        // GUARD DE PAGAMENTO (EM STAND BY)
        if (user && !path.startsWith('/admin')) { // Ignora admins
            const role = user.profile?.role || 'user';

            // Se for usuário comum e não estiver na tela de pagamento ou login/register
            if (role === 'user' && path !== '/payment' && path !== '/login' && path !== '/register') {
                /*
                // 1. Busca o ID do cliente Asaas localmente
                const { data: customer } = await supabase
                    .from('asaas_customers')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!customer) {
                    // Se não tem cliente vinculado, com certeza não pagou
                    this.navigate('/payment');
                    return;
                }

                // 2. Checa status assinatura
                const { data: sub } = await supabase
                    .from('asaas_subscriptions')
                    .select('status')
                    .eq('customer_id', customer.id)
                    .eq('status', 'ACTIVE')
                    .maybeSingle();

                // Se não tem assinatura ativa, MANDA PAGAR
                if (!sub) {
                    this.navigate('/payment');
                    return;
                }
                */
            }
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

            if (path === '/admin/chat') {
                ChatHandler.initPageMode();
            }
            else if (path === '/admin/nutricao') AdminNutritionHandler.init(); // Init Nutrição
            else if (path === '/admin/treinos') AdminWorkoutHandler.init();
            else ChatHandler.initDockMode();

        } else if (route.layout === 'auth' || route.layout === 'fullscreen') {
            app.innerHTML = Layout.Auth(contentHTML);
            // INIT DA TELA DE PAGAMENTO
            if (path === '/payment') PaymentView.init(user);

        } else {
            const mainContent = document.querySelector('.main-content-scroll');
            if (mainContent && document.querySelector('.bottom-nav')) {
                if (path !== '/treinos' && path !== '/dieta') mainContent.innerHTML = contentHTML;

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

        const fitGranIcon = document.getElementById('nav-icon-fitgran');
        if (fitGranIcon) {
            if (currentPath === '/fitgran') fitGranIcon.innerText = '➕';
            else fitGranIcon.innerText = '📸';
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
            if (path === '/admin/nutricao') AdminNutritionHandler.init(); // Garante init
        } else {
            if (path === '/') DashboardHandler.load();
            if (path === '/fitflix') FitFlixHandler.loadList();
            if (path === '/watch') FitFlixHandler.loadPlayer();
            if (path === '/treinos') StudentWorkoutHandler.load();
            if (path === '/dieta') UserNutritionHandler.load(); // Script de carregamento da dieta
            if (path === '/fitgran') FitGranHandler.load();
            if (path === '/perfil') ProfileHandler.load();
        }
    }
};