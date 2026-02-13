import { auth } from '../../core/auth.js';
import { Services } from '../../core/services.js';
import { AsaasService } from '../../core/asaas.js';

export const DashboardHandler = {
    async load() {
        const { data } = await auth.getSession();
        if (data.session) {
            const user = data.session.user;
            const stats = await Services.getDashboardStats(user.id);
            const el = document.getElementById('dash-stats');
            if (el) el.innerText = `${stats.completedWorkouts} treinos`;

            // Setup Assinatura
            const btnSubscribe = document.getElementById('btn-subscribe');
            if (btnSubscribe) {
                btnSubscribe.onclick = () => this.handleSubscription(user);
            }
        }
    },

    async handleSubscription(user) {
        if (!confirm('Deseja assinar o plano Premium por R$ 99,90/mês?')) return;

        const btn = document.getElementById('btn-subscribe');
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<div class="text"><h3>Processando...</h3></div>';
        btn.style.pointerEvents = 'none';

        try {
            // Dados do usuário (Metadata ou Profile)
            const customerData = {
                full_name: user.user_metadata.full_name || 'Aluna',
                email: user.email,
                cpf: user.user_metadata.cpf || '',
                phone: user.user_metadata.phone || ''
            };

            if (!customerData.cpf || !customerData.phone) {
                alert('Por favor, atualize seu cadastro com CPF e Telefone antes de assinar.');
                return;
            }

            const result = await AsaasService.subscribe(1, customerData);

            if (result.success) {
                if (result.paymentData?.invoiceUrl) {
                    window.open(result.paymentData.invoiceUrl, '_blank');
                    alert('Fatura gerada! Redirecionando para pagamento...');
                } else if (result.paymentData?.pixQrCode) {
                    // Exibe o QR Code e o Copia e Cola
                    const payload = result.paymentData.pixQrCode.payload;
                    const image = result.paymentData.pixQrCode.encodedImage;

                    // TODO: Criar um modal bonito para isso. Por enquanto, alert.
                    prompt("Copia e Cola PIX:", payload);
                    alert("Acesse seu banco e pague via PIX!");
                }
            }
        } catch (error) {
            alert('Erro ao assinar: ' + error.message);
        } finally {
            btn.innerHTML = originalContent;
            btn.style.pointerEvents = 'auto';
        }
    }
};

