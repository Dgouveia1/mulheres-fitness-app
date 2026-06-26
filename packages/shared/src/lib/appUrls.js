// URLs públicas de cada app (subdomínios). Em produção são definidas por env
// nos 3 projetos Vercel; em dev caem nos ports locais. Usadas para navegação
// entre apps (links cross-origin) e para a tela de "papel incorreto".
export const appUrls = {
  agenda: import.meta.env.VITE_AGENDA_URL || 'http://localhost:3001',
  treinoAdmin: import.meta.env.VITE_TREINO_ADMIN_URL || 'http://localhost:3002',
  treino: import.meta.env.VITE_TREINO_URL || 'http://localhost:3003',
}
