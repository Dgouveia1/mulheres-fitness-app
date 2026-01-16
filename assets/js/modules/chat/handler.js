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
    currentTab: 'all', 
    MESSAGES_LIMIT: 50,
    realtimeChannel: null,
    presenceChannel: null,
    onlineUsers: new Set(),
    audioContextUnlocked: false,

    // --- INICIALIZAÇÃO ---

    async initCommon() {
        try {
            const { data } = await auth.getSession();
            if (!data.session) {
                console.warn('ChatHandler: Sem sessão ativa.');
                return false;
            }
            
            let user = data.session.user;
            this.currentUserId = user.id;
            
            window.ChatHandler = this; 

            if (!user.profile) {
                const { data: profile } = await auth.getProfile();
                if (profile) user.profile = profile;
            }
            
            const role = user.profile?.role || 'user';
            
            await this.loadContacts(role);
            this.setupRealtime();
            this.setupPresence();
            this.setupAudioUnlock();
            
            return true;
        } catch (error) {
            console.error('ChatHandler: Erro na inicialização', error);
            return false;
        }
    },

    async initPageMode() {
        const ready = await this.initCommon();
        if (!ready) return;
        
        const dock = document.getElementById('chat-dock-container');
        if(dock) dock.style.display = 'none';
        
        this.renderContactsList();
    },

    async initDockMode() {
        const ready = await this.initCommon();
        if (!ready) return;
        
        const wrapper = document.getElementById('chat-dock-wrapper');
        
        if (wrapper && !document.getElementById('chat-dock-container')) {
            wrapper.innerHTML = ChatView.Container();
        } 
        
        const dock = document.getElementById('chat-dock-container');
        if(dock) {
            dock.style.display = 'block';
            this.renderDockList();
        }
    },

    setupAudioUnlock() {
        const unlock = () => {
            this.audioContextUnlocked = true;
            document.removeEventListener('click', unlock);
            document.removeEventListener('keydown', unlock);
        };
        document.addEventListener('click', unlock);
        document.addEventListener('keydown', unlock);
    },

    playNotificationSound() {
        if (!this.audioContextUnlocked) return;
        try {
            const audio = new Audio('notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Áudio bloqueado pelo navegador", e));
        } catch(e){}
    },

    // --- HELPERS ---
    
    // Formata a mensagem para exibir o nome se for grupo e não for eu
    formatMessageContent(msg, isGroup) {
        if (isGroup && msg.sender_id !== this.currentUserId) {
            const senderName = msg.sender_name ? msg.sender_name.split(' ')[0] : 'Alguém';
            return `<strong style="color:var(--primary-color); font-size:0.8rem;">${senderName}:</strong><br>${msg.content}`;
        }
        return msg.content;
    },

    // --- CONTATOS E ORDENAÇÃO ---

    async loadContacts(userRole) {
        // 1. Busca usuários
        const allUsers = await Services.getChatContacts();
        
        // 2. Busca mensagens recentes para ordenar
        const recentMsgs = await Services.getRecentMessagesSummary(this.currentUserId);
        
        // Mapa: ID -> { time, preview }
        const lastMsgMap = new Map();
        
        recentMsgs.forEach(msg => {
            // Se recipient_id é null, é grupo (STAFF_GROUP)
            // Se não, o ID da conversa é o ID do "outro" (seja sender ou recipient)
            const isGroup = (msg.recipient_id === null);
            let partnerId;

            if (isGroup) {
                partnerId = 'STAFF_GROUP';
            } else {
                partnerId = (msg.sender_id === this.currentUserId) ? msg.recipient_id : msg.sender_id;
            }
            
            // Grava apenas o mais recente
            if (!lastMsgMap.has(partnerId)) {
                lastMsgMap.set(partnerId, { 
                    time: new Date(msg.created_at).getTime(),
                    preview: msg.content
                });
            }
        });

        // 3. Processa e mescla dados
        this.contacts = allUsers
            .filter(u => u.id !== this.currentUserId)
            .map(u => {
                const lastData = lastMsgMap.get(u.id) || { time: 0, preview: '' };
                return {
                    ...u,
                    last_interaction_ts: lastData.time,
                    last_message_preview: lastData.preview,
                    is_online: false
                };
            });

        // 4. Adiciona Grupo Staff (sempre no topo se tiver msg, ou fixo)
        const staffRoles = ['admin', 'reception', 'coach', 'nutri', 'operacional_user'];        
        if (staffRoles.includes(userRole)) {
            const groupData = lastMsgMap.get('STAFF_GROUP') || { time: 0, preview: '' };
            
            // Verifica se já existe para não duplicar
            const hasGroup = this.contacts.find(c => c.id === 'STAFF_GROUP');
            if (!hasGroup) {
                this.contacts.push({
                    id: 'STAFF_GROUP',
                    full_name: '📢 Chat da Equipe',
                    role: 'system',
                    avatar_url: null,
                    is_group: true,
                    last_interaction_ts: groupData.time > 0 ? groupData.time : 9999999999999, // Força topo se nunca teve msg, ou usa tempo real
                    last_message_preview: groupData.preview,
                    is_online: true
                });
            }
        }

        this.sortContacts();
    },

    sortContacts() {
        this.contacts.sort((a, b) => {
            // 1. Prioridade por data da última mensagem
            if (b.last_interaction_ts !== a.last_interaction_ts) {
                return b.last_interaction_ts - a.last_interaction_ts;
            }
            // 2. Desempate alfabético (com proteção contra null)
            const nameA = a.full_name || 'Usuário';
            const nameB = b.full_name || 'Usuário';
            return nameA.localeCompare(nameB);
        });
    },

    setupPresence() {
        if (this.presenceChannel) return;

        this.presenceChannel = supabase.channel('online-users', {
            config: { presence: { key: this.currentUserId } }
        });

        this.presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const newState = this.presenceChannel.presenceState();
                this.onlineUsers = new Set(Object.keys(newState));

                this.contacts.forEach(c => {
                    if (c.id !== 'STAFF_GROUP') {
                        c.is_online = this.onlineUsers.has(c.id);
                    }
                });
                this.updateUILists();
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await this.presenceChannel.track({ 
                        online_at: new Date().toISOString(),
                        user_id: this.currentUserId
                    });
                }
            });
    },

    setTab(tabName, btnElement) {
        this.currentTab = tabName;
        const tabs = document.querySelectorAll('.chat-tab-btn');
        tabs.forEach(t => t.classList.remove('active'));
        if(btnElement) btnElement.classList.add('active');
        this.renderContactsList();
    },

    updateUILists() {
        if(document.getElementById('chat-contacts-list')) this.renderContactsList();
        if(document.getElementById('chat-dock-users')) this.renderDockList();
    },

    // --- DOCK MODE ---

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

        let staffOnly = this.contacts.filter(u => u.role !== 'user');

        if (staffOnly.length === 0) {
            list.innerHTML = '<div style="padding:15px; color:#999; text-align:center; font-size:0.85rem;">Nenhum membro da equipe disponível.</div>';
            return;
        }

        list.innerHTML = staffOnly.map(u => ChatView.UserItem(u)).join('');
    },

    openDockWindow(userId, userName) {
        if (this.openWindows.has(userId)) {
            const win = document.getElementById(`window-${userId}`);
            if(win) win.classList.remove('minimized');
            return;
        }
        
        if (this.openWindows.size >= 3) {
            const first = this.openWindows.values().next().value;
            this.closeWindow(first);
        }

        const container = document.getElementById('chat-windows-container');
        if(!container) return;

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
        const isGroup = (userId === 'STAFF_GROUP');

        if (messages && messages.length > 0) {
            container.innerHTML = messages.map(msg => {
                // Aplica formatação aqui também
                const finalContent = this.formatMessageContent(msg, isGroup);
                return ChatView.MessageBubble({ ...msg, content: finalContent }, msg.sender_id === this.currentUserId);
            }).join('');
        } else {
            container.innerHTML = '<div style="text-align:center; padding:20px; color:#ccc; font-size:0.8rem;">Nenhuma mensagem ainda.<br>Diga olá! 👋</div>';
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
        const tempMsg = { content: text, created_at: new Date().toISOString(), sender_id: this.currentUserId };
        
        if(container) {
            if(container.innerHTML.includes('Nenhuma mensagem')) container.innerHTML = '';
            container.insertAdjacentHTML('beforeend', ChatView.MessageBubble(tempMsg, true));
            container.scrollTop = container.scrollHeight;
        }
        
        this.updateLocalContactTimestamp(targetId, text);
        await Services.sendMessage(this.currentUserId, targetId, text);
    },

    // --- PAGE MODE ---

    renderContactsList(filterText = '') {
        const container = document.getElementById('chat-contacts-list');
        if (!container) return;

        let filtered = this.contacts;

        if (this.currentTab === 'staff') {
            filtered = filtered.filter(u => u.role !== 'user');
        } else if (this.currentTab === 'clients') {
            filtered = filtered.filter(u => u.role === 'user');
        }

        if (filterText) {
            const term = filterText.toLowerCase();
            filtered = filtered.filter(u => u.full_name && u.full_name.toLowerCase().includes(term));
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">Nenhum contato encontrado.</div>';
            return;
        }

        container.innerHTML = filtered.map(u => {
            return ChatView.ContactItem(u, u.last_message_preview, u.id === this.activeChatId);
        }).join('');
    },

    filterContacts(text) { this.renderContactsList(text); },

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

        const messages = await Services.getChatMessages(this.currentUserId, this.activeChatId, this.MESSAGES_LIMIT);
        const isGroup = (this.activeChatId === 'STAFF_GROUP');

        const html = messages.map(msg => {
            // Aplica formatação aqui também
            const finalContent = this.formatMessageContent(msg, isGroup);
            return ChatView.PageMessageBubble({ ...msg, content: finalContent }, msg.sender_id === this.currentUserId);
        }).join('');

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
        const tempMsg = { content: text, created_at: new Date().toISOString(), sender_id: this.currentUserId };
        
        if(container) {
            if(container.innerHTML.includes('Nenhuma mensagem')) container.innerHTML = '';
            container.insertAdjacentHTML('beforeend', ChatView.PageMessageBubble(tempMsg, true));
            container.scrollTop = container.scrollHeight;
        }

        this.updateLocalContactTimestamp(targetId, text);
        await Services.sendMessage(this.currentUserId, targetId, text);
    },
    
    backToMobileList() {
        const container = document.querySelector('.chat-page-container');
        if(container) container.classList.remove('chat-active');
        this.activeChatId = null;
    },

    handleScroll(element) { },

    // --- REALTIME ---

    setupRealtime() {
        if (this.realtimeChannel) return;

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
        // Ignora msg enviada pelo próprio usuário (UI Otimista já tratou)
        if (msg.sender_id === this.currentUserId) return;

        // Identifica se é grupo ou privado
        const isGroupMsg = (msg.recipient_id === null);
        const logicalSenderId = isGroupMsg ? 'STAFF_GROUP' : msg.sender_id;

        // Se privado e não é para mim, ignora
        if (!isGroupMsg && msg.recipient_id !== this.currentUserId) return;

        // 1. Toca Som
        this.playNotificationSound();

        // 2. Atualiza Ordenação da Lista
        this.updateLocalContactTimestamp(logicalSenderId, msg.content);

        // 3. Prepara o conteúdo com nome se for grupo
        const finalContent = this.formatMessageContent(msg, isGroupMsg);

        // 4. Atualizar UI (Page Mode)
        if (this.activeChatId === logicalSenderId) {
            const container = document.getElementById('active-chat-messages');
            if (container) {
                if(container.innerHTML.includes('Nenhuma mensagem')) container.innerHTML = '';
                const bubble = ChatView.PageMessageBubble({ ...msg, content: finalContent }, false);
                container.insertAdjacentHTML('beforeend', bubble);
                container.scrollTop = container.scrollHeight;
            }
        }

        // 5. Atualizar UI (Dock Mode)
        if (this.openWindows.has(logicalSenderId)) {
            const dockContainer = document.getElementById(`msgs-${logicalSenderId}`);
            if (dockContainer) {
                 if(dockContainer.innerHTML.includes('Nenhuma mensagem')) dockContainer.innerHTML = '';
                 const bubble = ChatView.MessageBubble({ ...msg, content: finalContent }, false);
                dockContainer.insertAdjacentHTML('beforeend', bubble);
                dockContainer.scrollTop = dockContainer.scrollHeight;
            }
        } else {
            // Notificação visual se a janela estiver fechada
            const notifDot = document.getElementById('dock-notification-dot');
            if (notifDot) notifDot.classList.add('active');
            
            if(!this.dockOpen) {
                const senderObj = this.contacts.find(c => c.id === msg.sender_id);
                const senderName = isGroupMsg ? "Equipe" : (senderObj?.full_name || 'Novo contato');
                Toast.info(`Nova mensagem de ${senderName}`);
            }
        }
    },

    updateLocalContactTimestamp(contactId, previewText) {
        const contact = this.contacts.find(c => c.id === contactId);
        if (contact) {
            contact.last_interaction_ts = Date.now();
            contact.last_message_preview = previewText;
            this.sortContacts(); // Re-ordena o array
            this.updateUILists(); // Redesenha a lista visual
        }
    }
};