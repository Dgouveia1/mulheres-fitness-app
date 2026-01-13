import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';
import { ChatView } from './view.js';
import { supabase } from '../../core/supabase.js';
import { Toast } from '../../core/toast.js';

export const ChatHandler = {
    currentUserId: null,
    contacts: [], 
    activeChatId: null,
    
    // Configurações
    dockOpen: false,
    openWindows: new Set(), 
    currentTab: 'all', // 'all', 'staff', 'clients'
    MESSAGES_LIMIT: 20,

    async initCommon() {
        // 1. Obtém sessão
        const { data } = await auth.getSession();
        if (!data.session) return false;
        
        let user = data.session.user;
        this.currentUserId = user.id;
        window.ChatHandler = this; 

        // 2. GARANTIA DE PERFIL: Verifica se o profile existe, se não, busca forçadamente
        // Isso corrige o bug onde o chat iniciava antes do perfil ser carregado
        if (!user.profile) {
            const { data: profile } = await auth.getProfile();
            if (profile) {
                user.profile = profile;
            }
        }
        
        // 3. Define a role com fallback seguro
        const role = user.profile?.role || 'user';
        
        // 4. Carrega contatos passando a role confirmada
        await this.loadContacts(role);
        
        this.setupRealtime();
        return true;
    },

    async initPageMode() {
        if (!(await this.initCommon())) return;
        
        // Esconde o dock se estiver na página dedicada
        const dock = document.getElementById('chat-dock-container');
        if(dock) dock.style.display = 'none';
        
        this.renderContactsList();
    },

    async initDockMode() {
        if (!(await this.initCommon())) return;
        
        const wrapper = document.getElementById('chat-dock-wrapper');
        // Verifica se já existe para não duplicar
        if (wrapper && !document.getElementById('chat-dock-container')) {
            wrapper.innerHTML = ChatView.Container();
            this.renderDockList();
        } else {
             // Se já existe, garante que está visível
             const dock = document.getElementById('chat-dock-container');
             if(dock) dock.style.display = 'block';
             // Re-renderiza a lista para garantir atualização
             this.renderDockList();
        }
    },

    async loadContacts(userRole) {
        // Busca todos os usuários do banco
        const allUsers = await Services.getChatContacts();
        
        // Filtra para remover o próprio usuário da lista
        this.contacts = allUsers.filter(u => u.id !== this.currentUserId);

        // --- INJETAR GRUPO DA EQUIPE ---
        // Apenas se o usuário logado for Staff (Admin, Reception, Coach, Nutri)
const staffRoles = ['admin', 'reception', 'coach', 'nutri', 'operacional_user'];        
        if (staffRoles.includes(userRole)) {
            // Verifica se já não foi adicionado para evitar duplicação
            const hasGroup = this.contacts.find(c => c.id === 'STAFF_GROUP');
            
            if (!hasGroup) {
                this.contacts.unshift({
                    id: 'STAFF_GROUP',
                    full_name: '📢 Chat da Equipe',
                    role: 'system', // Papel especial para identificar visualmente
                    avatar_url: null,
                    is_group: true
                });
            }
        }
    },

    setTab(tabName, btnElement) {
        this.currentTab = tabName;
        const tabs = document.querySelectorAll('.chat-tab-btn');
        tabs.forEach(t => t.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
        this.renderContactsList();
    },

    // --- DOCK LOGIC ---
    toggleDock() {
        const dock = document.getElementById('chat-dock');
        const chevron = document.getElementById('dock-chevron');
        if (!dock) return;

        if (this.dockOpen) {
            dock.classList.add('minimized');
            dock.classList.remove('expanded');
            if(chevron) chevron.innerText = 'expand_less';
        } else {
            dock.classList.remove('minimized');
            dock.classList.add('expanded');
            if(chevron) chevron.innerText = 'expand_more';
            
            const dot = document.getElementById('dock-notification-dot');
            if(dot) dot.classList.remove('active');
        }
        this.dockOpen = !this.dockOpen;
    },

    renderDockList() {
        const list = document.getElementById('chat-dock-users');
        if (!list) return;

        // No dock, remove alunas ('user'), mas mantem 'system' (Grupo) e Staff ('admin', etc)
        const staffOnly = this.contacts.filter(u => {
            const r = u.role || 'user';
            return r !== 'user';
        });

        if (staffOnly.length === 0) {
            list.innerHTML = '<div style="padding:15px; color:#999; text-align:center; font-size:0.85rem;">Nenhum membro da equipe disponível.</div>';
            return;
        }

        list.innerHTML = staffOnly.map(u => ChatView.UserItem(u)).join('');
    },

    openDockWindow(userId, userName) {
        if (this.openWindows.has(userId)) return;
        
        // Limite de 3 janelas abertas
        if (this.openWindows.size >= 3) {
            const first = this.openWindows.values().next().value;
            this.closeWindow(first);
        }

        const container = document.getElementById('chat-windows-container');
        if(!container) return;

        container.insertAdjacentHTML('beforeend', ChatView.ChatWindow(userId, userName));
        this.openWindows.add(userId);
        this.loadDockMessages(userId);
    },

    closeWindow(userId) {
        const win = document.getElementById(`window-${userId}`);
        if (win) win.remove();
        this.openWindows.delete(userId);
    },

    minimizeWindow(userId) {
        const win = document.getElementById(`window-${userId}`);
        if (win) win.classList.toggle('minimized');
    },

    async loadDockMessages(userId) {
        const container = document.getElementById(`msgs-${userId}`);
        if (!container) return;

        // Se userId for 'STAFF_GROUP', o service tratará de buscar recipient_id=null
        const messages = await Services.getChatMessages(this.currentUserId, userId, 20);
        
        if (messages && messages.length > 0) {
            container.innerHTML = messages.map(msg => 
                ChatView.MessageBubble(msg, msg.sender_id === this.currentUserId)
            ).join('');
        } else {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#ccc; font-size:0.8rem;">Nenhuma mensagem ainda.</div>';
        }
        
        container.scrollTop = container.scrollHeight;
    },

    async sendDockMessage(e, targetId) {
        e.preventDefault();
        const form = e.target;
        const input = form.message;
        const text = input.value.trim();
        if (!text) return;
        
        input.value = '';

        const container = document.getElementById(`msgs-${targetId}`);
        const tempMsg = { 
            content: text, 
            created_at: new Date().toISOString(), 
            sender_id: this.currentUserId 
            // sender_name não é necessário para mensagens enviadas por mim no dock
        };
        
        if(container) {
            container.insertAdjacentHTML('beforeend', ChatView.MessageBubble(tempMsg, true));
            container.scrollTop = container.scrollHeight;
        }

        await Services.sendMessage(this.currentUserId, targetId, text);
    },

    // --- PAGE MODE ---
    renderContactsList(filterText = '') {
        const container = document.getElementById('chat-contacts-list');
        if (!container) return;

        let filtered = this.contacts;

        // Lógica de Abas
        if (this.currentTab === 'staff') {
            // Mantém Grupo e Profissionais (remove apenas 'user')
            filtered = filtered.filter(u => u.role !== 'user');
        } else if (this.currentTab === 'clients') {
            filtered = filtered.filter(u => u.role === 'user');
        }

        if (filterText) {
            const term = filterText.toLowerCase();
            filtered = filtered.filter(u => u.full_name.toLowerCase().includes(term));
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">Nenhum contato encontrado.</div>';
            return;
        }

        container.innerHTML = filtered.map(u => {
            return ChatView.ContactItem(u, '', u.id === this.activeChatId);
        }).join('');
    },

    filterContacts(text) {
        this.renderContactsList(text);
    },

    async loadConversation(targetId) {
        this.activeChatId = targetId;
        this.renderContactsList(); 
        
        const pageContainer = document.querySelector('.chat-page-container');
        if(pageContainer) pageContainer.classList.add('chat-active'); 

        const user = this.contacts.find(u => u.id === targetId);
        const mainArea = document.getElementById('chat-main-area');
        
        if (user) {
            mainArea.innerHTML = ChatView.MainChatArea(user);
            this.fetchAndRenderPageMessages(true);
        }
    },

    async fetchAndRenderPageMessages(isInitial) {
        const container = document.getElementById('active-chat-messages');
        if(!container) return;
        if(isInitial) container.innerHTML = '<div class="loader-spinner" style="margin:20px auto;"></div>';

        const messages = await Services.getChatMessages(this.currentUserId, this.activeChatId, 50);
        
        const html = messages.map(msg => 
            ChatView.PageMessageBubble(msg, msg.sender_id === this.currentUserId)
        ).join('');

        container.innerHTML = html || '<div style="text-align:center;color:#999;margin-top:20px;">Nenhuma mensagem.</div>';
        container.scrollTop = container.scrollHeight;
    },

    async sendMessagePage(e, targetId) {
        e.preventDefault();
        const input = document.getElementById('chat-input-page');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        input.focus();

        const container = document.getElementById('active-chat-messages');
        const tempMsg = { content: text, created_at: new Date().toISOString(), sender_id: this.currentUserId };
        
        if(container) {
            container.insertAdjacentHTML('beforeend', ChatView.PageMessageBubble(tempMsg, true));
            container.scrollTop = container.scrollHeight;
        }

        await Services.sendMessage(this.currentUserId, targetId, text);
    },
    
    backToMobileList() {
        const container = document.querySelector('.chat-page-container');
        if(container) container.classList.remove('chat-active');
        this.activeChatId = null;
    },

    handleScroll(element) {
        // Implementar paginação futura aqui se necessário
    },
    
    loadMoreMessages() {
        // Implementar lógica de carregar mais mensagens
    },

    // --- REALTIME UPDATES ---
    setupRealtime() {
        // Safe check to avoid websocket errors during reload
        try {
             supabase.removeAllChannels();
        } catch(e) { console.log('Socket cleanup ignored'); }

        supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                this.handleNewMessage(payload.new);
            })
            .subscribe((status) => {
                if(status === 'SUBSCRIBED') console.log('Chat connected');
            });
    },

    handleNewMessage(msg) {
        if (msg.sender_id === this.currentUserId) return;

        // Determinar se a mensagem é para o grupo (recipient_id é NULL)
        const isGroupMsg = (msg.recipient_id === null);
        
        // Se for grupo, fingimos que o "remetente" é o objeto STAFF_GROUP para fins de UI
        const logicalSenderId = isGroupMsg ? 'STAFF_GROUP' : msg.sender_id;

        // 1. Atualizar UI da Página
        if (this.activeChatId === logicalSenderId) {
            const container = document.getElementById('active-chat-messages');
            if (container) {
                // Se for grupo, é bom mostrar quem mandou
                const content = isGroupMsg ? `<strong>${msg.sender_name || 'Alguém'}:</strong> ${msg.content}` : msg.content;
                // Ajustamos o objeto msg para o visualizador
                const bubble = ChatView.PageMessageBubble({ ...msg, content }, false);
                container.insertAdjacentHTML('beforeend', bubble);
                container.scrollTop = container.scrollHeight;
            }
        }

        // 2. Atualizar UI do Dock
        if (this.openWindows.has(logicalSenderId)) {
            const dockContainer = document.getElementById(`msgs-${logicalSenderId}`);
            if (dockContainer) {
                 const content = isGroupMsg ? `<strong>${msg.sender_name || 'Alguém'}:</strong> ${msg.content}` : msg.content;
                 // Cria bolha customizada diretamente aqui para reaproveitar lógica
                 const bubble = `<div class="chat-message-bubble received">${content}<div class="chat-time">Agora</div></div>`;
                dockContainer.insertAdjacentHTML('beforeend', bubble);
                dockContainer.scrollTop = dockContainer.scrollHeight;
            }
        } else {
            // Notificação visual se a janela não estiver aberta ou dock fechado
            const notifDot = document.getElementById('dock-notification-dot');
            if (notifDot) {
                notifDot.classList.add('active');
                if(!this.dockOpen) {
                    const senderObj = this.contacts.find(c=>c.id === msg.sender_id);
                    const senderName = isGroupMsg ? "Equipe" : (senderObj?.full_name || 'Novo contato');
                    Toast.info(`Nova mensagem de ${senderName}`);
                }
            }
        }
        
        // Efeito sonoro suave
        const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
        audio.play().catch(e=>{});
    }
};