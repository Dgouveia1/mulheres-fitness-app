// supabase.js - Configuração do Cliente Supabase
// Certifique-se de incluir a biblioteca do Supabase no index.html antes deste arquivo.

// ⚠️ ATENÇÃO: O erro ERR_NAME_NOT_RESOLVED indica que o URL anterior estava incorreto.
// Por favor, substitua as constantes abaixo pelos valores do seu Dashboard (Settings > API).

const SUPABASE_URL = 'https://aqiwolmbidkjrnkxvurf.supabase.co'; // <--- COPIE O 'PROJECT URL' AQUI
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxaXdvbG1iaWRranJua3h2dXJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzEwNTIsImV4cCI6MjA5MTc5MTA1Mn0.jMv1XaZPNv4c04R9OravVaftphT8WOIrkY9Lcf8Me08'; // <--- COPIE A CHAVE 'ANON' AQUI

// Inicializa o cliente apenas se as chaves estiverem definidas
let supabase;

// A CDN do Supabase expõe a biblioteca no objeto global 'window.supabase'
const supabaseProvider = window.supabase;

if (supabaseProvider && supabaseProvider.createClient) {
    const { createClient } = supabaseProvider;

    // Verificação de segurança para avisar se as chaves ainda não foram trocadas
    if (SUPABASE_URL.includes('SEU_ID_DO_PROJETO') || SUPABASE_ANON_KEY.includes('SUA_CHAVE_ANON')) {
        console.error('🔴 ERRO DE CONFIGURAÇÃO: Você precisa atualizar o arquivo assets/js/supabase.js com suas credenciais reais do Supabase.');
        alert('Configure o arquivo assets/js/supabase.js com suas credenciais do Supabase para continuar.');
    } else {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            db: {
                schema: 'public'
            },
            auth: {
                // Importante para manter a sessão entre recarregamentos
                persistSession: true,
                autoRefreshToken: true,
            }
        });
    }
} else {
    console.error('Supabase client library not found. Make sure to include the script in index.html');
}

export { supabase };
