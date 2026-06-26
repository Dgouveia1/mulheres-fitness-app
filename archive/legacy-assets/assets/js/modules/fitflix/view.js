export const FitFlixView = {
    List: () => `<div class="page-content"><div class="hero-banner"><h2>FitClass</h2><p>Treine onde quiser</p></div><div class="section-title">Aulas Recentes</div><div id="video-list" class="video-grid"><div class="loader-spinner" style="margin: 20px auto;"></div></div></div>`,

    Player: () => `<div class="player-container" style="background: black; min-height: 100vh; display: flex; flex-direction: column;"><div class="player-header" style="padding: 16px;"><a href="/fitflix" class="back-btn" data-link style="color: white; display: flex; align-items: center; gap: 8px;"><span>✕</span> Fechar</a></div><div class="video-wrapper" id="video-wrapper" style="flex: 1; display: flex; align-items: center; justify-content: center;"><div class="loader-spinner"></div></div><div class="video-details" id="video-details" style="padding: 16px; background: #111; color: white;"></div></div>`
};
