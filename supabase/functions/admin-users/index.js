import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Headers para CORS (Permitir que o front chame a função)
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Papéis que o superadmin pode atribuir/gerenciar
const MANAGED_ROLES = ['admin', 'coach', 'nutri', 'reception']

// Cliente Supabase com permissão total (Service Role)
const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
    })
}

serve(async (req) => {
    // Tratamento de CORS (Pre-flight request)
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verificar Autenticação do Usuário que chamou
        const authHeader = req.headers.get('Authorization')
        const token = authHeader ? authHeader.replace('Bearer ', '') : null
        if (!token) return json({ error: 'Token ausente.' }, 401)

        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) return json({ error: 'Usuário não autenticado.' }, 401)

        // 2. Autorização: o chamador precisa ser superadmin
        const { data: caller } = await supabase
            .from('profiles').select('role').eq('id', user.id).single()
        if (caller?.role !== 'superadmin') {
            return json({ error: 'Acesso negado. Apenas superadmin.' }, 403)
        }

        // 3. Ler payload
        const { action, id, email, password, full_name, role, unit } = await req.json()
        if (!action) return json({ error: 'Ação ausente.' }, 400)

        // Validação do papel (quando enviado): rejeita inválido e string vazia
        if (role !== undefined && !MANAGED_ROLES.includes(role)) {
            return json({ error: 'Papel inválido. Permitidos: ' + MANAGED_ROLES.join(', ') }, 400)
        }

        // Monta apenas os campos definidos (evita sobrescrever com undefined)
        function definedFields() {
            const obj = {}
            if (full_name !== undefined) obj.full_name = full_name
            if (role !== undefined) obj.role = role
            if (unit !== undefined) obj.unit = unit
            return obj
        }

        // --- CREATE ---
        if (action === 'create') {
            if (!email || !password || !role) {
                return json({ error: 'Dados incompletos (email, senha e papel são obrigatórios).' }, 400)
            }

            const { data: created, error: createError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name, role, unit },
            })
            if (createError) return json({ error: createError.message }, 400)

            // Upsert do profile (robusto: funciona tenha ou não o trigger já criado a linha)
            const { error: profileError } = await supabase.from('profiles')
                .upsert({ id: created.user.id, email, full_name, role, unit }, { onConflict: 'id' })
            if (profileError) {
                // Rollback: remove o usuário do Auth para não deixar conta órfã
                await supabase.auth.admin.deleteUserById(created.user.id)
                return json({ error: 'Falha ao salvar o perfil: ' + profileError.message }, 400)
            }

            return json({ success: true, id: created.user.id })
        }

        // Para update/delete precisamos do alvo
        if (!id) return json({ error: 'ID do usuário ausente.' }, 400)

        const { data: target, error: targetError } = await supabase
            .from('profiles').select('role').eq('id', id).single()
        if (targetError || !target) return json({ error: 'Usuário não encontrado.' }, 404)
        // Proteção: não permite gerenciar outro superadmin pela UI
        if (target.role === 'superadmin') {
            return json({ error: 'Não é permitido gerenciar contas superadmin.' }, 403)
        }

        // --- UPDATE ---
        if (action === 'update') {
            const patch = definedFields()
            if (Object.keys(patch).length > 0) {
                const { error: upErr } = await supabase.from('profiles').update(patch).eq('id', id)
                if (upErr) return json({ error: upErr.message }, 400)
            }

            // Sincroniza Auth: metadata só com campos definidos; email/senha quando enviados
            const authAttrs = {}
            if (Object.keys(patch).length > 0) authAttrs.user_metadata = patch
            if (email) authAttrs.email = email
            if (password) authAttrs.password = password
            if (Object.keys(authAttrs).length > 0) {
                const { error: authUpErr } = await supabase.auth.admin.updateUserById(id, authAttrs)
                if (authUpErr) return json({ error: authUpErr.message }, 400)
            }

            return json({ success: true })
        }

        // --- DELETE ---
        if (action === 'delete') {
            const { error: delError } = await supabase.auth.admin.deleteUserById(id)
            if (delError) return json({ error: delError.message }, 400)
            // Caso não haja cascade FK, remove o profile explicitamente
            const { error: profDelError } = await supabase.from('profiles').delete().eq('id', id)
            if (profDelError) console.error('Falha ao remover profile (auth user já removido):', profDelError)
            return json({ success: true })
        }

        return json({ error: 'Ação desconhecida: ' + action }, 400)
    } catch (error) {
        console.error(error)
        return json({ error: error.message || 'Erro inesperado.' }, 400)
    }
})
