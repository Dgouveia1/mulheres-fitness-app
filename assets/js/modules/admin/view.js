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
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 20px; align-items: start;">
                <div class="card" style="background:white; padding: 20px;">
                    <h4 style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:5px;">Categorias</h4>
                    <form onsubmit="handler.handleCategorySubmit(event)" style="display:flex; gap:5px; margin-bottom:15px;">
                        <input type="hidden" id="edit-cat-id">
                        <input type="text" id="new-cat-name" placeholder="Nova Categoria" required style="flex:1; padding:8px; border:1px solid #ddd; border-radius:6px;">
                        <button type="submit" id="btn-save-cat" style="background:var(--primary-color); color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold; width: 30px; display:flex; align-items:center; justify-content:center;">+</button>
                        <button type="button" id="cancel-edit-cat" onclick="handler.cancelCategoryEdit()" style="display:none; background:#eee; border:none; border-radius:6px; cursor:pointer; width:30px;">✕</button>
                    </form>
                    <div id="categories-list" style="max-height: 200px; overflow-y: auto;"></div>
                </div>

                <div class="card" style="background:white; padding: 24px;">
                    <h3 style="margin-bottom:20px;">Upload de Vídeo</h3>
                    <form id="fitflix-upload-form" onsubmit="handler.handleVideoUpload(event)">
                        <div class="form-group">
                            <label>Título</label>
                            <input type="text" name="title" required placeholder="Ex: Treino de Glúteos">
                        </div>
                        <div class="form-group">
                            <label>Categoria</label>
                            <select name="category" required><option value="" disabled selected>Carregando...</option></select>
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
                        <button type="submit" id="btn-upload-video" class="btn-primary" style="width:100%; margin-top:20px;">Publicar</button>
                    </form>
                </div>
            </div>
            <div style="background:white; padding: 24px; border-radius:16px; border:1px solid #e5e7eb;">
                <h3 style="margin-bottom:20px;">Biblioteca de Vídeos</h3>
                <div id="admin-video-list" style="display:flex; flex-direction:column; gap:10px; max-height:800px; overflow-y:auto;">
                    <div class="loader-spinner" style="margin:20px auto;"></div>
                </div>
            </div>
        </div>
        <div id="modal-edit-video" class="modal-overlay">
            <div class="modal-content">
                <div class="row-between" style="margin-bottom:20px;">
                    <h3>Editar Vídeo</h3>
                    <button type="button" class="btn-icon-sm" onclick="document.getElementById('modal-edit-video').classList.remove('active')">✕</button>
                </div>
                <form onsubmit="handler.handleVideoUpdate(event)">
                    <input type="hidden" id="edit-video-id">
                    <div class="form-group"><label>Título</label><input type="text" id="edit-video-title" required></div>
                    <div class="form-group"><label>Categoria</label><select id="edit-video-category" name="category" required></select></div>
                    <div class="form-group"><label>Descrição</label><textarea id="edit-video-desc" rows="3" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; resize:none;"></textarea></div>
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
            <div class="calendar-grid-container" id="calendar-grid"></div>
        </div>
        <div id="modal-appointment" class="modal-overlay">
            <div class="modal-content">
                <div class="row-between" style="margin-bottom:20px;">
                    <h3>Agendar</h3>
                    <button type="button" class="btn-icon-sm" onclick="document.getElementById('modal-appointment').classList.remove('active')">✕</button>
                </div>
                <form id="form-appointment" onsubmit="handler.saveAppointment(event)">
                    <input type="hidden" id="app-id">
                    <div class="form-group"><label>Cliente</label><input type="text" id="app-client" name="client_name" required placeholder="Nome da cliente"></div>
                    <div class="form-group">
                        <label>Telefone (WhatsApp)</label>
                        <input type="tel" id="app-phone" name="telefone" placeholder="11999999999 (apenas números)">
                        <small style="color:#666; font-size:0.8em;">Inclua o DDD.</small>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Data</label><input type="date" id="app-date" name="date" required></div>
                        <div class="form-group"><label>Hora Início</label><input type="time" id="app-time" name="time" required step="1800"></div>
                    </div>
                    <div class="form-row">
                         <div class="form-group"><label>Duração (min)</label><select id="app-duration" name="duration"><option value="30">30 min</option><option value="60" selected>1 hora</option><option value="90">1h 30m</option><option value="120">2 horas</option></select></div>
                        <div class="form-group"><label>Tipo</label><select id="app-type" name="type" required><option value="fisica">Avaliação Física</option><option value="nutri">Consulta Nutricional</option><option value="personal">Treino Personal</option></select></div>
                    </div>
                    <div class="form-group"><label>Status</label><select id="app-status" name="status"><option value="pending">Pendente</option><option value="confirmed">Confirmado</option><option value="cancelled">Cancelado</option></select></div>
                    <div class="form-group"><label>Unidade</label><input type="text" id="app-unit" name="unit" value="Central" readonly style="background:#eee;"></div>
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
            <div>
                <h1>Gestão de Alunas</h1>
                <p>Acompanhe o progresso e fichas de cada aluna.</p>
            </div>
            <button class="btn-admin-primary" onclick="handler.openCreateClientModal()">+ Novo Cliente</button>
        </div>
        
        <!-- BARRA DE BUSCA -->
        <div style="margin-bottom: 20px;">
            <input type="text" placeholder="🔍 Buscar cliente por nome ou email..." 
                   class="custom-select" 
                   onkeyup="handler.filterClients(this.value)" 
                   style="width: 100%; padding: 12px; font-size: 1rem; border-radius: 12px; border: 1px solid #e5e7eb;">
        </div>
        
        <div class="card" style="background:white; border-radius:12px; border:1px solid #e5e7eb; padding:0;">
             <div class="table-container">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th style="padding-left:24px;">Nome / Email</th>
                            <th>Status</th>
                            <th>Última Avaliação</th>
                            <th style="text-align:right; padding-right:24px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="clients-table-body">
                        <tr><td colspan="4" style="text-align:center; padding:30px;">Carregando clientes...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- MODAL NOVO CLIENTE -->
        <div id="modal-create-client" class="modal-overlay">
            <div class="modal-content">
                <div class="row-between" style="margin-bottom:20px;">
                    <h3>Cadastrar Novo Cliente</h3>
                    <button type="button" class="btn-icon-sm" onclick="document.getElementById('modal-create-client').classList.remove('active')">✕</button>
                </div>
                <form onsubmit="handler.handleCreateClient(event)">
                    <div class="form-group">
                        <label>Nome Completo</label>
                        <input type="text" name="full_name" required placeholder="Ex: Maria Silva">
                    </div>
                    <div class="form-group">
                        <label>E-mail (Login)</label>
                        <input type="email" name="email" required placeholder="email@exemplo.com">
                    </div>
                    <div class="form-group">
                        <label>Senha Provisória</label>
                        <input type="password" name="password" required minlength="6" placeholder="Mínimo 6 caracteres">
                    </div>
                    <div class="form-group">
                        <label>Unidade</label>
                        <select name="unit">
                            <option value="Central">Central</option>
                        </select>
                    </div>
                    <div style="background:#fdf2f8; padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.85rem; color:#831843;">
                        ⚠️ <strong>Atenção:</strong> Ao criar o cliente, o login será realizado automaticamente. Você precisará relogar como Admin em seguida, ou utilize uma janela anônima para testar o acesso do aluno.
                    </div>
                    <button type="submit" class="btn-primary" style="width:100%;">Criar Conta</button>
                </form>
            </div>
        </div>

        <!-- MODAL PRONTUÁRIO DA ALUNA (NOVO) -->
        <div id="modal-client-details" class="modal-overlay">
            <div class="modal-content" style="max-width: 800px; height: 90vh; display:flex; flex-direction:column; padding:0; overflow:hidden;">
                <!-- Header Modal -->
                <div style="padding:20px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; align-items:center; background:#f9fafb;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <div id="client-detail-avatar" style="width:50px; height:50px; background:var(--primary-color); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700;">U</div>
                        <div>
                            <h3 id="client-detail-name" style="margin:0; font-size:1.2rem;">Nome da Aluna</h3>
                            <p id="client-detail-email" style="margin:0; font-size:0.85rem; color:#666;">email@email.com</p>
                        </div>
                    </div>
                    <button type="button" class="btn-icon-sm" onclick="document.getElementById('modal-client-details').classList.remove('active')">✕</button>
                </div>

                <!-- Tabs do Prontuário -->
                <div style="padding: 15px 20px; background:white; border-bottom:1px solid #eee; display:flex; gap:20px;">
                    <button class="tab-link active" onclick="handler.switchClientTab('evolution')">Evolução & Gráficos</button>
                    <button class="tab-link" onclick="handler.switchClientTab('new-assessment')">Nova Avaliação</button>
                </div>

                <!-- Conteúdo Scrollável -->
                <div style="flex:1; overflow-y:auto; padding:25px; background:white;">
                    
                    <!-- TAB EVOLUÇÃO -->
                    <div id="tab-evolution" class="client-tab-content">
                        <!-- Stats Rápidos -->
                        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:15px; margin-bottom:30px;">
                            <div class="stat-box-small">
                                <span class="label">IMC Atual</span>
                                <strong id="val-imc" style="color:var(--primary-color); font-size:1.5rem;">--</strong>
                            </div>
                            <div class="stat-box-small">
                                <span class="label">Peso Atual</span>
                                <strong id="val-weight" style="font-size:1.5rem;">-- kg</strong>
                            </div>
                            <div class="stat-box-small">
                                <span class="label">Altura</span>
                                <strong id="val-height" style="font-size:1.5rem;">-- m</strong>
                            </div>
                        </div>

                        <h4 style="margin-bottom:15px;">Gráfico de Peso (Últimas avaliações)</h4>
                        <div class="chart-wrapper-admin" id="weight-chart-admin">
                            <!-- Barras CSS injetadas aqui -->
                            <p style="color:#999; text-align:center; padding:30px;">Sem dados suficientes para gráfico.</p>
                        </div>

                        <h4 style="margin-top:30px; margin-bottom:15px;">Histórico Detalhado</h4>
                        <table class="simple-table" style="width:100%; font-size:0.9rem;">
                            <thead>
                                <tr style="background:#f9fafb;">
                                    <th style="padding:10px; text-align:left;">Data</th>
                                    <th style="padding:10px;">Peso</th>
                                    <th style="padding:10px;">Cintura</th>
                                    <th style="padding:10px;">Quadril</th>
                                    <th style="padding:10px;">IMC</th>
                                </tr>
                            </thead>
                            <tbody id="history-table-body"></tbody>
                        </table>
                    </div>

                    <!-- TAB NOVA AVALIAÇÃO -->
                    <div id="tab-new-assessment" class="client-tab-content" style="display:none;">
                        <form onsubmit="handler.saveAssessment(event)">
                            <input type="hidden" id="assess-user-id">
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Peso (kg)</label>
                                    <input type="number" step="0.1" name="weight" required>
                                </div>
                                <div class="form-group">
                                    <label>Altura (m) - Ex: 1.65</label>
                                    <input type="number" step="0.01" name="height">
                                    <small style="color:#666;">Deixe em branco para manter a anterior.</small>
                                </div>
                            </div>
                            
                            <h4 style="margin:20px 0 10px 0; border-bottom:1px solid #eee; padding-bottom:5px;">Medidas (cm)</h4>
                            <div class="form-row">
                                <div class="form-group"><label>Busto</label><input type="number" step="0.5" name="meas_bust"></div>
                                <div class="form-group"><label>Cintura</label><input type="number" step="0.5" name="meas_waist"></div>
                                <div class="form-group"><label>Abdômen</label><input type="number" step="0.5" name="meas_abdomen"></div>
                            </div>
                            <div class="form-row">
                                <div class="form-group"><label>Quadril</label><input type="number" step="0.5" name="meas_hip"></div>
                                <div class="form-group"><label>Coxa Dir.</label><input type="number" step="0.5" name="meas_thigh_r"></div>
                                <div class="form-group"><label>Coxa Esq.</label><input type="number" step="0.5" name="meas_thigh_l"></div>
                            </div>
                            
                            <div class="form-group" style="margin-top:20px;">
                                <label>Notas / Observações</label>
                                <textarea name="notes" rows="3" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;"></textarea>
                            </div>

                            <button type="submit" class="btn-primary" style="width:100%; margin-top:20px; padding:12px;">Salvar Avaliação</button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    `,

    ManageWorkouts: () => `<div id="workouts-root"><div class="loader-spinner" style="margin: 50px auto;"></div></div>`,
    ManageDiet: () => `<div class="admin-page-header"><h1>Planos Alimentares</h1></div><p>Área da Nutricionista.</p><div id="diets-list">Em breve...</div>`
};