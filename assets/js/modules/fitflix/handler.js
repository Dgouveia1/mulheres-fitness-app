import { Services } from '../../core/services.js';
import { Toast } from '../../core/toast.js';

export const FitFlixHandler = {
    async loadList() {
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
        const hashParts = window.location.hash.split('?');
        const params = new URLSearchParams(hashParts[1] || '');
        const id = params.get('id');

        if (!id) {
            Toast.error('Vídeo não encontrado.');
            window.location.hash = '/fitflix';
            return;
        }

        const video = await Services.getVideoById(id);

        if (video && document.getElementById('video-wrapper')) {
            document.getElementById('video-wrapper').innerHTML = `
                <video controls autoplay width="100%" height="100%" poster="${video.thumbnail_url}">
                    <source src="${video.video_url}" type="video/mp4">
                    Seu navegador não suporta vídeos.
                </video>`;
            document.getElementById('video-details').innerHTML = `<h2>${video.title}</h2><p>${video.description || ''}</p>`;
        }
    }
};
