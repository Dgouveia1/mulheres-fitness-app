// assets/js/pages.js
import { Services } from './services.js';
import { auth } from './auth.js';

// --- CONTROLLER DO FITGRAN (Atualizado com Câmera Customizada) ---
const FitGranController = {
    currentUserId: null,
    activePostIdForComments: null,
    selectedFile: null, 
    videoStream: null,

    async init(userId) {
        this.currentUserId = userId;
        
        // Listener Global para o botão central (+) do Router
        window.addEventListener('fitgran-open-camera', () => {
            this.openCustomCamera();
        });
    },

    // --- CÂMERA CUSTOMIZADA ---
    async openCustomCamera() {
        const modal = document.getElementById('custom-camera-modal');
        const video = document.getElementById('camera-feed');
        modal.classList.add('active');

        try {
            // Tenta abrir câmera traseira
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' }, 
                audio: false 
            });
            this.videoStream = stream;
            video.srcObject = stream;
        } catch (err) {
            console.error("Erro na câmera:", err);
            alert("Não foi possível acessar a câmera. Você pode usar a galeria.");
        }
    },

    closeCustomCamera() {
        const modal = document.getElementById('custom-camera-modal');
        modal.classList.remove('active');
        
        // Parar o stream da câmera para economizar bateria
        if (this.videoStream) {
            this.videoStream.getTracks().forEach(track => track.stop());
            this.videoStream = null;
        }
    },

    capturePhoto() {
        const video = document.getElementById('camera-feed');
        const canvas = document.createElement('canvas');
        
        // Configura o canvas com o tamanho do vídeo
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Desenha o frame atual
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Converte para Blob (arquivo)
        canvas.toBlob((blob) => {
            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
            this.handleFileSelect({ target: { files: [file] } }); // Reusa a lógica existente
            this.closeCustomCamera();
        }, 'image/jpeg', 0.85);
    },

    triggerGallery() {
        document.getElementById('camera-input').click();
    },

    // --- LÓGICA DE POSTAGEM (Mantida e Adaptada) ---
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            
            // Preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const box = document.getElementById('img-preview-box');
                box.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:contain;">`;
                box.classList.remove('empty');
                
                // Abre o modal de legenda (depois da foto escolhida)
                // Se a câmera estiver aberta, fecha ela antes
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
            alert('Erro ao enviar imagem.');
            btn.disabled = false;
            return;
        }

        const { error } = await Services.createPost(this.currentUserId, publicUrl, caption);
        
        btn.disabled = false;
        btn.innerText = 'Compartilhar';

        if (error) {
            alert('Erro ao criar post.');
        } else {
            this.closeNewPost();
            PageHandlers.loadFitGran(); 
        }
    },

    // ... (Métodos de Like, DoubleTap e Comments mantidos iguais aos anteriores) ...
    async handleLike(postId, btnElement) { /* ... lógica igual ... */
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
        void heartOverlay.offsetWidth;
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
    },

    // Trigger para botão flutuante (caso exista como fallback)
    triggerCameraInput() { document.getElementById('camera-input').click(); }
};

