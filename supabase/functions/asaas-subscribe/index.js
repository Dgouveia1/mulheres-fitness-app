
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// --- CONFIGURAÇÕES ---
const ASAAS_URL = "https://sandbox.asaas.com/api/v3" // Sandbox
const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')

// Headers para CORS (Permitir que o front chame a função)
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cliente Supabase com permissão total (Service Role)
const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)

serve(async (req) => {
    // Tratamento de CORS (Pre-flight request)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verificar Autenticação do Usuário
        const authHeader = req.headers.get('Authorization')
        const token = authHeader ? authHeader.replace('Bearer ', '') : null

        if (!token) throw new Error('Token ausente.')

        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            throw new Error('Usuário não autenticado.')
        }

        // 2. Receber dados do Frontend
        const {
            planId,           // ID do plano no nosso banco
            billingType,      // BOLETO, PIX, CREDIT_CARD
            creditCard,       // Objeto com dados do cartão (se for crédito)
            creditCardHolderInfo, // Dados do titular (se for crédito)
            cpfCnpj,          // Necessário para criar cliente Asaas
            mobilePhone,      // Necessário para criar cliente Asaas
            postalCode, address, addressNumber // Endereço (Obrigatório para Cartão)
        } = await req.json()

        if (!planId || !cpfCnpj) throw new Error('Dados incompletos.')

        // 3. Buscar detalhes do Plano no Banco (Segurança de Preço)
        const { data: plan, error: planError } = await supabase
            .from('asaas_plans')
            .select('*')
            .eq('id', planId)
            .single()

        if (planError || !plan) throw new Error('Plano não encontrado.')

        // 4. Verificar/Criar Cliente no Asaas
        // Primeiro, checa se já existe na nossa tabela
        let { data: localCustomer } = await supabase
            .from('asaas_customers')
            .select('*')
            .eq('user_id', user.id)
            .single()

        let asaasCustomerId = localCustomer?.cus_asaas_id

        // Se não existir, cria no Asaas e salva no Supabase
        if (!asaasCustomerId) {
            console.log('Criando cliente no Asaas...')

            const newCustomerPayload = {
                name: user.user_metadata.full_name || 'Cliente Sem Nome',
                email: user.email,
                cpfCnpj: cpfCnpj.replace(/\D/g, ''),
                mobilePhone: mobilePhone,
                postalCode: postalCode,
                address: address,
                addressNumber: addressNumber
            }

            const asaasCustomer = await fetchAsaas('/customers', 'POST', newCustomerPayload)

            if (asaasCustomer.errors) throw new Error(`Erro Asaas Cliente: ${JSON.stringify(asaasCustomer.errors)}`)

            asaasCustomerId = asaasCustomer.id

            // Salva vínculo no nosso banco
            await supabase.from('asaas_customers').insert({
                user_id: user.id,
                cus_asaas_id: asaasCustomerId,
                name: newCustomerPayload.name,
                email: newCustomerPayload.email,
                cpf_cnpj: newCustomerPayload.cpfCnpj,
                phone: newCustomerPayload.mobilePhone
            })
        }

        // 5. Criar Assinatura no Asaas
        console.log('Criando assinatura...')

        // Convertendo cycle se necessário ou usando direto do banco
        const subscriptionPayload = {
            customer: asaasCustomerId,
            billingType: billingType,
            value: plan.value,
            cycle: plan.cycle, // MONTHLY, QUARTERLY, etc.
            nextDueDate: new Date().toISOString().split('T')[0], // Cobra hoje
            description: `Assinatura Plano ${plan.name}`
        }

        // Se for Cartão de Crédito, anexa os dados
        if (billingType === 'CREDIT_CARD') {
            if (!creditCard || !creditCardHolderInfo) throw new Error('Dados do cartão obrigatórios.')
            subscriptionPayload.creditCard = creditCard
            subscriptionPayload.creditCardHolderInfo = creditCardHolderInfo
        }

        const asaasSubscription = await fetchAsaas('/subscriptions', 'POST', subscriptionPayload)

        if (asaasSubscription.errors) throw new Error(`Erro Asaas Assinatura: ${JSON.stringify(asaasSubscription.errors)}`)

        // 6. Salvar Assinatura no Banco
        const { data: savedSub, error: saveError } = await supabase
            .from('asaas_subscriptions')
            .insert({
                customer_id: (await supabase.from('asaas_customers').select('id').eq('cus_asaas_id', asaasCustomerId).single()).data.id,
                plan_id: plan.id,
                sub_asaas_id: asaasSubscription.id,
                status: asaasSubscription.status,
                value: asaasSubscription.value,
                billing_type: billingType,
                next_due_date: asaasSubscription.nextDueDate
            })
            .select()
            .single()

        // 7. Retornar Sucesso e Links de Pagamento (se houver)
        // Se for Pix/Boleto, precisamos pegar a cobrança gerada para dar o QR Code
        let paymentData = null
        if (billingType !== 'CREDIT_CARD') {
            // Busca a primeira cobrança dessa assinatura para exibir o QR Code/Boleto
            const charges = await fetchAsaas(`/payments?subscription=${asaasSubscription.id}&limit=1`, 'GET')
            if (charges.data && charges.data.length > 0) {
                const charge = charges.data[0]

                let pixQrCode = null
                if (billingType === 'PIX') {
                    pixQrCode = await fetchAsaas(`/payments/${charge.id}/pixQrCode`, 'GET')
                }

                paymentData = {
                    invoiceUrl: charge.invoiceUrl,
                    bankSlipUrl: charge.bankSlipUrl,
                    pixQrCode: pixQrCode
                }
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                subscriptionId: asaasSubscription.id,
                paymentData: paymentData
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error(error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})

// --- HELPER PARA CHAMADAS ASAAS ---
async function fetchAsaas(endpoint, method, body) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY
        }
    }
    if (body) options.body = JSON.stringify(body)

    const response = await fetch(`${ASAAS_URL}${endpoint}`, options)
    return await response.json()
}
