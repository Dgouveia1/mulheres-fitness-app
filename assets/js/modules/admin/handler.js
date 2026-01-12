import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';
import { Toast } from '../../core/toast.js';
import { supabase } from '../../core/supabase.js';

// ATUALIZADO: Importando do novo arquivo separado
import { AdminWorkoutHandler } from '../workouts/admin_handler.js';

export const AdminHandlers = {
    currentDate: new Date(),
    currentView: 'day', // 'day', 'week', 'month'
    currentFilter: 'all',
    videoCategories: [],

    init(path, user) {
        window.handler = this;
        
        if (path === '/admin') this.loadDashboard();
        if (path === '/admin/agenda') this.loadAgenda();
        if (path === '/admin/clientes') this.loadClients();
        if (path === '/admin/nutricao') this.loadDiet();
        if (path === '/admin/fitflix') this.loadFitFlixManager();
        
        // Inicializa o módulo de treinos
        if (path === '/admin/treinos') {
            if (AdminWorkoutHandler && typeof AdminWorkoutHandler.init === 'function') {
                AdminWorkoutHandler.init();
            } else {
                console.error("AdminWorkoutHandler não foi carregado corretamente.");
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
    },

    // --- FITFLIX MANAGER ---
    async loadFitFlixManager() {
        // 1. Carregar Categorias
        await this.loadCategories();

        // 2. Carregar Vídeos
        this.loadVideosList();
    },

    async loadCategories() {
        this.videoCategories = await Services.getFitFlixCategories();
        
        // Preencher selects (Upload e Edição)
        const selects = document.querySelectorAll('select[name="category"]');
        selects.forEach(select => {
            select.innerHTML = this.videoCategories.length 
                ? this.videoCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')
                : '<option value="" disabled>Crie uma categoria primeiro</option>';
        });

        // Preencher lista de gestão de categorias
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

    // --- Categorias CRUD ---
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

    // --- Vídeos Upload & Edit ---
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

    // --- AGENDA & CALENDAR LOGIC ---
    async loadAgenda() {
        this.renderCalendarHeader();
        await this.renderCalendarBody();
    },

    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderCalendarBody();
    },

    setView(view) {
        this.currentView = view;
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        this.loadAgenda();
    },

    changeDate(offset) {
        const d = new Date(this.currentDate);
        if (this.currentView === 'day') {
            d.setDate(d.getDate() + offset);
        } else if (this.currentView === 'week') {
            d.setDate(d.getDate() + (offset * 7));
        } else if (this.currentView === 'month') {
            d.setMonth(d.getMonth() + offset);
        }
        this.currentDate = d;
        this.loadAgenda();
    },

    // Ação ao clicar no dia do mês: ir para a visão diária daquele dia
    selectDateFromMonth(dateStr) {
        // Ajusta fuso horario para evitar pular dia ao converter string
        const [year, month, day] = dateStr.split('-').map(Number);
        this.currentDate = new Date(year, month - 1, day);
        this.setView('day');
    },

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
            // Apenas Mês e Ano
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
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // Buscar um range um pouco maior para garantir (ex: padding do calendario)
            startDate = new Date(year, month, 1).toISOString().split('T')[0];
            endDate = lastDay.toISOString().split('T')[0];
        }

        const allAppointments = await Services.getAppointments(startDate, endDate);
        
        // Filtro local
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
        const startingDay = firstDay.getDay(); // 0 = Dom
        
        let html = '<div class="month-header-row">';
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        days.forEach(d => html += `<div class="month-header-cell">${d}</div>`);
        html += '</div>';
        
        html += '<div class="month-body-grid">';
        
        // Células vazias antes do dia 1
        for (let i = 0; i < startingDay; i++) {
            html += '<div class="month-cell empty"></div>';
        }
        
        // Dias do mês
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

    // --- CRUD ---
    async openAppointment(id) {
        const modal = document.getElementById('modal-appointment');
        const form = document.getElementById('form-appointment');
        const delBtn = document.getElementById('btn-delete-app');
        form.reset();

        if (id) {
            // Fetch clean data to edit
            const { data } = await supabase.from('appointments').select('*').eq('id', id).single();
            
            if (data) {
                document.getElementById('app-id').value = data.id;
                document.getElementById('app-client').value = data.client_name;
                document.getElementById('app-phone').value = data.telefone || ''; // Preenche telefone
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
            // Novo
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
        const phone = formData.get('telefone'); // Pega telefone
        const clientName = formData.get('client_name');
        const durationMin = parseInt(formData.get('duration'));
        
        const durHours = Math.floor(durationMin / 60);
        const durMinsRem = durationMin % 60;
        const durationStr = `${durHours.toString().padStart(2,'0')}:${durMinsRem.toString().padStart(2,'0')}:00`;

        const payload = {
            client_name: clientName,
            telefone: phone, // Adiciona ao payload
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

            // --- Lógica WhatsApp ---
            if (phone) {
                const cleanPhone = phone.replace(/\D/g, ''); // Remove não dígitos
                if (cleanPhone.length >= 10) {
                    const dataFormatada = new Date(date + 'T' + time).toLocaleDateString('pt-BR');
                    const tipoFormatado = type === 'fisica' ? 'Avaliação Física' : (type === 'nutri' ? 'Nutricionista' : 'Personal');
                    
                    const message = `Olá ${clientName.split(' ')[0]}! Seu agendamento de *${tipoFormatado}* no Espaço Mulher está confirmado para dia *${dataFormatada}* às *${time}*.`;
                    
                    const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
                    
                    // Abre WhatsApp em nova aba
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

    async loadClients() {
        const list = document.getElementById('clients-table-body');
        if (list) list.innerHTML = '<tr><td colspan="4">Carregando clientes...</td></tr>';
        
        const { data } = await supabase.from('clients').select('*'); 
        if (data && data.length) {
            list.innerHTML = data.map(c => `
                <tr>
                    <td>${c.name}</td>
                    <td>${c.email || '-'} <br> ${c.phone || ''}</td>
                    <td><span class="status-badge active">Ativo</span></td>
                    <td><button onclick="alert('Funcionalidade em desenvolvimento')">✏️</button></td>
                </tr>
            `).join('');
        } else {
            list.innerHTML = '<tr><td colspan="4">Nenhum cliente cadastrado.</td></tr>';
        }
    },

    async loadWorkouts() {
         const list = document.getElementById('students-list-workouts');
         if (!list) return;
         list.innerHTML = '<div class="loader-spinner"></div>';
         
         const { data: users } = await supabase.from('profiles').select('*').eq('role', 'user');
         
         if (users) {
             list.innerHTML = users.map(u => `
                <div class="card action-card" onclick="AdminWorkoutHandler.loadTemplate('${u.id}')">
                    <div class="admin-avatar">${u.full_name.charAt(0)}</div>
                    <div>
                        <strong>${u.full_name}</strong>
                        <p style="font-size:0.8rem;color:#666;">${u.email}</p>
                    </div>
                </div>
             `).join('');
         }
    },
    
    async loadDiet() {}
};