// --- VIEWS ---
export const Pages = {
    Login: () => `<div class="auth-container"><div class="auth-card"><div class="auth-brand"><h1>Espaço</h1><span class="script">Mulher</span></div><form class="auth-form" id="login-form"><div class="form-group"><label>E-MAIL</label><input type="email" id="email" required></div><div class="form-group"><label>SENHA</label><input type="password" id="password" required></div><button type="submit" class="btn-primary">Entrar</button></form><div class="auth-links"><a href="/register" data-link>Criar minha conta</a></div></div></div>`,
    Register: () => `<div class="auth-container"><div class="auth-card"><div class="auth-brand"><h1>Junte-se ao</h1><span class="script">Espaço Mulher</span></div><form class="auth-form" id="register-form"><div class="form-group"><label>NOME COMPLETO</label><input type="text" id="full_name" required></div><div class="form-group"><label>E-MAIL</label><input type="email" id="email" required></div><div class="form-group"><label>SENHA</label><input type="password" id="password" required></div><button type="submit" class="btn-primary">Começar Agora</button></form><div class="auth-links"><a href="/login" data-link>Já tenho cadastro</a></div></div></div>`,
    Dashboard: (user) => `<div class="page-content"><header class="page-header" style="margin-bottom: 24px;"><h1 style="font-size: 1.5rem; color: #333;">Olá, <span style="color: var(--primary-color);">${user?.profile?.full_name?.split(' ')[0] || 'Aluna'}</span>!</h1></header><div class="dashboard-grid"><div class="card highlight-card"><div class="card-content"><h3>Treinos Concluídos</h3><p id="dash-stats">Carregando...</p></div></div><div class="section-title">Acesso Rápido</div><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;"><div class="card action-card" onclick="window.location.href='/treinos'" style="flex-direction: column; text-align: center; padding: 20px;"><span class="icon" style="margin: 0 auto;">💪</span><div class="text"><h3>Treinar</h3></div></div><div class="card action-card" onclick="window.location.href='/fitflix'" style="flex-direction: column; text-align: center; padding: 20px;"><span class="icon" style="margin: 0 auto;">🎬</span><div class="text"><h3>Aulas</h3></div></div></div><div class="card action-card" onclick="window.location.href='/fitgran'" style="margin-top: 8px;"><span class="icon">📸</span><div class="text"><h3>Comunidade VIP</h3><p>Ver novidades</p></div></div></div></div>`,
    
    FitFlix: () => `<div class="page-content"><div class="hero-banner"><h2>FitClass</h2><p>Treine onde quiser</p></div><div class="section-title">Aulas Recentes</div><div id="video-list" class="video-grid"><div class="loader-spinner" style="margin: 20px auto;"></div></div></div>`,
    Player: () => `<div class="player-container" style="background: black; min-height: 100vh; display: flex; flex-direction: column;"><div class="player-header" style="padding: 16px;"><a href="/fitflix" class="back-btn" data-link style="color: white; display: flex; align-items: center; gap: 8px;"><span>✕</span> Fechar</a></div><div class="video-wrapper" id="video-wrapper" style="flex: 1; display: flex; align-items: center; justify-content: center;"><div class="loader-spinner"></div></div><div class="video-details" id="video-details" style="padding: 16px; background: #111; color: white;"></div></div>`,
    Workouts: () => `<div class="page-content"><h1>Meus Treinos 💪</h1><div id="workout-list" class="workout-list" style="margin-top: 20px;"><div class="loader-spinner" style="margin: 20px auto;"></div></div></div><div id="workout-modal" class="workout-modal-overlay"><div class="modal-header"><div style="flex: 1;"><h3 id="modal-ex-name">Nome</h3><span id="modal-ex-muscle">Músculo</span></div><div class="close-modal-btn" onclick="document.getElementById('workout-modal').classList.remove('active')">✕</div></div><div style="padding: 0 1rem; margin-bottom: 10px;"><div id="modal-meta-info" style="background: #fdf2f8; color: var(--primary-dark); padding: 8px; border-radius: 8px; font-size: 0.85rem; text-align: center; border: 1px dashed var(--primary-light);">Meta...</div></div><div class="exercise-media-container" id="modal-media"></div><div class="exercise-controls"><div class="series-tracker"><span id="modal-set-text">Série 1</span><div id="modal-dots"></div></div><div class="control-row"><div class="control-box"><label>Carga</label><div class="input-stepper"><button onclick="document.getElementById('input-load').value--">-</button><input type="number" id="input-load"><button onclick="document.getElementById('input-load').value++">+</button></div></div><div class="control-box"><label>Reps</label><div class="input-stepper"><button onclick="document.getElementById('input-reps').value--">-</button><input type="number" id="input-reps"><button onclick="document.getElementById('input-reps').value++">+</button></div></div></div><div style="flex:1; display:flex; align-items:end;"><button id="modal-action-btn">Iniciar</button></div></div><div class="timer-overlay"><h2>Descanso</h2><div class="timer-circle" id="timer-countdown">60</div><button id="skip-timer-btn" class="btn-skip">Pular</button></div></div>`,
    Recipes: () => `<div class="page-content"><h1>Receitas 🥗</h1><p>Em breve...</p></div>`,
    Profile: (user) => `<div class="page-content"><div class="profile-header"><div class="avatar-large">${user?.profile?.avatar_url ? `<img src="${user.profile.avatar_url}">` : (user?.profile?.full_name?.charAt(0) || 'U')}</div><h2 style="font-size: 1.2rem; margin-top:10px;">${user?.profile?.full_name}</h2><p>${user?.email}</p></div><div class="profile-menu"><div class="menu-item logout" id="logout-btn-profile" style="padding: 16px; color: var(--error-color); cursor: pointer;">🚪 Sair da conta</div></div></div>`,
    AdminDashboard: () => `<div class="page-content"><h1>Admin 🛡️</h1></div>`,

    // --- VIEW DO FITGRAN (ATUALIZADA) ---
    FitGran: () => `
        <div class="page-content bg-gray" style="padding-top: 10px;">
            <div id="feed-list" class="feed-container">
                 <div class="loader-spinner" style="border-color: var(--primary-color); border-top-color: transparent; margin: 40px auto;"></div>
            </div>

            <!-- Input invisível para galeria (fallback) -->
            <input type="file" id="camera-input" accept="image/*" style="display:none;">

            <!-- MODAL DE CÂMERA CUSTOMIZADA (Imersivo) -->
            <div id="custom-camera-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:black; z-index:3000; display:none; flex-direction:column;">
                
                <!-- Vídeo Feed -->
                <video id="camera-feed" autoplay playsinline style="width:100%; height:100%; object-fit:cover;"></video>
                
                <!-- Overlay de Texto (Incentivo) -->
                <div style="position:absolute; top:20%; width:100%; text-align:center; color:white; padding:0 20px; text-shadow:0 2px 4px rgba(0,0,0,0.5);">
                    <h2 style="font-family:var(--font-script); font-size:2.5rem; margin-bottom:10px;">#SemFiltros</h2>
                    <p style="font-size:1rem; opacity:0.9;">Ser você é sua melhor qualidade</p>
                </div>

                <!-- Controles da Câmera -->
                <div style="position:absolute; bottom:0; left:0; width:100%; padding:30px; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(to top, rgba(0,0,0,0.8), transparent);">
                    <!-- Galeria -->
                    <button id="btn-gallery-trigger" style="background:rgba(255,255,255,0.2); width:50px; height:50px; border-radius:12px; border:none; color:white; font-size:1.5rem; backdrop-filter:blur(5px);">🖼️</button>
                    
                    <!-- Botão de Captura -->
                    <button id="btn-capture-photo" style="width:80px; height:80px; border-radius:50%; background:white; border:4px solid rgba(0,0,0,0.1); box-shadow:0 0 0 4px white; cursor:pointer; transition:transform 0.1s;"></button>
                    
                    <!-- Fechar -->
                    <button id="btn-close-camera" style="background:rgba(255,255,255,0.2); width:50px; height:50px; border-radius:50%; border:none; color:white; font-size:1.2rem; backdrop-filter:blur(5px);">✕</button>
                </div>
            </div>

            <!-- MODAL DE COMENTÁRIOS -->
            <div id="comments-modal" class="bottom-sheet-overlay">
                <div class="bottom-sheet">
                    <div class="sheet-header">
                        <div class="sheet-drag-handle"></div>
                        Comentários
                        <div style="position:absolute; right:15px; top:15px; cursor:pointer;" id="close-comments">✕</div>
                    </div>
                    <div class="sheet-content">
                        <div id="comments-loading" style="text-align:center; padding:20px; display:none;">Carregando...</div>
                        <div id="comments-list" class="comment-list"></div>
                    </div>
                    <div class="comment-input-area">
                        <div class="user-avatar-small" style="width:32px; height:32px; font-size:0.7rem;">Eu</div>
                        <input type="text" id="comment-input" placeholder="Adicione um comentário...">
                        <button id="post-comment-btn">Publicar</button>
                    </div>
                </div>
            </div>

            <!-- MODAL DE NOVO POST (CONFIRMAÇÃO) -->
            <div id="new-post-modal" class="bottom-sheet-overlay">
                <div class="bottom-sheet">
                    <div class="sheet-header">
                        Nova Publicação
                        <div style="position:absolute; right:15px; top:15px; cursor:pointer;" id="close-new-post">✕</div>
                    </div>
                    <div class="sheet-content new-post-form">
                        <div id="img-preview-box" class="image-preview empty"></div>
                        
                        <label style="font-size:0.8rem; font-weight:700; color:#666; margin-top:10px;">Legenda</label>
                        <textarea id="new-post-caption" rows="3" placeholder="Escreva uma legenda..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; resize:none;"></textarea>

                        <button id="submit-post-btn" class="btn-primary" style="margin-top:10px;">Compartilhar</button>
                    </div>
                </div>
            </div>
            
            <style>
                #custom-camera-modal.active { display: flex !important; }
                #btn-capture-photo:active { transform: scale(0.9); background: #eee; }
            </style>
        </div>
    `,
};

