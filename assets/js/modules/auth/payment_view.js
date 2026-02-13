
import { AsaasService } from '../../core/asaas.js';
import { Toast } from '../../core/toast.js';
import { auth } from '../../core/auth.js';

export const PaymentView = {
    Template: (user) => {
        // Recupera dados temporários do subscribe (se houver)
        const pendingPayment = JSON.parse(localStorage.getItem('pending_payment') || '{}');

        return `
        <div class="auth-container" style="background: #f8f9fa;">
            <div class="auth-card" style="max-width: 500px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 3rem;">🎉</span>
                    <h2 style="color: #333; margin-top: 16px;">Cadastro realizado!</h2>
                    <p style="color: #666;">Para acessar a plataforma, finalize sua assinatura.</p>
                </div>

                <div style="background: #fff8e1; border: 1px solid #ffeeda; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <strong>Plano Premium</strong>
                        <span style="color: #2e7d32; font-weight: bold;">R$ 99,90/mês</span>
                    </div>
                    <ul style="font-size: 0.9rem; color: #555; padding-left: 20px;">
                        <li>Acesso ilimitado aos treinos</li>
                        <li>Gestão Nutricional</li>
                        <li>Comunidade VIP</li>
                    </ul>
                </div>

                <div id="payment-area" style="text-align: center;">
                    ${pendingPayment.pixQrCode ? `
                        <div style="margin-bottom: 20px;">
                            <p style="font-weight: 500; margin-bottom: 8px;">Escaneie o QR Code:</p>
                            <img src="data:image/png;base64,${pendingPayment.pixQrCode.encodedImage}" style="width: 200px; height: 200px; border: 1px solid #eee;">
                            
                            <div style="margin-top: 16px;">
                                <p style="font-size: 0.85rem; margin-bottom: 8px;">Ou copie o código:</p>
                                <div style="display: flex; gap: 8px;">
                                    <input type="text" value="${pendingPayment.pixQrCode.payload}" readonly style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem;">
                                    <button onclick="navigator.clipboard.writeText('${pendingPayment.pixQrCode.payload}'); alert('Copiado!');" class="btn-secondary" style="padding: 8px 12px;">Copiar</button>
                                </div>
                            </div>
                        </div>
                    ` : `
                         <p>Gerando dados de pagamento...</p>
                         <button class="btn-primary" onclick="window.location.reload()">Carregar Informações</button>
                    `}
                </div>

                <div style="margin-top: 32px; text-align: center;">
                    <button id="btn-check-payment" class="btn-primary" style="width: 100%; background: #2e7d32;">JÁ REALIZEI O PAGAMENTO</button>
                    <p style="font-size: 0.8rem; color: #888; margin-top: 12px;">Seu acesso será liberado automaticamente após a confirmação.</p>
                </div>
                
                <div style="margin-top: 16px; text-align: center;">
                    <a href="#" id="btn-logout" style="font-size: 0.85rem; color: #666;">Sair da conta</a>
                </div>
            </div>
        </div>
        `;
    },

    init: (user) => {
        const btnCheck = document.getElementById('btn-check-payment');
        if (btnCheck) {
            btnCheck.onclick = async () => {
                const pendingPayment = JSON.parse(localStorage.getItem('pending_payment') || '{}');
                if (!pendingPayment.subscriptionId) {
                    Toast.error('Dados de pagamento não encontrados. Tente recarregar.');
                    return;
                }

                btnCheck.disabled = true;
                btnCheck.innerText = 'Verificando...';

                try {
                    const status = await AsaasService.checkStatus(pendingPayment.subscriptionId);

                    if (status.status === 'ACTIVE') {
                        Toast.success('Pagamento confirmado! Bem-vinda!');
                        localStorage.removeItem('pending_payment');
                        window.location.hash = '/'; // Redireciona para dashboard
                    } else {
                        Toast.error(`Pagamento ainda não identificado (Status: ${status.status}). Tente novamente em alguns segundos.`);
                    }
                } catch (e) {
                    Toast.error('Erro ao verificar: ' + e.message);
                } finally {
                    btnCheck.disabled = false;
                    btnCheck.innerText = 'JÁ REALIZEI O PAGAMENTO';
                }
            };
        }

        const btnLogout = document.getElementById('btn-logout');
        if (btnLogout) {
            btnLogout.addEventListener('click', async (e) => {
                e.preventDefault();
                await auth.signOut();
                window.location.reload();
            });
        }
    }
};
