import { ChatHandler } from './handler.js';

export const ChatView = {
    // --- DOCK MODE ---
    Container: () => `
        <div id="chat-dock-container" style="display:none;">
            <div id="chat-dock" class="chat-dock minimized">
                <div class="chat-dock-header" onclick="ChatHandler.toggleDock()">
                    <div class="title-area">
                        <span class="material-icons">forum</span>
                        <span>Chat da Equipe</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div id="dock-notification-dot" class="notification-dot"></div>
                        <span class="material-icons" id="dock-chevron" style="color:#999;">expand_less</span>
                    </div>
                </div>
                <div class="chat-dock-list" id="chat-dock-users">
                    <div class="loader-spinner" style="margin:20px auto; width:20px; height:20px; border-width:2px;"></div>
                </div>
            </div>
        </div>
        <div id="chat-windows-container"></div>
    `,

    UserItem: (user) => {
        // Ícone Especial para o Grupo
        if (user.id === 'STAFF_GROUP') {
            const preview = user.last_message_preview ? 
                (user.last_message_preview.length > 25 ? user.last_message_preview.substring(0, 25) + '...' : user.last_message_preview) 
                : 'Todos os profissionais';

            return `
            <div class="chat-user-item" onclick="ChatHandler.openDockWindow('${user.id}', 'Chat Geral')" style="background:#fdf2f8;">
                <div class="chat-user-avatar" style="background:var(--primary-color); color:white; display:flex; align-items:center; justify-content:center; border-radius:50%;">
                    <span class="material-icons" style="font-size:1.2rem;">groups</span>
                    <div class="status-indicator" style="background: #10b981;"></div>
                </div>
                <div class="chat-user-info">
                    <p class="chat-user-name" style="color:var(--primary-color); font-weight:700;">Chat Geral</p>
                    <p class="chat-user-role">${preview}</p>
                </div>
            </div>`;
        }

        const roleLabel = {
            'admin': 'Admin',
            'reception': 'Recepção',
            'coach': 'Treinadora',
            'nutri': 'Nutricionista',
            'user': 'Aluna',
            'system': 'Sistema'
        }[user.role] || 'Staff';

        const fullName = user.full_name || 'Usuário';
        const initial = fullName.charAt(0).toUpperCase();

        // Avatar usando apenas iniciais
        const avatarHTML = `<div style="width:36px;height:36px;background:#e5e7eb;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#6b7280;font-weight:700;">${initial}</div>`;

        // Indicador de status
        const statusColor = user.is_online ? '#10b981' : '#ccc';
        const preview = user.last_message_preview ? 
                (user.last_message_preview.length > 20 ? user.last_message_preview.substring(0, 20) + '...' : user.last_message_preview) 
                : roleLabel;

        return `
        <div class="chat-user-item" onclick="ChatHandler.openDockWindow('${user.id}', '${encodeURIComponent(fullName)}')">
            <div class="chat-user-avatar">
                ${avatarHTML}
                <div class="status-indicator" style="background: ${statusColor};"></div>
            </div>
            <div class="chat-user-info">
                <p class="chat-user-name">${fullName.split(' ')[0]}</p>
                <p class="chat-user-role">${preview}</p>
            </div>
            <span class="material-icons" style="font-size:1.2rem; color:#e5e7eb;">chat_bubble_outline</span>
        </div>`;
    },

    ChatWindow: (id, name) => `
        <div class="chat-window" id="window-${id}">
            <div class="chat-window-header" onclick="ChatHandler.minimizeWindow('${id}')">
                <div style="display:flex; align-items:center; gap:8px;">
                    ${id === 'STAFF_GROUP' ? '<span class="material-icons" style="font-size:1rem;">groups</span>' : '<div style="width:8px; height:8px; background:#10b981; border-radius:50%; box-shadow:0 0 0 2px rgba(255,255,255,0.2);"></div>'}
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${name}</span>
                </div>
                <div class="chat-window-actions">
                    <button type="button" onclick="event.stopPropagation(); ChatHandler.closeWindow('${id}')" title="Fechar"><span class="material-icons" style="font-size:1.1rem;">close</span></button>
                </div>
            </div>
            <div class="chat-messages-area" id="msgs-${id}">
                <div class="loader-spinner" style="margin: auto;"></div>
            </div>
            <form class="chat-input-area" onsubmit="ChatHandler.sendDockMessage(event, '${id}')">
                <input type="text" placeholder="Escreva uma mensagem..." autocomplete="off" name="message">
                <button type="submit"><span class="material-icons">send</span></button>
            </form>
        </div>
    `,

    MessageBubble: (msg, isMe) => {
        const date = new Date(msg.created_at);
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `<div class="chat-message-bubble ${isMe ? 'sent' : 'received'}">
            ${msg.content} 
            <div class="chat-time">${time}</div>
        </div>`;
    },

    // --- PAGE MODE ---
    ContactItem: (user, lastMsg = '', isActive = false) => {
        const statusColor = user.is_online ? '#10b981' : '#ccc';
        const name = user.full_name || 'Usuário';
        const role = { 'admin': 'Admin', 'reception': 'Recepção', 'coach': 'Treinadora', 'nutri': 'Nutricionista', 'user': 'Aluna', 'system': 'Sistema' }[user.role] || 'Staff';
        const initial = name.charAt(0).toUpperCase();
        
        const avatarHTML = `<div class="placeholder" style="width:100%;height:100%;background:#e5e7eb;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#666;font-weight:700;">${initial}</div>`;

        if (user.id === 'STAFF_GROUP') {
            return `
            <div class="chat-list-item ${isActive ? 'active' : ''}" onclick="ChatHandler.loadConversation('${user.id}')" style="background: ${isActive ? '#fce7f3' : '#fff0f7'}">
                <div class="chat-list-avatar">
                     <div class="placeholder" style="background:var(--primary-color); color:white; border-radius:50%; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
                        <span class="material-icons">groups</span>
                     </div>
                </div>
                <div class="chat-list-info">
                    <div class="chat-list-name" style="color:var(--primary-color);">📢 Chat da Equipe</div>
                    <div class="chat-list-preview" style="${lastMsg ? 'font-weight:600;color:#333;' : ''}">${lastMsg || 'Chat Geral'}</div>
                </div>
            </div>`;
        }

        return `
        <div class="chat-list-item ${isActive ? 'active' : ''}" onclick="ChatHandler.loadConversation('${user.id}')">
            <div class="chat-list-avatar">
                ${avatarHTML}
                <div class="status-badge" style="background: ${statusColor};"></div>
            </div>
            <div class="chat-list-info">
                <div class="chat-list-name">${name.split(' ')[0]} <span style="font-size:0.7em;color:#999;">(${role})</span></div>
                <div class="chat-list-preview" style="${lastMsg ? 'font-weight:600;color:#333;' : ''}">${lastMsg || 'Toque para conversar'}</div>
            </div>
        </div>`;
    },

    MainChatArea: (user) => {
        const isGroup = user.id === 'STAFF_GROUP';
        const fullName = user.full_name || 'Usuário';
        const initial = fullName.charAt(0).toUpperCase();

        const avatarHTML = isGroup 
            ? `<div style="background:var(--primary-color); color:white; border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center;"><span class="material-icons">groups</span></div>`
            : `<div style="width:40px;height:40px;background:#eee;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;color:#555;">${initial}</div>`;

        const statusText = isGroup ? 'Todos os membros' : (user.is_online ? 'Online' : 'Offline');
        const statusColor = user.is_online ? '#10b981' : '#999';

        return `
        <div class="chat-main-header">
            <div style="display:flex; align-items:center; gap:12px;">
                <span class="material-icons btn-back-chat" onclick="ChatHandler.backToMobileList()">arrow_back</span>
                ${avatarHTML}
                <div>
                    <div class="chat-header-name">${isGroup ? 'Chat da Equipe' : fullName}</div>
                    <div class="chat-header-status" style="color:${isGroup ? '#666' : statusColor}">${statusText}</div>
                </div>
            </div>
        </div>
        
        <div id="active-chat-messages" class="chat-main-messages" onscroll="ChatHandler.handleScroll(this)"></div>

        <form class="chat-main-input" onsubmit="ChatHandler.sendMessagePage(event, '${user.id}')">
            <input type="text" id="chat-input-page" class="chat-input-field" placeholder="Digite uma mensagem..." autocomplete="off">
            <button type="submit" class="btn-send-chat"><span class="material-icons">send</span></button>
        </form>`;
    },

    PageMessageBubble: (msg, isMe) => {
        const date = new Date(msg.created_at);
        const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
        <div class="message-bubble ${isMe ? 'sent' : 'received'}">
            <div class="message-content">${msg.content}</div>
            <div class="message-time">
                ${time}
                ${isMe ? '<span class="material-icons" style="font-size:0.9rem; color:#4b5563; vertical-align:middle;">done_all</span>' : ''}
            </div>
        </div>`;
    }
};