export const PageHandlers = {
    // ... loadDashboard, loadFitFlix, loadPlayer mantidos ...
    async loadDashboard() { const { data } = await auth.getSession(); if (data.session) { const stats = await Services.getDashboardStats(data.session.user.id); const el = document.getElementById('dash-stats'); if(el) el.innerText = `${stats.completedWorkouts} treinos`; } },
    async loadFitFlix() { const videos = await Services.getVideos(); const container = document.getElementById('video-list'); if (!container) return; container.innerHTML = videos.map(video => `<div class="video-card"><a href="/watch?id=${video.id}" data-link class="video-thumbnail" style="background-image: url('${video.thumbnail_url}')"><div class="play-icon">▶</div></a><div class="video-info"><h4>${video.title}</h4></div></div>`).join(''); },
    async loadPlayer() { const params = new URLSearchParams(window.location.search); const video = await Services.getVideoById(params.get('id')); if(video && document.getElementById('video-wrapper')) { document.getElementById('video-wrapper').innerHTML = `<video controls autoplay width="100%" height="100%" poster="${video.thumbnail_url}"><source src="${video.video_url}" type="video/mp4"></video>`; } },
    loadWorkouts() { auth.getSession().then(async ({data}) => { if(!data.session) return; const workouts = await Services.getMyWorkouts(data.session.user.id); const container = document.getElementById('workout-list'); if(!container) return; if(!workouts.length) { container.innerHTML = `<div class="empty-state" style="text-align:center;padding:40px;color:#999;">📋<p>Sem treinos ainda.</p></div>`; return; } container.innerHTML = workouts.map(workout => `<div class="workout-card"><div class="workout-header"><h3>${workout.title}</h3><span class="difficulty">${workout.difficulty_level || 'Geral'}</span></div><p style="margin-bottom:15px;color:#666;">${workout.description || 'Bom treino!'}</p><div class="exercise-list">${workout.items && workout.items.length ? workout.items.map((item, i) => `<div class="exercise-item-clickable" data-workout-id="${workout.id}" data-index="${i}" style="display:flex;gap:10px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #f0f0f0;cursor:pointer;"><div class="ex-img" style="width:50px;height:50px;background:#eee;border-radius:8px;background-image:url('${item.exercise?.image_url}');background-size:cover;display:flex;align-items:center;justify-content:center;">${item.exercise?.image_url?'':'💪'}</div><div class="ex-info" style="flex:1;"><div style="font-weight:700;color:#333;">${item.exercise?.name}</div><div style="font-size:0.8rem;color:#666;">${item.sets} séries x ${item.reps}</div></div><div style="display:flex;align-items:center;color:var(--primary-color);">▶</div></div>`).join('') : '<p>Sem exercícios.</p>'}</div></div>`).join(''); container.querySelectorAll('.exercise-item-clickable').forEach(el => { el.addEventListener('click', () => { const workout = workouts.find(w => w.id == el.dataset.workoutId); const WorkoutSession = { /* Mock for session defined in closure above */ open: () => alert('Recarregue para funcionalidade completa') }; /* Should call main WorkoutSession */ }); }); }); },
    loadProfile() { const btn = document.getElementById('logout-btn-profile'); if(btn) btn.onclick = async () => { await auth.signOut(); window.location.href = '/login'; }; },

    // --- CARREGAMENTO DO FITGRAN (ATUALIZADO) ---
    async loadFitGran() {
        const { data: sessionData } = await auth.getSession();
        const user = sessionData.session?.user;
        if (!user) return;

        FitGranController.init(user.id);

        // Bindings da Câmera Customizada
        document.getElementById('btn-capture-photo').onclick = () => FitGranController.capturePhoto();
        document.getElementById('btn-close-camera').onclick = () => FitGranController.closeCustomCamera();
        document.getElementById('btn-gallery-trigger').onclick = () => FitGranController.triggerGallery();
        document.getElementById('camera-input').onchange = (e) => FitGranController.handleFileSelect(e);

        // Bindings do Modal de Post
        document.getElementById('close-new-post').onclick = () => FitGranController.closeNewPost();
        document.getElementById('submit-post-btn').onclick = () => FitGranController.submitPost();
        
        // Bindings de Comentários
        document.getElementById('close-comments').onclick = () => FitGranController.closeComments();
        document.getElementById('post-comment-btn').onclick = () => FitGranController.postComment();

        // Load Feed
        const posts = await Services.getPosts(user.id);
        const container = document.getElementById('feed-list');
        
        if (posts.length === 0) {
            container.innerHTML = '<p class="text-center" style="padding: 40px; color: #999;">Nenhum post ainda. Seja a primeira!</p>';
            return;
        }

        container.innerHTML = posts.map(post => {
            const isLikedClass = post.is_liked ? 'liked' : '';
            const heartColor = post.is_liked ? '#ed4956' : 'currentColor';
            const fill = post.is_liked ? '#ed4956' : 'none';
            const isMyPost = post.user_id === user.id;
            const likesHtml = isMyPost ? `<div class="post-likes" id="likes-count-${post.id}">${post.likes_count || 0} curtidas</div>` : '';

            return `
            <div class="feed-post" id="post-${post.id}">
                <div class="post-header">
                    <div class="post-header-user">
                        <div class="user-avatar-small">
                            ${post.profiles?.avatar_url ? `<img src="${post.profiles.avatar_url}" style="width:100%;height:100%;object-fit:cover;">` : (post.profiles?.full_name?.charAt(0) || 'U')}
                        </div>
                        <span class="username">${post.profiles?.full_name || 'Usuário'}</span>
                    </div>
                </div>
                <div class="post-image-container double-tap-zone" data-id="${post.id}">
                    <img src="${post.image_url}" class="post-image" loading="lazy">
                    <div class="heart-overlay">♥</div>
                </div>
                <div class="post-actions">
                    <button class="action-btn ${isLikedClass}" id="like-btn-${post.id}" data-id="${post.id}">
                        <svg aria-label="Curtir" height="24" role="img" viewBox="0 0 24 24" width="24" style="fill:${fill}; stroke:${heartColor}; stroke-width:2;"><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.956-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z"></path></svg>
                    </button>
                    <button class="action-btn comment-btn" data-id="${post.id}">
                        <svg aria-label="Comentar" height="24" role="img" viewBox="0 0 24 24" width="24" style="fill:none; stroke:currentColor; stroke-width:2;"><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2"></path></svg>
                    </button>
                </div>
                ${likesHtml}
                <div class="post-caption"><strong>${post.profiles?.full_name?.split(' ')[0]}</strong> ${post.caption}</div>
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
        
        // Listener Workout (Repetido de loadWorkouts para garantir contexto se necessário)
        container.querySelectorAll('.exercise-item-clickable').forEach(el => { el.addEventListener('click', () => { /* Logic */ }); });
    },
};