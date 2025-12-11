// assets/js/pages.js
import { Services } from './services.js';
import { auth } from './auth.js';

// --- CONTROLADOR DE SESSÃO DE TREINO (Novo & Funcional) ---
const WorkoutSessionController = {
    currentWorkout: null,
    currentItemIndex: 0,
    currentSet: 1,
    timerInterval: null,
    
    // Abre o modal e configura o exercício inicial
    async open(workoutId, exerciseIndex = 0) {
        const { data: session } = await auth.getSession();
        if (!session.session) return alert('Faça login para treinar.');

        const workouts = await Services.getMyWorkouts(session.session.user.id);
        this.currentWorkout = workouts.find(w => w.id == workoutId);
        
        if (!this.currentWorkout) return alert('Treino não encontrado.');
        
        this.currentItemIndex = parseInt(exerciseIndex);
        this.currentSet = 1; // Reinicia a série ao abrir
        this.loadExerciseUI();
        
        document.getElementById('workout-modal').classList.add('active');
        
        // Bindings do Modal (Event Listeners)
        const actionBtn = document.getElementById('modal-action-btn');
        const skipBtn = document.getElementById('skip-timer-btn');
        const closeBtn = document.querySelector('.close-modal-btn');

        // Remove listeners antigos para evitar duplicação (cloneNode hack simples)
        const newActionBtn = actionBtn.cloneNode(true);
        actionBtn.parentNode.replaceChild(newActionBtn, actionBtn);
        newActionBtn.onclick = () => this.logSet();

        skipBtn.onclick = () => this.skipTimer();
        // Botão fechar apenas esconde o modal
        // closeBtn já tem onclick inline no HTML, mas podemos reforçar aqui se necessário
        
        // Configura inputs iniciais
        const item = this.currentWorkout.items[this.currentItemIndex];
        document.getElementById('input-load').value = item.suggested_load_kg || 0;
        document.getElementById('input-reps').value = item.reps || 10;
    },

    loadExerciseUI() {
        const item = this.currentWorkout.items[this.currentItemIndex];
        const exercise = item.exercise;
        
        // Textos
        document.getElementById('modal-ex-name').innerText = exercise.name;
        document.getElementById('modal-ex-muscle').innerText = exercise.muscle_group || 'Geral';
        document.getElementById('modal-meta-info').innerText = `${item.sets} Séries de ${item.reps} reps • Descanso: ${item.rest_seconds}s`;
        document.getElementById('modal-set-text').innerText = `Série ${this.currentSet} de ${item.sets}`;
        
        // Mídia (Imagem ou Vídeo)
        const mediaContainer = document.getElementById('modal-media');
        // Fallback de imagem
        const imgUrl = exercise.image_url || 'https://placehold.co/600x400?text=Exercicio';

        if (exercise.video_url) {
            mediaContainer.innerHTML = `<video src="${exercise.video_url}" autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;"></video>`;
        } else {
            mediaContainer.innerHTML = `<img src="${imgUrl}" style="width:100%;height:100%;object-fit:cover;">`;
        }

        // Bolinhas de Progresso das Séries
        const dotsContainer = document.getElementById('modal-dots');
        dotsContainer.innerHTML = '';
        for (let i = 1; i <= item.sets; i++) {
            const dot = document.createElement('div');
            dot.className = `set-dot ${i < this.currentSet ? 'completed' : ''} ${i === this.currentSet ? 'active' : ''}`;
            dotsContainer.appendChild(dot);
        }

        // Atualiza botão
        const btn = document.getElementById('modal-action-btn');
        if (this.currentSet > item.sets) {
             // Caso extra (embora nextExercise deva lidar com isso)
             btn.innerText = 'Próximo Exercício';
        } else if (this.currentSet === item.sets) {
             btn.innerText = 'Finalizar Exercício';
             btn.style.background = '#10b981';
        } else {
             btn.innerText = 'Concluir Série';
             btn.style.background = 'var(--primary-color)';
        }
    },

    async logSet() {
        const item = this.currentWorkout.items[this.currentItemIndex];
        const load = document.getElementById('input-load').value;
        const reps = document.getElementById('input-reps').value;
        
        // Salva o log no Supabase (Opcional: implementar feedback visual de salvamento)
        const { data: userSession } = await auth.getSession();
        if (userSession.session) {
            // Não esperamos o await aqui para não travar a UI (fire and forget)
            Services.logWorkoutSet({
                user_id: userSession.session.user.id,
                workout_id: this.currentWorkout.id,
                exercise_id: item.exercise.id,
                load_kg: load,
                reps_performed: reps
            });
        }

        // Lógica de Avanço
        if (this.currentSet < item.sets) {
            // Ainda tem séries neste exercício -> Inicia Descanso
            this.startTimer(item.rest_seconds);
            this.currentSet++;
        } else {
            // Acabou as séries deste exercício -> Vai para o próximo
            this.nextExercise();
        }
    },

    startTimer(seconds) {
        const overlay = document.querySelector('.timer-overlay');
        const display = document.getElementById('timer-countdown');
        let timeLeft = seconds;
        
        overlay.classList.add('active');
        display.innerText = timeLeft;
        
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            timeLeft--;
            display.innerText = timeLeft;
            if (timeLeft <= 0) this.skipTimer();
        }, 1000);
    },

    skipTimer() {
        clearInterval(this.timerInterval);
        document.querySelector('.timer-overlay').classList.remove('active');
        this.loadExerciseUI();
    },

    nextExercise() {
        // Verifica se há mais exercícios
        if (this.currentItemIndex < this.currentWorkout.items.length - 1) {
            this.currentItemIndex++;
            this.currentSet = 1;
            this.loadExerciseUI();
        } else {
            alert('Treino Concluído! Parabéns! 💪');
            document.getElementById('workout-modal').classList.remove('active');
            window.location.hash = '/'; // Volta pro dashboard
        }
    }
};

