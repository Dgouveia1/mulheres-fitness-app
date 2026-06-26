# Relatório de Paridade — App legado (produção) × React migrado

Auditoria comparando o app **legado em vanilla-JS** (o que está em produção em
`mulheres-fitness-app.vercel.app`, agora em `archive/legacy-assets/`) com o app
**React** separado no monorepo (`apps/*` + `packages/shared`).

Fonte da verdade do banco: `docs/tabelas, colunas, funções, trigger do supabase -schema principal.csv`.

**Conclusão:** o React era uma reescrita **parcial e ainda não validada contra o
banco de produção**. A migração para monorepo preservou o React fielmente, mas o
próprio React tinha gaps e **4 bugs de dados que quebram contra o schema real**.
A Agenda já foi corrigida (commit `7a97eae`).

---

## P0 — Bugs críticos de dados (quebram contra o banco real)

> Esses fazem funções pararem silenciosamente. Coluna real confirmada no dump.

### 1. Avaliações físicas (tabela `assessments`) — **quebrado**
- **Schema real:** `weight` (numeric), `height` (numeric), `notes` (text), `measurements` (**jsonb**), `user_id`, `id`, `created_at`.
- **React** ([EvaluationsPage.jsx](apps/agenda/src/pages/EvaluationsPage.jsx)): grava/lê `weight_kg, height_cm, body_fat_pct, waist_cm, hip_cm, thigh_cm, arm_cm, chest_cm` e `evaluated_by` — **nenhuma dessas colunas existe**.
- **Efeito:** `createAssessment` falha (coluna inexistente) e o histórico nunca exibe medidas. As avaliações estão **inoperantes**.
- **Correção:** gravar `{ weight, height, notes, measurements: { waist, hip, abdomen, thigh_r, thigh_l, bust, ... } }` (medidas no JSON `measurements`, como o legado). Reescrever o form e a leitura.

### 2. Treinos (tabela `workouts`) — **nome em branco**
- **Schema real:** `title` (NOT NULL), `description`, `difficulty_level`, `assigned_to`, `created_by`.
- **React:** [WorkoutsPage.jsx:58](apps/treino/src/pages/WorkoutsPage.jsx#L58) lê `workout.name`; o builder admin não grava `title`.
- **Efeito:** treinos aparecem sem nome para a aluna; criação pode falhar (`title` é NOT NULL).
- **Correção:** padronizar em `title` (display e criação) em [WorkoutsPage.jsx](apps/treino/src/pages/WorkoutsPage.jsx) e [WorkoutsAdminPage.jsx](apps/treino-admin/src/pages/WorkoutsAdminPage.jsx) + `createWorkoutRoutine`.

### 3. Dietas (tabela `diets`) — **nome em branco**
- **Schema real:** `title` (NOT NULL), `description`, `is_active`, `assigned_to`, `created_by`.
- **React:** [DietPage.jsx:42](apps/treino/src/pages/DietPage.jsx#L42) lê `diet.name`; `createDietPlan` ([api.js](packages/shared/src/services/api.js)) grava header sem `title`.
- **Efeito:** nome da dieta em branco; criação pode falhar.
- **Correção:** padronizar `title` em display + `createDietPlan`/[NutritionAdminPage.jsx](apps/treino-admin/src/pages/NutritionAdminPage.jsx). (`diet_meals.name` está correto.)

### 4. FitFlix (tabela `fitflix_videos`) — **categoria quebrada**
- **Schema real:** `category` (**texto**), além de `title, description, video_url, thumbnail_url, duration_minutes`.
- **React:** [FitFlixAdminPage.jsx](apps/treino-admin/src/pages/FitFlixAdminPage.jsx) e [FitFlixPage.jsx:20](apps/treino/src/pages/FitFlixPage.jsx#L20) usam `category_id` (FK) — **não existe**.
- **Efeito:** vídeos sem categoria / filtro da aluna não funciona.
- **Correção:** usar `category` (string = nome da categoria) no insert/leitura/filtro; o dropdown pode listar `fitflix_categories.name`.

---

## P1 — Funções de negócio faltando

### 5. Pagamento / Assinatura (Asaas) — **ausente (remoção temporária)**
- Legado tem fluxo completo: tela de planos, PIX/boleto/cartão via `core/asaas.js` + edge functions `asaas-subscribe` / `asaas-check-payment`, e **guard de pagamento** (aluna sem assinatura ativa → /payment).
- Tabelas `asaas_customers`, `asaas_plans`, `asaas_subscriptions` **existem no banco**; as edge functions **existem** em `supabase/functions/`.
- React: `RegisterPage` vai direto pro `/dashboard`, sem cobrança. Foi **removido de propósito** (commit `f2587b4` "remoção temporaria do meio de pagamento").
- **Decisão de negócio:** reativar agora ou manter em stand-by? Se reativar: criar `PaymentPage` + hook + guard no app de treino.

### 6. Prontuário do cliente — **simplificado**
- Legado: modal de prontuário com **gráfico de evolução de peso**, cards de IMC/Peso/Altura, **histórico tabelado**, e coluna **"Última Avaliação"** na lista de clientes.
- React: [ClientsPage.jsx](apps/agenda/src/pages/ClientsPage.jsx) é lista simples; avaliações ficam em página separada sem gráfico/IMC.
- **Correção:** portar prontuário (gráfico CSS + IMC + histórico) — depende do P0 #1 (schema de assessments).

### 7. Chat com alunas — **ausente**
- Legado: abas **Todas / Equipe / Alunos** (conversa com alunas).
- React: `getChatContacts` filtra só `STAFF_ROLES` → só conversa entre equipe.
- **Correção:** adicionar contatos de alunas + abas no [ChatPage.jsx](apps/agenda/src/pages/ChatPage.jsx). *(Obs.: este módulo do audit precisa de recheck — 1 agente falhou.)*

---

## P2 — Builders de admin incompletos

### 8. Treinos admin
- Faltam: campo **título/descrição/dificuldade**, carregar/salvar **templates**, **upload de mídia** (vídeo/imagem do exercício). Ver [WorkoutsAdminPage.jsx](apps/treino-admin/src/pages/WorkoutsAdminPage.jsx).

### 9. Nutrição admin
- Faltam: **templates**, descrição, busca de aluna; corrigir `title` (P0 #3). Ver [NutritionAdminPage.jsx](apps/treino-admin/src/pages/NutritionAdminPage.jsx).

### 10. FitFlix admin
- Falta **barra de progresso** de upload; corrigir `category` (P0 #4).

---

## P3 — Menores / melhorias

- **Agenda** ✅ já em paridade (Dia/Semana/Mês, abas, tipos `fisica/nutri/personal`, WhatsApp). Pendência cosmética: exibir campo "Unidade" (read-only) no modal.
- **Dashboard staff** ✅ React mais completo que o legado.
- **Player de treino** ✅ em paridade (séries, timer de descanso, registro).
- **App da aluna:** dashboard sem gamificação opcional; sem busca de treinos.

---

## Resumo executivo

| Prioridade | Itens | Risco |
|---|---|---|
| **P0** | Avaliações, Treinos, Dietas, FitFlix (schema) | Funções quebram contra o banco real |
| **P1** | Pagamento Asaas, Prontuário, Chat c/ alunas | Funções de negócio ausentes |
| **P2** | Builders admin (treino/nutrição/fitflix) | Incompletos |
| **P3** | Cosméticos / melhorias | Baixo |

**Recomendação de ordem:** P0 (corrige dados — rápido e essencial) → decidir Pagamento (negócio) → P1 prontuário/chat → P2 builders.
