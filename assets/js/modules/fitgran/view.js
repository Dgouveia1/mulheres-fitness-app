export const FitGranView = {
    Main: () => `
        <div class="page-content bg-gray" style="padding-top: 0;">
            <!-- Header FitGran com Notificações -->
            <div style="background: white; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; border-bottom: 1px solid rgba(0,0,0,0.05); height: 60px;">
                <span style="font-family: var(--font-script); font-size: 1.8rem; color: var(--primary-color);">FitGran</span>
                <div style="position: relative; cursor: pointer;" id="btn-notifications">
                     <svg aria-label="Notificações" color="black" fill="black" height="24" role="img" viewBox="0 0 24 24" width="24">
                        <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.956-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z"></path>
                    </svg>
                    <!-- Badge de notificação -->
                    <div style="position: absolute; top: 0; right: 0; width: 9px; height: 9px; background: #ed4956; border-radius: 50%; border: 1.5px solid white;"></div>
                </div>
            </div>

            <div id="feed-list" class="feed-container" style="padding-top: 10px;">
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

            <!-- MODAL DE NOTIFICAÇÕES (NOVO) -->
            <div id="notifications-modal" class="bottom-sheet-overlay">
                <div class="bottom-sheet">
                    <div class="sheet-header">Notificações<div style="position:absolute; right:15px; top:15px; cursor:pointer;" id="close-notifications">✕</div></div>
                    <div class="sheet-content">
                        <div id="notifications-list" class="comment-list" style="padding: 0 15px;"></div>
                    </div>
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
    `
};