// --- CONTROLLER DO FITGRAN ---
const FitGranController = {
    currentUserId: null,
    activePostIdForComments: null,
    selectedFile: null, 
    videoStream: null,

    async init(userId) {
        this.currentUserId = userId;
        // Previne múltiplos listeners
        window.removeEventListener('fitgran-open-camera', this.openCustomCameraBind);
        this.openCustomCameraBind = () => this.openCustomCamera();
        window.addEventListener('fitgran-open-camera', this.openCustomCameraBind);
    },

    async openCustomCamera() {
        const modal = document.getElementById('custom-camera-modal');
        const video = document.getElementById('camera-feed');
        modal.classList.add('active');
        modal.style.display = 'flex'; // Força display flex

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' }, 
                audio: false 
            });
            this.videoStream = stream;
            video.srcObject = stream;
        } catch (err) {
            console.error("Erro na câmera:", err);
            alert("Não foi possível acessar a câmera. Use a galeria.");
            this.closeCustomCamera();
            this.triggerGallery();
        }
    },

    closeCustomCamera() {
        const modal = document.getElementById('custom-camera-modal');
        modal.classList.remove('active');
        modal.style.display = 'none';
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
    },

    capturePhoto() {
        const video = document.getElementById('camera-feed');
        if (!video.srcObject) return; // Previne erro se câmera não iniciou
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
            const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
            this.handleFileSelect({ target: { files: [file] } });
            this.closeCustomCamera();
        }, 'image/jpeg', 0.85);
    },

    triggerGallery() {
        document.getElementById('camera-input').click();
    },

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                const box = document.getElementById('img-preview-box');
                box.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:contain;">`;
                box.classList.remove('empty');
                this.closeCustomCamera(); 
                document.getElementById('new-post-modal').classList.add('active');
            };
            reader.readAsDataURL(file);
        }
    },

    closeNewPost() {
        document.getElementById('new-post-modal').classList.remove('active');
        document.getElementById('new-post-caption').value = '';
        document.getElementById('img-preview-box').innerHTML = '';
        document.getElementById('camera-input').value = ''; 
        this.selectedFile = null;
    },

    async submitPost() {
        if (!this.selectedFile) return alert('Nenhuma foto selecionada!');
        
        const caption = document.getElementById('new-post-caption').value;
        const btn = document.getElementById('submit-post-btn');

        btn.disabled = true;
        btn.innerText = 'Enviando...';

        const publicUrl = await Services.uploadPostImage(this.selectedFile, this.currentUserId);

        if (!publicUrl) {
            alert('Erro ao enviar imagem. Verifique sua conexão.');
            btn.disabled = false;
            return;
        }

        const { error } = await Services.createPost(this.currentUserId, publicUrl, caption);
        
        btn.disabled = false;
        btn.innerText = 'Compartilhar';

        if (error) {
            console.error(error);
            alert('Erro ao criar post.');
        } else {
            this.closeNewPost();
            PageHandlers.loadFitGran(); // Recarrega o feed
        }
    },

    async handleLike(postId, btnElement) {
        const isLiked = btnElement.classList.contains('liked');
        const iconSvg = btnElement.querySelector('svg');
        const likesCountEl = document.getElementById(`likes-count-${postId}`);
        
        if (isLiked) {
            btnElement.classList.remove('liked');
            iconSvg.style.fill = 'none';
            iconSvg.style.stroke = 'currentColor';
            if (likesCountEl) {
                let current = parseInt(likesCountEl.innerText) || 0;
                likesCountEl.innerText = `${Math.max(0, current - 1)} curtidas`;
            }
        } else {
            btnElement.classList.add('liked');
            iconSvg.style.fill = '#ed4956';
            iconSvg.style.stroke = '#ed4956';
            btnElement.style.transform = 'scale(1.2)';
            setTimeout(() => btnElement.style.transform = 'scale(1)', 200);
            if (likesCountEl) {
                let current = parseInt(likesCountEl.innerText) || 0;
                likesCountEl.innerText = `${current + 1} curtidas`;
            }
        }
        await Services.toggleLike(postId, this.currentUserId);
    },

    async handleDoubleTap(postId, container) {
        const heartOverlay = container.querySelector('.heart-overlay');
        const likeBtn = document.getElementById(`like-btn-${postId}`);
        heartOverlay.classList.remove('animate');
        void heartOverlay.offsetWidth; // Trigger reflow
        heartOverlay.classList.add('animate');
        if (!likeBtn.classList.contains('liked')) this.handleLike(postId, likeBtn);
    },

    async openComments(postId) {
        this.activePostIdForComments = postId;
        const modal = document.getElementById('comments-modal');
        const list = document.getElementById('comments-list');
        const loading = document.getElementById('comments-loading');
        
        modal.classList.add('active');
        list.innerHTML = '';
        loading.style.display = 'block';

        const comments = await Services.getComments(postId);
        loading.style.display = 'none';

        if (comments.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:#999; margin-top:20px;">Seja a primeira a comentar! 👇</p>';
        } else {
            list.innerHTML = comments.map(c => `
                <div class="comment-item">
                    <div class="user-avatar-small" style="width:32px; height:32px; min-width:32px; font-size:0.7rem;">
                        ${c.profiles?.avatar_url ? `<img src="${c.profiles.avatar_url}" style="width:100%;height:100%;border-radius:50%;">` : (c.profiles?.full_name?.charAt(0) || 'U')}
                    </div>
                    <div class="comment-text"><strong>${c.profiles?.full_name || 'Usuário'}</strong> ${c.content}</div>
                </div>`).join('');
        }
    },

    closeComments() { document.getElementById('comments-modal').classList.remove('active'); this.activePostIdForComments = null; },
    
    async postComment() {
        const input = document.getElementById('comment-input');
        const content = input.value.trim();
        if (!content || !this.activePostIdForComments) return;
        input.value = '';
        const list = document.getElementById('comments-list');
        if (list.innerHTML.includes('Seja a primeira')) list.innerHTML = '';
        list.insertAdjacentHTML('beforeend', `<div class="comment-item" style="opacity:0.5;"><div class="comment-text"><strong>Você</strong> ${content}</div></div>`);
        list.scrollTop = list.scrollHeight;
        const { data } = await Services.addComment(this.activePostIdForComments, this.currentUserId, content);
        if (data) list.lastElementChild.style.opacity = '1';
    }
};

