
import { config } from './config.js';
import { supabase } from './supabase.js';

export const AsaasService = {
    async subscribe(planId, customerData) {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                throw new Error('Usuário não autenticado.');
            }

            const response = await fetch(`${config.params.functionUrl}/asaas-subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    planId,
                    billingType: 'PIX', // Default provisório. Idealmente, passar como argumento ou deixar dinâmico.
                    cpfCnpj: customerData.cpf,
                    mobilePhone: customerData.phone,
                    // Passar outros campos se necessário (address, etc)
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao processar pagamento.');
            }

            return result;
            return result;
        } catch (error) {
            console.error('Erro AsaasService:', error);
            throw error;
        }
    },

    async checkStatus(subscriptionId) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${config.params.functionUrl}/asaas-check-payment`, { // URL do novo function
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ subscriptionId })
            });
            return await response.json();
        } catch (error) {
            console.error('Erro Check Status:', error);
            throw error;
        }
    }
};

