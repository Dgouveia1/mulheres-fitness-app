import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';
import { FitGranController } from './controller.js';

export const FitGranHandler = {
    openCamera() {
        FitGranController.openCustomCamera();
    },

    async load() {
        const { data: sessionData } = await auth.getSession();
        const user = sessionData.session?.user;
        if (!user) return;

        FitGranController.init(user.id);

        // Event Listeners
        const getEl = (id) => document.getElementById(id);
        if (getEl('btn-capture-photo')) getEl('btn-capture-photo').onclick = () => FitGranController.capturePhoto();
        if (getEl('btn-close-camera')) getEl('btn-close-camera').onclick = () => FitGranController.closeCustomCamera();
        if (getEl('btn-gallery-trigger')) getEl('btn-gallery-trigger').onclick = () => FitGranController.triggerGallery();
        if (getEl('camera-input')) getEl('camera-input').onchange = (e) => FitGranController.handleFileSelect(e);
        if (getEl('close-new-post')) getEl('close-new-post').onclick = () => FitGranController.closeNewPost();
        if (getEl('submit-post-btn')) getEl('submit-post-btn').onclick = () => FitGranController.submitPost();
        if (getEl('close-comments')) getEl('close-comments').onclick = () => FitGranController.closeComments();
        if (getEl('post-comment-btn')) getEl('post-comment-btn').onclick = () => FitGranController.postComment();

        // Notificações
        if (getEl('btn-notifications')) getEl('btn-notifications').onclick = () => FitGranController.openNotifications();
        if (getEl('close-notifications')) getEl('close-notifications').onclick = () => FitGranController.closeNotifications();

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

        container.querySelectorAll('.action-btn').forEach(btn => { if (btn.id.startsWith('like-btn')) btn.onclick = () => FitGranController.handleLike(btn.dataset.id, btn); });
        container.querySelectorAll('.comment-btn, .view-comments').forEach(btn => { btn.onclick = () => FitGranController.openComments(btn.dataset.id); });
        container.querySelectorAll('.double-tap-zone').forEach(zone => {
            let lastTap = 0;
            zone.addEventListener('click', (e) => {
                const currentTime = new Date().getTime();
                if (currentTime - lastTap < 300) FitGranController.handleDoubleTap(zone.dataset.id, zone);
                lastTap = currentTime;
            });
        });
    }
};