// --- VIEWS ---
export const Pages = {
    Login: () => `<div class="auth-container"><div class="auth-card"><div class="auth-brand"><h1>Espaço</h1><span class="script">Mulher</span></div><form class="auth-form" id="login-form"><div class="form-group"><label>E-MAIL</label><input type="email" id="email" required></div><div class="form-group"><label>SENHA</label><input type="password" id="password" required></div><button type="submit" class="btn-primary">Entrar</button></form><div class="auth-links"><a href="/register" data-link>Criar minha conta</a></div></div></div>`,
    Register: () => `<div class="auth-container"><div class="auth-card"><div class="auth-brand"><h1>Junte-se ao</h1><span class="script">Espaço Mulher</span></div><form class="auth-form" id="register-form"><div class="form-group"><label>NOME COMPLETO</label><input type="text" id="full_name" required></div><div class="form-group"><label>E-MAIL</label><input type="email" id="email" required></div><div class="form-group"><label>SENHA</label><input type="password" id="password" required></div><button type="submit" class="btn-primary">Começar Agora</button></form><div class="auth-links"><a href="/login" data-link>Já tenho cadastro</a></div></div></div>`,
    Dashboard: (user) => `<div class="page-content"><header class="page-header" style="margin-bottom: 24px;"><h1 style="font-size: 1.5rem; color: #333;">Olá, <span style="color: var(--primary-color);">${user?.profile?.full_name?.split(' ')[0] || 'Aluna'}</span>!</h1></header><div class="dashboard-grid"><div class="card highlight-card"><div class="card-content"><h3>Treinos Concluídos</h3><p id="dash-stats">Carregando...</p></div></div><div class="section-title">Acesso Rápido</div><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;"><div class="card action-card" onclick="window.location.hash='/treinos'" style="flex-direction: column; text-align: center; padding: 20px;"><span class="icon" style="margin: 0 auto;">💪</span><div class="text"><h3>Treinar</h3></div></div><div class="card action-card" onclick="window.location.hash='/fitflix'" style="flex-direction: column; text-align: center; padding: 20px;"><span class="icon" style="margin: 0 auto;">🎬</span><div class="text"><h3>Aulas</h3></div></div></div><div class="card action-card" onclick="window.location.hash='/fitgran'" style="margin-top: 8px;"><span class="icon">📸</span><div class="text"><h3>Comunidade VIP</h3><p>Ver novidades</p></div></div></div></div>`,
    
    FitFlix: () => `<div class="page-content"><div class="hero-banner"><h2>FitClass</h2><p>Treine onde quiser</p></div><div class="section-title">Aulas Recentes</div><div id="video-list" class="video-grid"><div class="loader-spinner" style="margin: 20px auto;"></div></div></div>`,
    
    Player: () => `<div class="player-container" style="background: black; min-height: 100vh; display: flex; flex-direction: column;"><div class="player-header" style="padding: 16px;"><a href="/fitflix" class="back-btn" data-link style="color: white; display: flex; align-items: center; gap: 8px;"><span>✕</span> Fechar</a></div><div class="video-wrapper" id="video-wrapper" style="flex: 1; display: flex; align-items: center; justify-content: center;"><div class="loader-spinner"></div></div><div class="video-details" id="video-details" style="padding: 16px; background: #111; color: white;"></div></div>`,
    
    Workouts: () => `<div class="page-content"><h1>Meus Treinos 💪</h1><div id="workout-list" class="workout-list" style="margin-top: 20px;"><div class="loader-spinner" style="margin: 20px auto;"></div></div></div>
    <!-- MODAL DE TREINO DINÂMICO -->
    <div id="workout-modal" class="workout-modal-overlay">
        <div class="modal-header">
            <div style="flex: 1;"><h3 id="modal-ex-name">Nome</h3><span id="modal-ex-muscle" style="font-size:0.8rem;color:#666;">Músculo</span></div>
            <div class="close-modal-btn" onclick="document.getElementById('workout-modal').classList.remove('active')">✕</div>
        </div>
        <div style="padding: 0 1rem; margin-bottom: 10px;">
            <div id="modal-meta-info" style="background: #fdf2f8; color: var(--primary-dark); padding: 8px; border-radius: 8px; font-size: 0.85rem; text-align: center; border: 1px dashed var(--primary-light);">Meta...</div>
        </div>
        <div class="exercise-media-container" id="modal-media"></div>
        <div class="exercise-controls">
            <div class="series-tracker">
                <span id="modal-set-text">Série 1</span>
                <div id="modal-dots" style="display:flex;gap:4px;"></div>
            </div>
            <div class="control-row">
                <div class="control-box">
                    <label>Carga (kg)</label>
                    <div class="input-stepper">
                        <button onclick="document.getElementById('input-load').value--">-</button>
                        <input type="number" id="input-load">
                        <button onclick="document.getElementById('input-load').value++">+</button>
                    </div>
                </div>
                <div class="control-box">
                    <label>Reps</label>
                    <div class="input-stepper">
                        <button onclick="document.getElementById('input-reps').value--">-</button>
                        <input type="number" id="input-reps">
                        <button onclick="document.getElementById('input-reps').value++">+</button>
                    </div>
                </div>
            </div>
            <div style="flex:1; display:flex; align-items:end;">
                <button id="modal-action-btn" class="btn-large-action btn-start">Concluir Série</button>
            </div>
        </div>
        <div class="timer-overlay">
            <h2>Descanso</h2>
            <div class="timer-circle" id="timer-countdown">60</div>
            <button id="skip-timer-btn" class="btn-skip">Pular Descanso</button>
        </div>
    </div>`,

    Recipes: () => `<div class="page-content"><h1>Receitas 🥗</h1><p>Em breve...</p></div>`,
    Profile: (user) => `<div class="page-content"><div class="profile-header"><div class="avatar-large">${user?.profile?.avatar_url ? `<img src="${user.profile.avatar_url}">` : (user?.profile?.full_name?.charAt(0) || 'U')}</div><h2 style="font-size: 1.2rem; margin-top:10px;">${user?.profile?.full_name}</h2><p>${user?.email}</p></div><div class="profile-menu"><div class="menu-item logout" id="logout-btn-profile" style="padding: 16px; color: var(--error-color); cursor: pointer; text-align:center; font-weight:bold;">🚪 Sair da conta</div></div></div>`,
    AdminDashboard: () => `<div class="page-content"><h1>Admin 🛡️</h1></div>`,

    FitGran: () => `
        <div class="page-content bg-gray" style="padding-top: 10px;">
            <div id="feed-list" class="feed-container">
                 <div class="loader-spinner" style="border-color: var(--primary-color); border-top-color: transparent; margin: 40px auto;"></div>
            </div>
            <input type="file" id="camera-input" accept="image/*" style="display:none;">

            <div id="custom-camera-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:black; z-index:3000; display:none; flex-direction:column;">
                <video id="camera-feed" autoplay playsinline style="width:100%; height:100%; object-fit:cover;"></video>
                <div style="position:absolute; bottom:0; left:0; width:100%; padding:30px; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(to top, rgba(0,0,0,0.8), transparent);">
                    <button id="btn-gallery-trigger" style="background:rgba(255,255,255,0.2); width:50px; height:50px; border-radius:12px; border:none; color:white; font-size:1.5rem; backdrop-filter:blur(5px);">🖼️</button>
                    <button id="btn-capture-photo" style="width:80px; height:80px; border-radius:50%; background:white; border:4px solid rgba(0,0,0,0.1); box-shadow:0 0 0 4px white; cursor:pointer;"></button>
                    <button id="btn-close-camera" style="background:rgba(255,255,255,0.2); width:50px; height:50px; border-radius:50%; border:none; color:white; font-size:1.2rem; backdrop-filter:blur(5px);">✕</button>
                </div>
            </div>

            <div id="comments-modal" class="bottom-sheet-overlay">
                <div class="bottom-sheet">
                    <div class="sheet-header">Comentários<div style="position:absolute; right:15px; top:15px; cursor:pointer;" id="close-comments">✕</div></div>
                    <div class="sheet-content"><div id="comments-loading" style="text-align:center; padding:20px; display:none;">Carregando...</div><div id="comments-list" class="comment-list"></div></div>
                    <div class="comment-input-area"><input type="text" id="comment-input" placeholder="Comente..."><button id="post-comment-btn">Enviar</button></div>
                </div>
            </div>

            <div id="new-post-modal" class="bottom-sheet-overlay">
                <div class="bottom-sheet">
                    <div class="sheet-header">Nova Publicação<div style="position:absolute; right:15px; top:15px; cursor:pointer;" id="close-new-post">✕</div></div>
                    <div class="sheet-content new-post-form">
                        <div id="img-preview-box" class="image-preview empty"></div>
                        <textarea id="new-post-caption" rows="3" placeholder="Escreva uma legenda..." style="width:100%; padding:10px; margin-top:10px; border:1px solid #ddd; border-radius:8px; resize:none;"></textarea>
                        <button id="submit-post-btn" class="btn-primary" style="margin-top:10px;">Compartilhar</button>
                    </div>
                </div>
            </div>
        </div>
    `,
};

