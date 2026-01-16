import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';
import { ChatView } from './view.js';
import { supabase } from '../../core/supabase.js';
import { Toast } from '../../core/toast.js';

export const ChatHandler = {
    currentUserId: null,
    contacts: [], 
    activeChatId: null,
    
    // Configurações de Estado
    dockOpen: false,
    openWindows: new Set(), 
    currentTab: 'all', // 'all', 'staff', 'clients'
    MESSAGES_LIMIT: 50,
    realtimeChannel: null,

    // --- INICIALIZAÇÃO ---

    async initCommon() {
        try {
            // 1. Obtém sessão atual
            const { data } = await auth.getSession();
            if (!data.session) {
                console.warn('ChatHandler: Sem sessão ativa.');
                return false;
            }
            
            let user = data.session.user;
            this.currentUserId = user.id;
            
            // Exporta para escopo global para acesso via HTML (onclick)
            window.ChatHandler = this; 

            // 2. Garante o perfil
            if (!user.profile) {
                const { data: profile } = await auth.getProfile();
                if (profile) {
                    user.profile = profile;
                }
            }
            
            const role = user.profile?.role || 'user';
            
            // 3. Carrega contatos
            await this.loadContacts(role);
            
            // 4. Inicia Realtime (uma única vez)
            this.setupRealtime();
            
            return true;
        } catch (error) {
            console.error('ChatHandler: Erro na inicialização', error);
            return false;
        }
    },

    async initPageMode() {
        const ready = await this.initCommon();
        if (!ready) return;
        
        // Esconde o dock se estiver na página dedicada para não duplicar
        const dock = document.getElementById('chat-dock-container');
        if(dock) dock.style.display = 'none';
        
        this.renderContactsList();
    },

    async initDockMode() {
        const ready = await this.initCommon();
        if (!ready) return;
        
        const wrapper = document.getElementById('chat-dock-wrapper');
        
        // Injeta o container do Dock se não existir
        if (wrapper && !document.getElementById('chat-dock-container')) {
            wrapper.innerHTML = ChatView.Container();
        } 
        
        // Garante visibilidade
        const dock = document.getElementById('chat-dock-container');
        if(dock) {
            dock.style.display = 'block';
            this.renderDockList();
        }
    },

    // --- GERENCIAMENTO DE CONTATOS ---

    async loadContacts(userRole) {
        // Busca todos os usuários
        const allUsers = await Services.getChatContacts();
        
        // Filtra para remover o próprio usuário da lista
        this.contacts = allUsers.filter(u => u.id !== this.currentUserId);

        // Adiciona Grupo da Equipe se for Staff
        const staffRoles = ['admin', 'reception', 'coach', 'nutri', 'operacional_user'];        
        if (staffRoles.includes(userRole)) {
            const hasGroup = this.contacts.find(c => c.id === 'STAFF_GROUP');
            if (!hasGroup) {
                this.contacts.unshift({
                    id: 'STAFF_GROUP',
                    full_name: '📢 Chat da Equipe',
                    role: 'system',
                    avatar_url: null,
                    is_group: true
                });
            }
        }
    },

    setTab(tabName, btnElement) {
        this.currentTab = tabName;
        
        // Atualiza UI dos botões
        const tabs = document.querySelectorAll('.chat-tab-btn');
        tabs.forEach(t => t.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
        
        this.renderContactsList();
    },

    // --- MODO DOCK (ADMIN) ---

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
            
            // Remove notificação ao abrir
            const dot = document.getElementById('dock-notification-dot');
            if(dot) dot.classList.remove('active');
        }
        this.dockOpen = !this.dockOpen;
    },

    renderDockList() {
        const list = document.getElementById('chat-dock-users');
        if (!list) return;

        // No dock, mostramos Staff e Sistema, ocultamos alunas por padrão para não poluir
        // (Pode ajustar conforme necessidade)
        let staffOnly = this.contacts.filter(u => {
            const r = u.role || 'user';
            return r !== 'user'; 
        });

        // Se quiser mostrar todos, comente o filtro acima e use:
        // let staffOnly = this.contacts;

        if (staffOnly.length === 0) {
            list.innerHTML = '<div style="padding:15px; color:#999; text-align:center; font-size:0.85rem;">Nenhum membro da equipe disponível.</div>';
            return;
        }

        list.innerHTML = staffOnly.map(u => ChatView.UserItem(u)).join('');
    },

    openDockWindow(userId, userName) {
        // Se já estiver aberta, não faz nada
        if (this.openWindows.has(userId)) {
            // Se estiver minimizada, poderia restaurar (opcional)
            const win = document.getElementById(`window-${userId}`);
            if(win) win.classList.remove('minimized');
            return;
        }
        
        // Limite de 3 janelas para não quebrar layout
        if (this.openWindows.size >= 3) {
            const first = this.openWindows.values().next().value;
            this.closeWindow(first);
        }

        const container = document.getElementById('chat-windows-container');
        if(!container) return;

        // Decodifica nome se vier com caracteres estranhos
        const decodedName = decodeURIComponent(userName);

        container.insertAdjacentHTML('beforeend', ChatView.ChatWindow(userId, decodedName));
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

        container.innerHTML = '<div class="loader-spinner" style="margin:auto;"></div>';

        const messages = await Services.getChatMessages(this.currentUserId, userId, this.MESSAGES_LIMIT);
        
        if (messages && messages.length > 0) {
            // Renderiza mensagens. Nota: reverse() pois vem do banco (newest first) mas exibimos (oldest top)
            container.innerHTML = messages.map(msg => 
                ChatView.MessageBubble(msg, msg.sender_id === this.currentUserId)
            ).join('');
        } else {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#ccc; font-size:0.8rem;">Nenhuma mensagem ainda.<br>Diga olá! 👋</div>';
        }
        
        // Scroll para o fim
        container.scrollTop = container.scrollHeight;
    },

    async sendDockMessage(e, targetId) {
        e.preventDefault();
        const form = e.target;
        const input = form.message;
        const text = input.value.trim();
        if (!text) return;
        
        input.value = '';

        // UI Otimista (mostra antes de confirmar envio)
        const container = document.getElementById(`msgs-${targetId}`);
        const tempMsg = { 
            content: text, 
            created_at: new Date().toISOString(), 
            sender_id: this.currentUserId 
        };
        
        if(container) {
            // Remove mensagem de "vazio" se existir
            if(container.innerHTML.includes('Nenhuma mensagem')) container.innerHTML = '';
            
            container.insertAdjacentHTML('beforeend', ChatView.MessageBubble(tempMsg, true));
            container.scrollTop = container.scrollHeight;
        }

        await Services.sendMessage(this.currentUserId, targetId, text);
    },

    // --- MODO PÁGINA (MOBILE) ---

    renderContactsList(filterText = '') {
        const container = document.getElementById('chat-contacts-list');
        if (!container) return;

        let filtered = this.contacts;

        // Filtragem por Aba
        if (this.currentTab === 'staff') {
            filtered = filtered.filter(u => u.role !== 'user');
        } else if (this.currentTab === 'clients') {
            filtered = filtered.filter(u => u.role === 'user');
        }

        // Filtragem por Texto
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
        this.renderContactsList(); // Atualiza seleção visual
        
        // Em mobile, desliza a tela
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

        const messages = await Services.getChatMessages(this.currentUserId, this.activeChatId, this.MESSAGES_LIMIT);
        
        // Mapeia e junta HTML
        const html = messages.map(msg => 
            ChatView.PageMessageBubble(msg, msg.sender_id === this.currentUserId)
        ).join('');

        container.innerHTML = html || '<div style="text-align:center;color:#999;margin-top:20px;">Nenhuma mensagem.<br>Envie a primeira!</div>';
        container.scrollTop = container.scrollHeight;
    },

    async sendMessagePage(e, targetId) {
        e.preventDefault();
        const input = document.getElementById('chat-input-page');
        if(!input) return;
        
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        input.focus();

        const container = document.getElementById('active-chat-messages');
        const tempMsg = { 
            content: text, 
            created_at: new Date().toISOString(), 
            sender_id: this.currentUserId 
        };
        
        if(container) {
            if(container.innerHTML.includes('Nenhuma mensagem')) container.innerHTML = '';
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
        // Futuro: Implementar paginação infinita ao rolar para cima
    },
    
    loadMoreMessages() {
        // Futuro: Carregar mais mensagens
    },

    // --- REALTIME (ATUALIZAÇÃO AUTOMÁTICA) ---

    setupRealtime() {
        if (this.realtimeChannel) return; // Evita duplicação

        // Escuta INSERTs na tabela messages
        this.realtimeChannel = supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                this.handleNewMessage(payload.new);
            })
            .subscribe((status) => {
                if(status === 'SUBSCRIBED') console.log('Chat: Conectado ao Realtime.');
            });
    },

    handleNewMessage(msg) {
        // Ignora mensagens que eu mesmo enviei (já tratadas pela UI Otimista)
        if (msg.sender_id === this.currentUserId) return;

        // Verifica se é mensagem de grupo (recipient_id null)
        const isGroupMsg = (msg.recipient_id === null);
        
        // Define quem é o "remetente lógico" para fins de UI
        // Se for grupo, a janela de chat é 'STAFF_GROUP', não o ID de quem mandou
        const logicalSenderId = isGroupMsg ? 'STAFF_GROUP' : msg.sender_id;

        // Se a mensagem não for para mim e não for grupo, ignora
        if (!isGroupMsg && msg.recipient_id !== this.currentUserId) return;

        // 1. Atualizar MODO PÁGINA (Mobile)
        if (this.activeChatId === logicalSenderId) {
            const container = document.getElementById('active-chat-messages');
            if (container) {
                // Se for grupo, adiciona nome de quem enviou no texto
                const contentDisplay = isGroupMsg 
                    ? `<strong>${msg.sender_name || 'Alguém'}:</strong> ${msg.content}` 
                    : msg.content;
                
                // Remove aviso de vazio
                if(container.innerHTML.includes('Nenhuma mensagem')) container.innerHTML = '';

                const bubble = ChatView.PageMessageBubble({ ...msg, content: contentDisplay }, false);
                container.insertAdjacentHTML('beforeend', bubble);
                container.scrollTop = container.scrollHeight;
            }
        }

        // 2. Atualizar MODO DOCK (Admin)
        if (this.openWindows.has(logicalSenderId)) {
            const dockContainer = document.getElementById(`msgs-${logicalSenderId}`);
            if (dockContainer) {
                 const contentDisplay = isGroupMsg 
                    ? `<strong>${msg.sender_name || 'Alguém'}:</strong> ${msg.content}` 
                    : msg.content;
                
                 if(dockContainer.innerHTML.includes('Nenhuma mensagem')) dockContainer.innerHTML = '';

                 const bubble = ChatView.MessageBubble({ ...msg, content: contentDisplay }, false);
                dockContainer.insertAdjacentHTML('beforeend', bubble);
                dockContainer.scrollTop = dockContainer.scrollHeight;
            }
        } else {
            // Se a janela não estiver aberta, mostra notificação
            const notifDot = document.getElementById('dock-notification-dot');
            if (notifDot) notifDot.classList.add('active');
            
            // Se o dock estiver fechado, mostra toast
            if(!this.dockOpen) {
                const senderObj = this.contacts.find(c => c.id === msg.sender_id);
                const senderName = isGroupMsg ? "Equipe" : (senderObj?.full_name || 'Novo contato');
                Toast.info(`Nova mensagem de ${senderName}`);
            }
        }
        
        // Som de notificação
        try {
            const audio = new Audio('notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(e=>{}); // Ignora erro de autoplay policy
        } catch(e){}
    }
};