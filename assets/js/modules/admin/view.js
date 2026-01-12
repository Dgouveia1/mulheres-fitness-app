export const AdminView = {
    Dashboard: (user) => `
        <div class="admin-page-header">
            <h1>Visão Geral</h1>
            <p>Bem-vindo ao painel de controle.</p>
        </div>
        <div class="admin-dashboard-grid">
            <div class="stat-card">
                <h3>Agendamentos Hoje</h3>
                <p class="stat-value" id="dash-today-count">...</p>
            </div>
            <div class="stat-card">
                <h3>Clientes Ativos</h3>
                <p class="stat-value" id="dash-clients-count">...</p>
            </div>
            <div class="stat-card highlight">
                <h3>Ação Rápida</h3>
                <button onclick="window.location.hash='/admin/agenda'" class="btn-admin-primary">Ver Agenda</button>
            </div>
        </div>
        <div class="recent-section">
            <h2>Últimos Agendamentos</h2>
            <div id="dash-recent-list" class="simple-list">Carregando...</div>
        </div>
    `,

    Chat: () => `
        <div id="chat-page-root" class="chat-page-container">
            <!-- Sidebar -->
            <div class="chat-page-sidebar">
                <div class="chat-search-bar">
                    <input type="text" class="chat-search-input" placeholder="Buscar conversa..." onkeyup="ChatHandler.filterContacts(this.value)">
                </div>
                <div class="chat-tabs">
                    <div class="chat-tab-btn active" onclick="ChatHandler.setTab('all', this)">Todas</div>
                    <div class="chat-tab-btn" onclick="ChatHandler.setTab('staff', this)">Equipe</div>
                    <div class="chat-tab-btn" onclick="ChatHandler.setTab('clients', this)">Alunos</div>
                </div>
                <div id="chat-contacts-list" class="chat-list">
                    <div class="loader-spinner" style="margin:20px auto;"></div>
                </div>
            </div>

            <!-- Main Chat Area -->
            <div id="chat-main-area" class="chat-page-main">
                <div class="chat-empty-state">
                    <span class="material-icons chat-empty-icon">forum</span>
                    <h3>Selecione uma conversa</h3>
                    <p>Escolha um contato para começar a trocar mensagens.</p>
                </div>
            </div>
        </div>
    `,

    ManageFitFlix: () => `
        <div class="admin-page-header">
            <h1>Gestão FitFlix</h1>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 30px;">
            
            <!-- PARTE SUPERIOR: Painéis de Controle -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; align-items: start;">
                
                <!-- Gestão de Categorias -->
                <div class="card" style="background:white; padding: 20px;">
                    <h4 style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:5px;">Categorias</h4>
                    <form onsubmit="handler.handleCategorySubmit(event)" style="display:flex; gap:5px; margin-bottom:15px;">
                        <input type="hidden" id="edit-cat-id">
                        <input type="text" id="new-cat-name" placeholder="Nova Categoria" required style="flex:1; padding:8px; border:1px solid #ddd; border-radius:6px;">
                        <button type="submit" id="btn-save-cat" style="background:var(--primary-color); color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold; width: 30px; display:flex; align-items:center; justify-content:center;">+</button>
                        <button type="button" id="cancel-edit-cat" onclick="handler.cancelCategoryEdit()" style="display:none; background:#eee; border:none; border-radius:6px; cursor:pointer; width:30px;">✕</button>
                    </form>
                    <div id="categories-list" style="max-height: 200px; overflow-y: auto;">
                        <!-- Lista injetada via JS -->
                    </div>
                </div>

                <!-- Formulário de Upload -->
                <div class="card" style="background:white; padding: 24px;">
                    <h3 style="margin-bottom:20px;">Upload de Vídeo</h3>
                    <form id="fitflix-upload-form" onsubmit="handler.handleVideoUpload(event)">
                        <div class="form-group">
                            <label>Título</label>
                            <input type="text" name="title" required placeholder="Ex: Treino de Glúteos">
                        </div>
                        
                        <div class="form-group">
                            <label>Categoria</label>
                            <select name="category" required>
                                <option value="" disabled selected>Carregando...</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label>Descrição</label>
                            <input type="text" name="description" placeholder="Breve descrição...">
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label>Capa 📸</label>
                                <input type="file" name="thumbnail" accept="image/*" required>
                            </div>
                            <div class="form-group">
                                <label>Vídeo 🎥</label>
                                <input type="file" name="video" accept="video/*" required>
                            </div>
                        </div>

                        <div id="upload-progress-container" style="display:none; margin-top:15px;">
                            <label id="upload-status-text" style="color:var(--primary-color); font-weight:700;">Enviando...</label>
                            <div style="width:100%; height:8px; background:#f0f0f0; border-radius:4px; margin-top:5px; overflow:hidden;">
                                <div id="upload-progress-bar" style="width:0%; height:100%; background:var(--primary-color); transition: width 0.3s;"></div>
                            </div>
                        </div>

                        <button type="submit" id="btn-upload-video" class="btn-primary" style="width:100%; margin-top:20px;">
                            Publicar
                        </button>
                    </form>
                </div>
            </div>

            <!-- PARTE INFERIOR: Lista de Vídeos -->
            <div style="background:white; padding: 24px; border-radius:16px; border:1px solid #e5e7eb;">
                <h3 style="margin-bottom:20px;">Biblioteca de Vídeos</h3>
                <div id="admin-video-list" style="display:flex; flex-direction:column; gap:10px; max-height:800px; overflow-y:auto;">
                    <div class="loader-spinner" style="margin:20px auto;"></div>
                </div>
            </div>
        </div>

        <!-- MODAL EDITAR VÍDEO -->
        <div id="modal-edit-video" class="modal-overlay">
            <div class="modal-content">
                <div class="row-between" style="margin-bottom:20px;">
                    <h3>Editar Vídeo</h3>
                    <button type="button" class="btn-icon-sm" onclick="document.getElementById('modal-edit-video').classList.remove('active')">✕</button>
                </div>
                <form onsubmit="handler.handleVideoUpdate(event)">
                    <input type="hidden" id="edit-video-id">
                    <div class="form-group">
                        <label>Título</label>
                        <input type="text" id="edit-video-title" required>
                    </div>
                    <div class="form-group">
                        <label>Categoria</label>
                        <select id="edit-video-category" name="category" required>
                            <!-- Preenchido via JS -->
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Descrição</label>
                        <textarea id="edit-video-desc" rows="3" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; resize:none;"></textarea>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                        <button type="button" class="btn-secondary" onclick="document.getElementById('modal-edit-video').classList.remove('active')">Cancelar</button>
                        <button type="submit" class="btn-primary">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
    `,

    Agenda: () => `
        <div class="admin-page-header row-between">
            <h1>Agenda Inteligente</h1>
            <button class="btn-admin-primary" id="btn-new-appointment" onclick="handler.openAppointment(null)">+ Novo Agendamento</button>
        </div>
        <div class="calendar-wrapper">
            <!-- Toolbar de Controle -->
            <div class="agenda-controls row-between">
                <div class="agenda-tabs">
                    <button class="tab-btn active" data-filter="all" onclick="handler.setFilter('all')">Todos</button>
                    <button class="tab-btn" data-filter="fisica" onclick="handler.setFilter('fisica')">Avaliação</button>
                    <button class="tab-btn" data-filter="nutri" onclick="handler.setFilter('nutri')">Nutrição</button>
                    <button class="tab-btn" data-filter="personal" onclick="handler.setFilter('personal')">Personal</button>
                </div>
                <div class="agenda-views">
                    <button class="view-btn active" data-view="day" onclick="handler.setView('day')">Dia</button>
                    <button class="view-btn" data-view="week" onclick="handler.setView('week')">Semana</button>
                    <button class="view-btn" data-view="month" onclick="handler.setView('month')">Mês</button>
                </div>
            </div>

            <div class="calendar-toolbar">
                <button id="cal-prev" class="btn-icon" onclick="handler.changeDate(-1)"><span class="material-icons">chevron_left</span></button>
                <h2 id="cal-current-date">Carregando...</h2>
                <button id="cal-next" class="btn-icon" onclick="handler.changeDate(1)"><span class="material-icons">chevron_right</span></button>
            </div>
            
            <div class="calendar-grid-container" id="calendar-grid">
                <!-- Injetado via JS -->
            </div>
        </div>
        
        <!-- Modal Agendamento -->
        <div id="modal-appointment" class="modal-overlay">
            <div class="modal-content">
                <div class="row-between" style="margin-bottom:20px;">
                    <h3>Agendar</h3>
                    <button type="button" class="btn-icon-sm" onclick="document.getElementById('modal-appointment').classList.remove('active')">✕</button>
                </div>
                <form id="form-appointment" onsubmit="handler.saveAppointment(event)">
                    <input type="hidden" id="app-id">
                    <div class="form-group">
                        <label>Cliente</label>
                        <input type="text" id="app-client" name="client_name" required placeholder="Nome da cliente">
                    </div>
                    <div class="form-group">
                        <label>Telefone (WhatsApp)</label>
                        <input type="tel" id="app-phone" name="telefone" placeholder="5511999999999 (apenas números)">
                        <small style="color:#666; font-size:0.8em;">Inclua o código do país (55) e DDD.</small>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Data</label>
                            <input type="date" id="app-date" name="date" required>
                        </div>
                        <div class="form-group">
                            <label>Hora Início</label>
                            <input type="time" id="app-time" name="time" required step="1800"> <!-- Step 30min -->
                        </div>
                    </div>
                    <div class="form-row">
                         <div class="form-group">
                            <label>Duração (min)</label>
                            <select id="app-duration" name="duration">
                                <option value="30">30 min</option>
                                <option value="60" selected>1 hora</option>
                                <option value="90">1h 30m</option>
                                <option value="120">2 horas</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Tipo</label>
                            <select id="app-type" name="type" required>
                                <option value="fisica">Avaliação Física</option>
                                <option value="nutri">Consulta Nutricional</option>
                                <option value="personal">Treino Personal</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="app-status" name="status">
                            <option value="pending">Pendente</option>
                            <option value="confirmed">Confirmado</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Unidade</label>
                        <input type="text" id="app-unit" name="unit" value="Central" readonly style="background:#eee;">
                    </div>

                    <div class="modal-actions" style="display: flex; align-items: center; margin-top: 20px;">
                        <button type="button" id="btn-delete-app" class="btn-error-outline" style="display:none;" onclick="handler.deleteAppointment()">Excluir</button>
                        <div style="display:flex; gap:10px; margin-left: auto;">
                            <button type="button" class="btn-secondary" onclick="document.getElementById('modal-appointment').classList.remove('active')">Cancelar</button>
                            <button type="submit" class="btn-primary">Salvar e Enviar</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `,

    Clients: () => `
        <div class="admin-page-header row-between">
            <h1>Clientes</h1>
            <button class="btn-admin-primary" onclick="alert('Funcionalidade em desenvolvimento')">+ Cadastrar Cliente</button>
        </div>
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Email/Contato</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="clients-table-body">
                    <tr><td colspan="4">Carregando...</td></tr>
                </tbody>
            </table>
        </div>
    `,

    // ATUALIZADO: Agora é apenas um container para o módulo de treinos renderizar dentro
    ManageWorkouts: () => `
        <div id="workouts-root">
            <!-- Conteúdo carregado dinamicamente pelo AdminWorkoutHandler -->
            <div class="loader-spinner" style="margin: 50px auto;"></div>
        </div>
    `,

    ManageDiet: () => `
        <div class="admin-page-header">
            <h1>Planos Alimentares</h1>
        </div>
        <p>Área da Nutricionista.</p>
        <div id="diets-list">Em breve...</div>
    `
};