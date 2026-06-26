import { Services } from '../../core/services.js';
import { Toast } from '../../core/toast.js';
import { FitGranHandler } from './handler.js'; // To reload feed sometimes

export const FitGranController = {
    currentUserId: null,
    activePostIdForComments: null,
    selectedFile: null,
    videoStream: null,

    async init(userId) {
        this.currentUserId = userId;
        window.removeEventListener('fitgran-open-camera', this.openCustomCameraBind);
        this.openCustomCameraBind = () => this.openCustomCamera();
        window.addEventListener('fitgran-open-camera', this.openCustomCameraBind);
    },

    // --- Notificações ---
    openNotifications() {
        const modal = document.getElementById('notifications-modal');
        const list = document.getElementById('notifications-list');
        modal.classList.add('active');

        // Mock de notificações
        list.innerHTML = `
            <div class="comment-item" style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <div class="user-avatar-small" style="background:var(--primary-color);color:white;">S</div>
                <div class="comment-text"><strong>Suporte</strong> Bem-vinda ao FitGran! Comece a postar seus treinos. <br><span style="color:#999;font-size:0.7em">Agora</span></div>
            </div>
            <div style="text-align:center; padding: 20px; color: #999; font-size: 0.9rem;">
                Sem mais notificações recentes.
            </div>
        `;
    },

    closeNotifications() {
        document.getElementById('notifications-modal').classList.remove('active');
    },

    async openCustomCamera() {
        const modal = document.getElementById('custom-camera-modal');
        const video = document.getElementById('camera-feed');
        modal.classList.add('active');
        modal.style.display = 'flex';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            this.videoStream = stream;
            video.srcObject = stream;
        } catch (err) {
            console.error("Erro na câmera:", err);
            Toast.error("Não foi possível acessar a câmera. Use a galeria.");
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
        if (!video.srcObject) return;

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
        if (!this.selectedFile) return Toast.warning('Selecione uma foto para postar!');

        const caption = document.getElementById('new-post-caption').value;
        const btn = document.getElementById('submit-post-btn');

        btn.disabled = true;
        btn.innerText = 'Enviando...';

        const publicUrl = await Services.uploadPostImage(this.selectedFile, this.currentUserId);

        if (!publicUrl) {
            Toast.error('Erro ao enviar imagem. Verifique sua conexão.');
            btn.disabled = false;
            return;
        }

        const { error } = await Services.createPost(this.currentUserId, publicUrl, caption);

        btn.disabled = false;
        btn.innerText = 'Compartilhar';

        if (error) {
            console.error(error);
            Toast.error('Erro ao criar post.');
        } else {
            this.closeNewPost();
            Toast.success('Post publicado com sucesso!');
            FitGranHandler.load();
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
        void heartOverlay.offsetWidth;
        heartOverlay.classList.add('animate');
        if (!likeBtn.classList.contains('liked')) this.handleLike(postId, likeBtn);
        // Feedback tátil visual para double tap
        Toast.show('❤️ Curtiu!', 'success', 1500);
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
        else Toast.error('Erro ao enviar comentário');
    }
};
