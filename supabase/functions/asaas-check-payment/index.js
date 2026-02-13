
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. Initialize Env Vars & Client INSIDE try/catch to catch config errors
        const ASAAS_URL = "https://sandbox.asaas.com/api/v3"
        const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
        const SUPA_URL = Deno.env.get('SUPABASE_URL')
        const SUPA_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!ASAAS_API_KEY || !SUPA_URL || !SUPA_KEY) {
            throw new Error('Configuração de servidor incompleta (Missing Secrets).')
        }

        const supabase = createClient(SUPA_URL, SUPA_KEY)

        // 3. Parse Body
        const { subscriptionId } = await req.json()

        if (!subscriptionId) throw new Error('Subscription ID obrigatório.')

        // 4. Busca status no Asaas
        const response = await fetch(`${ASAAS_URL}/subscriptions/${subscriptionId}`, {
            headers: { 'access_token': ASAAS_API_KEY }
        })
        const asaasSub = await response.json()

        if (asaasSub.errors) throw new Error('Erro ao buscar no Asaas: ' + JSON.stringify(asaasSub.errors))

        // 5. Atualiza no Banco
        const { data: updatedSub, error: updateError } = await supabase
            .from('asaas_subscriptions')
            .update({
                status: asaasSub.status,
                updated_at: new Date()
            })
            .eq('sub_asaas_id', subscriptionId)
            .select()
            .single()

        if (updateError) throw new Error('Erro ao atualizar banco: ' + updateError.message)

        return new Response(
            JSON.stringify({
                success: true,
                status: asaasSub.status
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