export const PageHandlers = {
    async loadDashboard() { const { data } = await auth.getSession(); if (data.session) { const stats = await Services.getDashboardStats(data.session.user.id); const el = document.getElementById('dash-stats'); if(el) el.innerText = `${stats.completedWorkouts} treinos`; } },
    
    async loadFitFlix() { 
        const videos = await Services.getVideos(); 
        const container = document.getElementById('video-list'); 
        if (!container) return; 
        
        container.innerHTML = videos.map(video => `
            <div class="video-card">
                <a href="/watch?id=${video.id}" data-link class="video-thumbnail" style="background-image: url('${video.thumbnail_url}'); display:block;">
                    <div class="play-icon">▶</div>
                </a>
                <div class="video-info"><h4>${video.title}</h4></div>
            </div>`).join(''); 
    },
    
    async loadPlayer() { 
        // CORREÇÃO: Lê o ID do Hash (ex: #/watch?id=1) ao invés do search global
        // Isso corrige o problema onde a URL vinha como "undefined" ou null
        const hashParts = window.location.hash.split('?');
        const params = new URLSearchParams(hashParts[1] || ''); 
        const id = params.get('id');

        if (!id) {
            alert('Vídeo não encontrado.');
            window.location.hash = '/fitflix';
            return;
        }

        const video = await Services.getVideoById(id); 
        
        if(video && document.getElementById('video-wrapper')) { 
            document.getElementById('video-wrapper').innerHTML = `
                <video controls autoplay width="100%" height="100%" poster="${video.thumbnail_url}">
                    <source src="${video.video_url}" type="video/mp4">
                    Seu navegador não suporta vídeos.
                </video>`;
            document.getElementById('video-details').innerHTML = `<h2>${video.title}</h2><p>${video.description || ''}</p>`;
        } 
    },

    loadWorkouts() { 
        auth.getSession().then(async ({data}) => { 
            if(!data.session) return; 
            const workouts = await Services.getMyWorkouts(data.session.user.id); 
            const container = document.getElementById('workout-list'); 
            if(!container) return; 
            
            if(!workouts.length) { 
                container.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px;color:#999;">📋<p>Sem treinos ainda.</p></div>`; 
                return; 
            } 
            
            container.innerHTML = workouts.map(workout => `
                <div class="workout-card" style="background:white; border-radius:16px; padding:16px; margin-bottom:16px; box-shadow:var(--shadow-sm);">
                    <div class="workout-header"><h3>${workout.title}</h3><span class="difficulty" style="background:#eee; padding:2px 8px; border-radius:4px; font-size:0.7rem;">${workout.difficulty_level || 'Geral'}</span></div>
                    <p style="margin-bottom:15px;color:#666; font-size:0.9rem;">${workout.description || 'Bom treino!'}</p>
                    <div class="exercise-list">
                        ${workout.items && workout.items.length ? workout.items.map((item, i) => `
                        <div class="exercise-item-clickable" data-workout-id="${workout.id}" data-index="${i}" style="display:flex;gap:10px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #f0f0f0;cursor:pointer;">
                            <div class="ex-img" style="width:50px;height:50px;background:#eee;border-radius:8px;background-image:url('${item.exercise?.image_url}');background-size:cover;display:flex;align-items:center;justify-content:center;">${item.exercise?.image_url?'':'💪'}</div>
                            <div class="ex-info" style="flex:1;">
                                <div style="font-weight:700;color:#333;">${item.exercise?.name}</div>
                                <div style="font-size:0.8rem;color:#666;">${item.sets} séries x ${item.reps}</div>
                            </div>
                            <div style="display:flex;align-items:center;color:var(--primary-color);">▶</div>
                        </div>`).join('') : '<p>Sem exercícios.</p>'}
                    </div>
                </div>`).join(''); 
            
            // CORREÇÃO: Liga o clique do exercício ao WorkoutSessionController
            container.querySelectorAll('.exercise-item-clickable').forEach(el => { 
                el.addEventListener('click', () => { 
                    WorkoutSessionController.open(el.dataset.workoutId, el.dataset.index);
                }); 
            }); 
        }); 
    },
    
    loadProfile() { const btn = document.getElementById('logout-btn-profile'); if(btn) btn.onclick = async () => { await auth.signOut(); window.location.hash = '/login'; }; },

    async loadFitGran() {
        const { data: sessionData } = await auth.getSession();
        const user = sessionData.session?.user;
        if (!user) return;

        FitGranController.init(user.id);
        
        // Event Listeners
        document.getElementById('btn-capture-photo').onclick = () => FitGranController.capturePhoto();
        document.getElementById('btn-close-camera').onclick = () => FitGranController.closeCustomCamera();
        document.getElementById('btn-gallery-trigger').onclick = () => FitGranController.triggerGallery();
        document.getElementById('camera-input').onchange = (e) => FitGranController.handleFileSelect(e);
        document.getElementById('close-new-post').onclick = () => FitGranController.closeNewPost();
        document.getElementById('submit-post-btn').onclick = () => FitGranController.submitPost();
        document.getElementById('close-comments').onclick = () => FitGranController.closeComments();
        document.getElementById('post-comment-btn').onclick = () => FitGranController.postComment();

        const posts = await Services.getPosts(user.id);
        const container = document.getElementById('feed-list');
        
        if (posts.length === 0) {
            container.innerHTML = '<p class="text-center" style="padding: 40px; color: #999;">Nenhum post ainda. Seja a primeira!</p>';
            return;
        }

        container.innerHTML = posts.map(post => {
            const isLikedClass = post.is_liked ? 'liked' : '';
            const fill = post.is_liked ? '#ed4956' : 'none';
            const stroke = post.is_liked ? '#ed4956' : 'currentColor';
            const isMyPost = post.user_id === user.id;

            return `
            <div class="feed-post" id="post-${post.id}">
                <div class="post-header">
                    <div class="post-header-user">
                        <div class="user-avatar-small">
                            ${post.profiles?.avatar_url ? `<img src="${post.profiles.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : (post.profiles?.full_name?.charAt(0) || 'U')}
                        </div>
                        <span class="username">${post.profiles?.full_name || 'Usuário'}</span>
                    </div>
                </div>
                <!-- CORREÇÃO: Adicionado onerror para imagens quebradas -->
                <div class="post-image-container double-tap-zone" data-id="${post.id}">
                    <img src="${post.image_url}" class="post-image" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/600x600?text=Imagem+Indisponível';">
                    <div class="heart-overlay">♥</div>
                </div>
                <div class="post-actions">
                    <button class="action-btn ${isLikedClass}" id="like-btn-${post.id}" data-id="${post.id}">
                        <svg aria-label="Curtir" height="24" viewBox="0 0 24 24" width="24" style="fill:${fill}; stroke:${stroke}; stroke-width:2;"><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.956-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z"></path></svg>
                    </button>
                    <button class="action-btn comment-btn" data-id="${post.id}">
                        <svg aria-label="Comentar" height="24" viewBox="0 0 24 24" width="24" style="fill:none; stroke:currentColor; stroke-width:2;"><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"></path></svg>
                    </button>
                </div>
                ${isMyPost ? `<div class="post-likes" id="likes-count-${post.id}">${post.likes_count || 0} curtidas</div>` : ''}
                <div class="post-caption"><strong>${post.profiles?.full_name?.split(' ')[0]}</strong> ${post.caption || ''}</div>
                <div class="view-comments" data-id="${post.id}">Ver comentários</div>
            </div>`;
        }).join('');

        // Listeners Feed
        container.querySelectorAll('.action-btn').forEach(btn => { if(btn.id.startsWith('like-btn')) btn.onclick = () => FitGranController.handleLike(btn.dataset.id, btn); });
        container.querySelectorAll('.comment-btn, .view-comments').forEach(btn => { btn.onclick = () => FitGranController.openComments(btn.dataset.id); });
        container.querySelectorAll('.double-tap-zone').forEach(zone => {
            let lastTap = 0;
            zone.addEventListener('click', (e) => {
                const currentTime = new Date().getTime();
                if (currentTime - lastTap < 300) FitGranController.handleDoubleTap(zone.dataset.id, zone);
                lastTap = currentTime;
            });
        });
    },
};