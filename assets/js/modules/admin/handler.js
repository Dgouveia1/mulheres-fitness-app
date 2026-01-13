import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';
import { Toast } from '../../core/toast.js';
import { supabase } from '../../core/supabase.js';
import { AdminWorkoutHandler } from '../workouts/admin_handler.js';

export const AdminHandlers = {
    currentDate: new Date(),
    currentView: 'day',
    currentFilter: 'all',
    videoCategories: [],
    
    // Cache de dados
    activeClientData: null,
    clientsCache: [], // Cache para busca local

    init(path, user) {
        window.handler = this;
        
        if (path === '/admin') this.loadDashboard();
        if (path === '/admin/agenda') this.loadAgenda();
        if (path === '/admin/clientes') this.loadClients();
        if (path === '/admin/nutricao') this.loadDiet();
        if (path === '/admin/fitflix') this.loadFitFlixManager();
        
        if (path === '/admin/treinos') {
            if (AdminWorkoutHandler && typeof AdminWorkoutHandler.init === 'function') {
                AdminWorkoutHandler.init();
            } else {
                Toast.error("Erro ao carregar módulo de treinos.");
            }
        }
    },

    // --- DASHBOARD ---
    async loadDashboard() {
        const today = new Date().toISOString().split('T')[0];
        const apps = await Services.getAppointments(today, today);
        const countToday = document.getElementById('dash-today-count');
        if (countToday) countToday.innerText = apps.length;
        const recentList = document.getElementById('dash-recent-list');
        if (recentList) {
            recentList.innerHTML = apps.length ? apps.slice(0, 5).map(app => `
                <div class="mini-appt-row">
                    <span class="dot status-${app.status}"></span>
                    <strong>${app.time.slice(0, 5)}</strong> - ${app.client_name} (${app.type})
                </div>
            `).join('') : '<p>Sem agendamentos hoje.</p>';
        }
        
        // Count clientes
        const clients = await Services.getClients();
        const countCli = document.getElementById('dash-clients-count');
        if(countCli) countCli.innerText = clients.length;
    },

    // =========================================================================
    // MÓDULO DE CLIENTES (Atualizado)
    // =========================================================================

    async loadClients() {
        const list = document.getElementById('clients-table-body');
        if (!list) return;
        
        list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px;">Carregando clientes...</td></tr>';
        
        // Carrega e guarda no cache
        this.clientsCache = await Services.getClients();
        
        this.renderClientsList(this.clientsCache);
    },

    renderClientsList(clients) {
        const list = document.getElementById('clients-table-body');
        if (!list) return;

        if (clients && clients.length > 0) {
            list.innerHTML = clients.map(c => `
                <tr onclick="handler.openClientDetails('${c.id}')" style="cursor:pointer; transition:background 0.2s;">
                    <td style="padding-left:24px;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div class="admin-avatar" style="width:36px; height:36px; font-size:0.9rem;">${c.full_name.charAt(0)}</div>
                            <div>
                                <strong style="display:block; color:#333;">${c.full_name}</strong>
                                <span style="font-size:0.8rem; color:#666;">${c.email || '-'}</span>
                            </div>
                        </div>
                    </td>
                    <td><span class="status-badge active">Ativa</span></td>
                    <td><span style="color:#666; font-size:0.9rem;">Ver detalhes</span></td>
                    <td style="text-align:right; padding-right:24px;">
                        <button class="btn-icon-sm" style="color:var(--primary-color);">➡️</button>
                    </td>
                </tr>
            `).join('');
        } else {
            list.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#999;">Nenhum cliente encontrado.</td></tr>';
        }
    },

    filterClients(term) {
        if (!term) {
            this.renderClientsList(this.clientsCache);
            return;
        }
        const lower = term.toLowerCase();
        const filtered = this.clientsCache.filter(c => 
            c.full_name.toLowerCase().includes(lower) || 
            (c.email && c.email.toLowerCase().includes(lower))
        );
        this.renderClientsList(filtered);
    },

    // --- NOVO CLIENTE ---
    openCreateClientModal() {
        document.getElementById('modal-create-client').classList.add('active');
    },

    async handleCreateClient(e) {
        e.preventDefault();
        const form = e.target;
        const btn = form.querySelector('button[type="submit"]');
        
        const fullName = form.full_name.value;
        const email = form.email.value;
        const password = form.password.value;
        const unit = form.unit.value;

        btn.disabled = true;
        btn.innerText = 'Criando...';

        try {
            // Chamada ao serviço de criação
            // Nota: Isso pode trocar a sessão atual para o novo usuário
            const { error } = await Services.createClientAccount(email, password, fullName, unit);

            if (error) throw error;

            Toast.success('Cliente criado com sucesso!');
            document.getElementById('modal-create-client').classList.remove('active');
            
            // Recarrega a lista
            await this.loadClients();
            
            // Verifica se a sessão mudou (comportamento padrão do Supabase Client)
            const { data } = await auth.getSession();
            if (data.session && data.session.user.email === email) {
                alert('O usuário foi criado e você foi logado automaticamente na conta dele. Por favor, faça logout e entre novamente como Admin.');
                await auth.signOut();
                window.location.reload();
            }

        } catch (err) {
            console.error(err);
            Toast.error('Erro ao criar: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = 'Criar Conta';
        }
    },

    async openClientDetails(userId) {
        // Reset Modal UI
        document.getElementById('modal-client-details').classList.add('active');
        document.getElementById('assess-user-id').value = userId;
        this.switchClientTab('evolution');

        // Load Basic Info
        const { data: user } = await Services.getClientDetails(userId);
        if (user) {
            document.getElementById('client-detail-name').innerText = user.full_name;
            document.getElementById('client-detail-email').innerText = user.email;
            document.getElementById('client-detail-avatar').innerText = user.full_name.charAt(0);
        }

        // Load Assessments
        this.loadClientAssessments(userId);
    },

    async loadClientAssessments(userId) {
        const historyBody = document.getElementById('history-table-body');
        if (!historyBody) return;
        
        historyBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Carregando...</td></tr>';
        
        const assessments = await Services.getAssessments(userId);
        this.activeClientData = assessments; // Cache

        // Render History Table
        if (!assessments || assessments.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#999;">Nenhuma avaliação registrada.</td></tr>';
            // Zera stats
            if(document.getElementById('val-imc')) document.getElementById('val-imc').innerText = '--';
            if(document.getElementById('val-weight')) document.getElementById('val-weight').innerText = '-- kg';
            if(document.getElementById('val-height')) document.getElementById('val-height').innerText = '-- m';
            if(document.getElementById('weight-chart-admin')) document.getElementById('weight-chart-admin').innerHTML = '<p style="color:#999; text-align:center; padding:30px;">Sem dados para gráfico.</p>';
            return;
        }

        historyBody.innerHTML = assessments.map(a => {
            const imc = (a.weight / (a.height * a.height)).toFixed(1);
            const date = new Date(a.created_at).toLocaleDateString('pt-BR');
            const waist = a.measurements?.waist || '-';
            const hip = a.measurements?.hip || '-';
            return `
                <tr style="border-bottom:1px solid #f0f0f0;">
                    <td style="padding:10px;">${date}</td>
                    <td style="padding:10px;"><strong>${a.weight} kg</strong></td>
                    <td style="padding:10px;">${waist}</td>
                    <td style="padding:10px;">${hip}</td>
                    <td style="padding:10px;"><span class="badge" style="background:${this.getImcColor(imc)}; color:white;">${imc}</span></td>
                </tr>
            `;
        }).join('');

        // Update Top Stats (Most Recent)
        const latest = assessments[0];
        const imcLatest = (latest.weight / (latest.height * latest.height)).toFixed(1);
        document.getElementById('val-imc').innerText = imcLatest;
        document.getElementById('val-imc').style.color = this.getImcColor(imcLatest);
        document.getElementById('val-weight').innerText = `${latest.weight} kg`;
        document.getElementById('val-height').innerText = `${latest.height} m`;

        // Render Chart
        this.renderEvolutionChart(assessments, 'weight-chart-admin');
    },

    switchClientTab(tabName) {
        document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.client-tab-content').forEach(c => c.style.display = 'none');
        
        // Ativa o botão clicado
        const btnIndex = tabName === 'evolution' ? 0 : 1;
        const tabs = document.querySelectorAll('.tab-link');
        if (tabs[btnIndex]) tabs[btnIndex].classList.add('active');
        
        const contentDiv = document.getElementById(`tab-${tabName}`);
        if(contentDiv) contentDiv.style.display = 'block';
    },

    async saveAssessment(e) {
        e.preventDefault();
        const form = e.target;
        const userId = document.getElementById('assess-user-id').value;
        const submitBtn = form.querySelector('button[type="submit"]');

        const weight = parseFloat(form.weight.value);
        let height = parseFloat(form.height.value);

        // Se altura não foi preenchida, tenta pegar da última avaliação
        if (!height && this.activeClientData && this.activeClientData.length > 0) {
            height = this.activeClientData[0].height;
        }

        if (!weight || !height) {
            Toast.warning('Peso e Altura são obrigatórios (ou histórico anterior de altura).');
            return;
        }

        const measurements = {
            bust: form.meas_bust.value,
            waist: form.meas_waist.value,
            abdomen: form.meas_abdomen.value,
            hip: form.meas_hip.value,
            thigh_r: form.meas_thigh_r.value,
            thigh_l: form.meas_thigh_l.value
        };

        const payload = {
            user_id: userId,
            weight: weight,
            height: height,
            measurements: measurements, 
            notes: form.notes.value
        };

        submitBtn.disabled = true;
        submitBtn.innerText = 'Salvando...';

        const { error } = await Services.createAssessment(payload);

        if (error) {
            Toast.error('Erro ao salvar: ' + error.message);
            console.error(error);
        } else {
            Toast.success('Avaliação registrada!');
            form.reset();
            this.switchClientTab('evolution'); // Volta para a tab de gráficos
            this.loadClientAssessments(userId); // Recarrega dados
        }
        submitBtn.disabled = false;
        submitBtn.innerText = 'Salvar Avaliação';
    },

    // --- CHART HELPER ---
    renderEvolutionChart(data, elementId) {
        const container = document.getElementById(elementId);
        if (!container) return;

        // Pega as últimas 10 avaliações e inverte para ordem cronológica (antigo -> novo)
        const chartData = data.slice(0, 10).reverse();
        if (chartData.length < 2) {
            container.innerHTML = '<p style="color:#999; text-align:center; padding:30px;">Precisa de pelo menos 2 avaliações para gerar gráfico.</p>';
            return;
        }

        const weights = chartData.map(d => d.weight);
        const minW = Math.min(...weights) - 2;
        const maxW = Math.max(...weights) + 2;
        const range = maxW - minW;

        const barsHTML = chartData.map(d => {
            // Normaliza altura da barra (0% a 100% dentro do range min-max visual)
            const heightPercent = ((d.weight - minW) / range) * 100;
            const date = new Date(d.created_at).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
            
            return `
                <div class="chart-bar-col">
                    <span class="chart-val">${d.weight}</span>
                    <div class="chart-bar" style="height: ${Math.max(10, heightPercent)}%;"></div>
                    <span class="chart-label">${date}</span>
                </div>
            `;
        }).join('');

        container.innerHTML = `<div class="css-chart-container">${barsHTML}</div>`;
    },

    getImcColor(imc) {
        if (imc < 18.5) return '#3b82f6'; // Abaixo (Azul)
        if (imc < 24.9) return '#10b981'; // Normal (Verde)
        if (imc < 29.9) return '#f59e0b'; // Sobrepeso (Laranja)
        return '#ef4444'; // Obesidade (Vermelho)
    },

    // --- Outras Funções do Admin Mantidas ---
    async loadFitFlixManager() {
        await this.loadCategories();
        this.loadVideosList();
    },
    async loadCategories() {
        this.videoCategories = await Services.getFitFlixCategories();
        const selects = document.querySelectorAll('select[name="category"]');
        selects.forEach(select => {
            select.innerHTML = this.videoCategories.length 
                ? this.videoCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')
                : '<option value="" disabled>Crie uma categoria primeiro</option>';
        });
        const listCat = document.getElementById('categories-list');
        if (listCat) {
            if (this.videoCategories.length === 0) {
                listCat.innerHTML = '<p style="font-size:0.9rem; color:#999;">Nenhuma categoria.</p>';
            } else {
                listCat.innerHTML = this.videoCategories.map(c => `
                    <div class="category-item-row" style="display:flex; justify-content:space-between; align-items:center; padding:8px; background:#f9fafb; border-radius:6px; margin-bottom:5px;">
                        <span>${c.name}</span>
                        <div style="display:flex; gap:5px;">
                            <button onclick="handler.editCategory(${c.id}, '${c.name}')" class="btn-icon-sm" title="Editar">✏️</button>
                            <button onclick="handler.deleteCategory(${c.id})" class="btn-icon-sm" title="Excluir" style="color:var(--error-color);">✕</button>
                        </div>
                    </div>
                `).join('');
            }
        }
    },
    async loadVideosList() {
        const list = document.getElementById('admin-video-list');
        if (!list) return;
        list.innerHTML = '<div class="loader-spinner" style="margin:20px auto;"></div>';
        const videos = await Services.getVideos();
        if (videos.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:#666;">Nenhum vídeo cadastrado.</p>';
            return;
        }
        list.innerHTML = videos.map(v => `
            <div style="display:flex; gap:15px; border-bottom:1px solid #f0f0f0; padding:10px 0; align-items:center;">
                <div style="width:80px; height:50px; background:#eee; border-radius:8px; overflow:hidden;">
                    <img src="${v.thumbnail_url}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="flex:1;">
                    <strong style="color:#333; display:block;">${v.title}</strong>
                    <span style="font-size:0.8rem; color:#666; background:#f9fafb; padding:2px 6px; border-radius:4px;">${v.category}</span>
                </div>
                <div style="display:flex; gap:8px;">
                     <button onclick="handler.openVideoEdit(${v.id})" style="color:var(--primary-color); background:none; border:1px solid var(--primary-light); padding:6px; border-radius:6px; cursor:pointer;" title="Editar">
                        <span class="material-icons" style="font-size:1.2rem;">edit</span>
                    </button>
                    <button onclick="handler.deleteFitFlixVideo(${v.id})" style="color:var(--error-color); background:none; border:1px solid #fee2e2; padding:6px; border-radius:6px; cursor:pointer;" title="Excluir">
                        <span class="material-icons" style="font-size:1.2rem;">delete</span>
                    </button>
                </div>
            </div>
        `).join('');
    },
    // ... (Mantendo métodos de FitFlix, Agenda e Categorias para compatibilidade)
    async handleCategorySubmit(e) {
        e.preventDefault();
        const input = document.getElementById('new-cat-name');
        const idInput = document.getElementById('edit-cat-id');
        const name = input.value.trim();
        const id = idInput.value;
        if (!name) return;
        let res;
        if (id) {
            res = await Services.updateFitFlixCategory(id, name);
        } else {
            res = await Services.createFitFlixCategory(name);
        }
        if (res.error) {
            Toast.error('Erro ao salvar categoria.');
        } else {
            Toast.success('Categoria salva!');
            input.value = '';
            idInput.value = '';
            document.getElementById('btn-save-cat').innerText = '+ Adicionar';
            document.getElementById('cancel-edit-cat').style.display = 'none';
            this.loadCategories();
        }
    },
    editCategory(id, name) {
        document.getElementById('new-cat-name').value = name;
        document.getElementById('edit-cat-id').value = id;
        document.getElementById('btn-save-cat').innerText = 'Salvar Alteração';
        document.getElementById('cancel-edit-cat').style.display = 'inline-block';
    },
    cancelCategoryEdit() {
        document.getElementById('new-cat-name').value = '';
        document.getElementById('edit-cat-id').value = '';
        document.getElementById('btn-save-cat').innerText = '+ Adicionar';
        document.getElementById('cancel-edit-cat').style.display = 'none';
    },
    async deleteCategory(id) {
        if(confirm('Tem certeza? Isso não apagará os vídeos, mas pode deixar eles sem categoria.')) {
            await Services.deleteFitFlixCategory(id);
            this.loadCategories();
        }
    },
    async handleVideoUpload(e) {
        e.preventDefault();
        const form = e.target;
        const btn = document.getElementById('btn-upload-video');
        const progressContainer = document.getElementById('upload-progress-container');
        const progressBar = document.getElementById('upload-progress-bar');
        const statusText = document.getElementById('upload-status-text');
        const title = form.title.value;
        const category = form.category.value;
        const description = form.description.value;
        const thumbnailFile = form.thumbnail.files[0];
        const videoFile = form.video.files[0];
        if (!thumbnailFile || !videoFile) {
            Toast.error('Selecione a capa e o vídeo.');
            return;
        }
        btn.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '10%';
        try {
            statusText.innerText = 'Enviando capa... (1/3)';
            const thumbnailUrl = await Services.uploadFitFlixFile(thumbnailFile, 'thumbnails');
            progressBar.style.width = '40%';
            statusText.innerText = 'Enviando vídeo... (isso pode demorar) (2/3)';
            const videoUrl = await Services.uploadFitFlixFile(videoFile, 'videos');
            progressBar.style.width = '90%';
            statusText.innerText = 'Salvando dados... (3/3)';
            const { error } = await Services.createVideo({
                title,
                category,
                description,
                thumbnail_url: thumbnailUrl,
                video_url: videoUrl,
                duration_minutes: 0
            });
            if (error) throw error;
            progressBar.style.width = '100%';
            Toast.success('Vídeo publicado com sucesso!');
            form.reset();
            progressContainer.style.display = 'none';
            this.loadVideosList();
        } catch (err) {
            console.error(err);
            Toast.error('Erro no upload: ' + err.message);
            progressContainer.style.display = 'none';
        } finally {
            btn.disabled = false;
            btn.innerText = 'Publicar Vídeo';
        }
    },
    async openVideoEdit(id) {
        const video = await Services.getVideoById(id);
        if (!video) return;
        document.getElementById('edit-video-id').value = video.id;
        document.getElementById('edit-video-title').value = video.title;
        document.getElementById('edit-video-desc').value = video.description || '';
        document.getElementById('edit-video-category').value = video.category;
        document.getElementById('modal-edit-video').classList.add('active');
    },
    async handleVideoUpdate(e) {
        e.preventDefault();
        const id = document.getElementById('edit-video-id').value;
        const title = document.getElementById('edit-video-title').value;
        const category = document.getElementById('edit-video-category').value;
        const description = document.getElementById('edit-video-desc').value;
        const { error } = await Services.updateVideo(id, { title, category, description });
        if (error) {
            Toast.error('Erro ao atualizar.');
        } else {
            Toast.success('Vídeo atualizado!');
            document.getElementById('modal-edit-video').classList.remove('active');
            this.loadVideosList();
        }
    },
    async deleteFitFlixVideo(id) {
        if (confirm('Tem certeza que deseja excluir este vídeo?')) {
            const { error } = await Services.deleteVideo(id);
            if (error) {
                Toast.error('Erro ao excluir.');
            } else {
                Toast.success('Vídeo removido.');
                this.loadVideosList();
            }
        }
    },
    async loadAgenda() { this.renderCalendarHeader(); await this.renderCalendarBody(); },
    setFilter(filter) { this.currentFilter = filter; document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter)); this.renderCalendarBody(); },
    setView(view) { this.currentView = view; document.querySelectorAll('.view-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view)); this.loadAgenda(); },
    changeDate(offset) { 
        const d = new Date(this.currentDate);
        if (this.currentView === 'day') d.setDate(d.getDate() + offset);
        else if (this.currentView === 'week') d.setDate(d.getDate() + (offset * 7));
        else if (this.currentView === 'month') d.setMonth(d.getMonth() + offset);
        this.currentDate = d;
        this.loadAgenda();
    },
    selectDateFromMonth(dateStr) { const [year, month, day] = dateStr.split('-').map(Number); this.currentDate = new Date(year, month - 1, day); this.setView('day'); },
    renderCalendarHeader() {
        const dateEl = document.getElementById('cal-current-date');
        if (!dateEl) return;
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        if (this.currentView === 'day') {
            dateEl.innerText = this.currentDate.toLocaleDateString('pt-BR', { weekday: 'long', ...options });
        } else if (this.currentView === 'week') {
            const start = this.getStartOfWeek(this.currentDate);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            dateEl.innerText = `${start.getDate()} a ${end.toLocaleDateString('pt-BR', options)}`;
        } else if (this.currentView === 'month') {
            const monthName = this.currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            dateEl.innerText = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        }
    },
    async renderCalendarBody() {
        const grid = document.getElementById('calendar-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="loader-spinner" style="margin:50px auto"></div>';
        let startDate, endDate;
        if (this.currentView === 'day') {
            const dateStr = this.currentDate.toISOString().split('T')[0];
            startDate = dateStr;
            endDate = dateStr;
        } else if (this.currentView === 'week') {
            const start = this.getStartOfWeek(this.currentDate);
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            startDate = start.toISOString().split('T')[0];
            endDate = end.toISOString().split('T')[0];
        } else if (this.currentView === 'month') {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            const lastDay = new Date(year, month + 1, 0);
            startDate = new Date(year, month, 1).toISOString().split('T')[0];
            endDate = lastDay.toISOString().split('T')[0];
        }
        const allAppointments = await Services.getAppointments(startDate, endDate);
        const filteredApps = this.currentFilter === 'all' 
            ? allAppointments 
            : allAppointments.filter(a => a.type === this.currentFilter);
        if (this.currentView === 'day') {
            this.renderDayGrid(grid, filteredApps);
        } else if (this.currentView === 'week') {
            this.renderWeekGrid(grid, filteredApps, startDate);
        } else if (this.currentView === 'month') {
            this.renderMonthGrid(grid, filteredApps);
        }
    },
    processOverlaps(appointments) {
        const events = appointments.map(app => {
            const [h, m] = app.time.split(':').map(Number);
            const startMin = h * 60 + m;
            let durationMin = 60; 
            if (app.duration) {
                 if (typeof app.duration === 'string' && app.duration.includes(':')) {
                     const [dh, dm] = app.duration.split(':').map(Number);
                     durationMin = (dh * 60) + dm;
                 } else if (typeof app.duration === 'number') {
                     durationMin = app.duration;
                 }
            }
            return {
                ...app,
                startMin,
                endMin: startMin + durationMin,
                durationMin
            };
        }).sort((a, b) => a.startMin - b.startMin);
        const lanes = [];
        events.forEach(event => {
            let placed = false;
            for (let i = 0; i < lanes.length; i++) {
                const lane = lanes[i];
                const lastEventInLane = lane[lane.length - 1];
                if (event.startMin >= lastEventInLane.endMin) {
                    lane.push(event);
                    placed = true;
                    event.laneIndex = i;
                    break;
                }
            }
            if (!placed) {
                lanes.push([event]);
                event.laneIndex = lanes.length - 1;
            }
        });
        const totalLanes = lanes.length > 0 ? lanes.length : 1;
        events.forEach(event => {
            event.width = 100 / totalLanes;
            event.left = event.laneIndex * event.width;
        });
        return events;
    },
    renderDayGrid(container, appointments) {
        const START_HOUR = 6;
        const END_HOUR = 22; 
        const PIXELS_PER_HOUR = 60; 
        let html = '<div class="day-view-container" style="height: 1020px;">'; 
        for (let h = START_HOUR; h <= END_HOUR; h++) {
            const top = (h - START_HOUR) * PIXELS_PER_HOUR;
            html += `
                <div class="time-slot full-hour" style="top:${top}px;" data-time="${h}:00"></div>
                <div class="time-slot half-hour" style="top:${top + 30}px;"></div>
            `;
        }
        const processedEvents = this.processOverlaps(appointments);
        processedEvents.forEach(evt => {
            const top = (evt.startMin - (START_HOUR * 60)) * (PIXELS_PER_HOUR / 60);
            const height = evt.durationMin * (PIXELS_PER_HOUR / 60);
            html += `
                <div class="appt-card type-${evt.type} status-${evt.status}" 
                     style="top: ${top}px; height: ${height}px; left: calc(60px + ${evt.left}% - 10px); width: calc(${evt.width}% - 10px);"
                     onclick="handler.openAppointment(${evt.id})">
                    <div class="appt-time">${evt.time.slice(0,5)}</div>
                    <strong>${evt.client_name}</strong>
                    <div class="appt-type">${evt.type === 'fisica' ? 'Avaliação' : (evt.type === 'nutri' ? 'Nutri' : 'Personal')}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    },
    renderWeekGrid(container, appointments, startDateStr) {
        const startOfWeek = new Date(startDateStr + 'T00:00:00');
        const START_HOUR = 6;
        const END_HOUR = 22;
        const PIXELS_PER_HOUR = 50; 
        let header = '<div class="cal-header-row" style="padding-left: 50px;">';
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        for(let i=0; i<7; i++) {
            let d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            let isToday = new Date().toDateString() === d.toDateString();
            header += `<div class="cal-header-cell ${isToday ? 'today' : ''}">${days[d.getDay()]} ${d.getDate()}</div>`;
        }
        header += '</div>';
        let body = '<div class="week-body-scroll" style="position:relative; height: 600px; overflow-y:auto;">';
        body += '<div class="time-labels-col">';
        for (let h = START_HOUR; h <= END_HOUR; h++) {
            body += `<div class="week-time-label" style="height:${PIXELS_PER_HOUR}px">${h}:00</div>`;
        }
        body += '</div>';
        body += '<div class="week-cols-container">';
        for(let i=0; i<7; i++) {
            let d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            const dayApps = appointments.filter(a => a.date === dateStr);
            const processed = this.processOverlaps(dayApps);
            body += `<div class="week-col">`;
                for (let h = START_HOUR; h <= END_HOUR; h++) {
                     body += `<div class="week-cell-grid" style="height:${PIXELS_PER_HOUR}px; border-bottom:1px solid #f5f5f5;"></div>`;
                }
                processed.forEach(evt => {
                    const top = (evt.startMin - (START_HOUR * 60)) * (PIXELS_PER_HOUR / 60);
                    const height = evt.durationMin * (PIXELS_PER_HOUR / 60);
                    body += `
                        <div class="appt-card compact type-${evt.type}" 
                            style="top: ${top}px; height: ${height}px; left: ${evt.left}%; width: ${evt.width}%;"
                            onclick="handler.openAppointment(${evt.id})">
                            <small>${evt.time.slice(0,5)}</small>
                            <strong>${evt.client_name.split(' ')[0]}</strong>
                        </div>
                    `;
                });
            body += `</div>`;
        }
        body += '</div></div>'; 
        container.innerHTML = header + body;
    },
    renderMonthGrid(container, appointments) {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay(); 
        let html = '<div class="month-header-row">';
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        days.forEach(d => html += `<div class="month-header-cell">${d}</div>`);
        html += '</div>';
        html += '<div class="month-body-grid">';
        for (let i = 0; i < startingDay; i++) {
            html += '<div class="month-cell empty"></div>';
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const dayApps = appointments.filter(a => a.date === dateStr);
            const isToday = (new Date().toDateString() === new Date(year, month, day).toDateString());
            html += `<div class="month-cell ${isToday ? 'today' : ''}" onclick="handler.selectDateFromMonth('${dateStr}')">
                <div class="month-date-number">${day}</div>
                <div class="month-events-list">
                    ${dayApps.slice(0, 3).map(app => `
                        <div class="month-event-dot type-${app.type}" title="${app.time} - ${app.client_name}">
                            ${app.time.slice(0,5)} ${app.client_name.split(' ')[0]}
                        </div>
                    `).join('')}
                    ${dayApps.length > 3 ? `<div class="month-more">+${dayApps.length - 3}</div>` : ''}
                </div>
            </div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    },
    getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    },
    async openAppointment(id) {
        const modal = document.getElementById('modal-appointment');
        const form = document.getElementById('form-appointment');
        const delBtn = document.getElementById('btn-delete-app');
        form.reset();
        if (id) {
            const { data } = await supabase.from('appointments').select('*').eq('id', id).single();
            if (data) {
                document.getElementById('app-id').value = data.id;
                document.getElementById('app-client').value = data.client_name;
                document.getElementById('app-phone').value = data.telefone || ''; 
                document.getElementById('app-date').value = data.date;
                document.getElementById('app-time').value = data.time.slice(0,5);
                document.getElementById('app-type').value = data.type;
                document.getElementById('app-status').value = data.status || 'pending';
                document.getElementById('app-unit').value = data.unit;
                let dur = 60;
                if(data.duration && typeof data.duration === 'string') {
                    const parts = data.duration.split(':');
                    dur = parseInt(parts[0])*60 + parseInt(parts[1]);
                }
                document.getElementById('app-duration').value = dur;
                if (delBtn) delBtn.style.display = 'block';
            }
        } else {
            document.getElementById('app-id').value = '';
            document.getElementById('app-date').value = this.currentDate.toISOString().split('T')[0];
            document.getElementById('app-time').value = '09:00';
            if (delBtn) delBtn.style.display = 'none';
        }
        modal.classList.add('active');
    },
    async saveAppointment(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const idVal = document.getElementById('app-id').value;
        const date = formData.get('date');
        const time = formData.get('time');
        const type = formData.get('type');
        const phone = formData.get('telefone'); 
        const clientName = formData.get('client_name');
        const durationMin = parseInt(formData.get('duration'));
        const durHours = Math.floor(durationMin / 60);
        const durMinsRem = durationMin % 60;
        const durationStr = `${durHours.toString().padStart(2,'0')}:${durMinsRem.toString().padStart(2,'0')}:00`;
        const payload = {
            client_name: clientName,
            telefone: phone, 
            date: date,
            time: time,
            type: type,
            status: formData.get('status'),
            unit: 'Central',
            duration: durationStr
        };
        const isAvailable = await Services.checkAppointmentAvailability(date, time, type, idVal ? idVal : null);
        if (!isAvailable) {
            Toast.error(`Conflito: Já existe um agendamento de ${type === 'fisica' ? 'Avaliação' : type} neste horário!`);
            return;
        }
        let result;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Salvando...';
        try {
            if (idVal) {
                result = await Services.updateAppointment(idVal, payload);
            } else {
                result = await Services.createAppointment(payload);
            }
            if (result.error) throw result.error;
            Toast.success('Agendamento salvo!');
            document.getElementById('modal-appointment').classList.remove('active');
            this.loadAgenda();
            if (phone) {
                const cleanPhone = phone.replace(/\D/g, ''); 
                if (cleanPhone.length >= 10) {
                    const dataFormatada = new Date(date + 'T' + time).toLocaleDateString('pt-BR');
                    const tipoFormatado = type === 'fisica' ? 'Avaliação Física' : (type === 'nutri' ? 'Nutricionista' : 'Personal');
                    const message = `Olá ${clientName.split(' ')[0]}! Seu agendamento de *${tipoFormatado}* no Espaço Mulher Fitness Unidade 1 está confirmado para dia *${dataFormatada}* às *${time}*.`;
                    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
                    window.open(waLink, '_blank');
                }
            }
        } catch (err) {
            console.error(err);
            Toast.error('Erro ao salvar: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Salvar e Enviar';
        }
    },
    async deleteAppointment() {
        const id = document.getElementById('app-id').value;
        if (!id) return;
        if (confirm('Tem certeza que deseja excluir este agendamento?')) {
            const { error } = await Services.deleteAppointment(id);
            if (error) {
                Toast.error('Erro ao excluir.');
            } else {
                Toast.success('Excluído com sucesso.');
                document.getElementById('modal-appointment').classList.remove('active');
                this.loadAgenda();
            }
        }
    },
    async loadDiet() {}
};