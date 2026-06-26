import { Services } from '../../core/services.js';
import { Toast } from '../../core/toast.js';
import { AdminNutritionView } from './nutrition_view.js';
import { supabase } from '../../core/supabase.js';

export const AdminNutritionHandler = {
    studentsCache: [],
    templatesCache: [], // Cache para templates
    
    // Estado local da construção da dieta
    builderState: {
        meals: [] 
    },

    async init() {
        window.AdminNutritionHandler = this;
        await this.loadInitialData();
        this.renderBuilder();

        // Fecha o dropdown se clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#student-search-input') && !e.target.closest('#student-dropdown-list')) {
                const drop = document.getElementById('student-dropdown-list');
                if (drop) drop.style.display = 'none';
            }
        });
    },

    async loadInitialData() {
        // 1. Carrega Alunos
        const { data: students } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'user')
            .order('full_name');
        this.studentsCache = students || [];

        // 2. Carrega Templates (Dietas atribuídas ao Admin logado)
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user) {
            this.templatesCache = await Services.getDietTemplates(session.session.user.id);
        }
    },

    renderBuilder() {
        const container = document.getElementById('nutrition-root');
        if(container) {
            // Passa templates para a View
            container.innerHTML = AdminNutritionView.Builder(this.studentsCache, this.templatesCache);
            this.renderMealsList();
        }
    },

    // --- NOVA LÓGICA DO DROPDOWN (SEARCHABLE) ---
    showStudentDropdown() {
        const drop = document.getElementById('student-dropdown-list');
        if (drop) drop.style.display = 'block';
    },

    toggleStudentDropdown() {
        const drop = document.getElementById('student-dropdown-list');
        if (drop) drop.style.display = drop.style.display === 'none' ? 'block' : 'none';
    },

    filterStudentDropdown(term) {
        const listContainer = document.getElementById('student-list-content');
        if (!listContainer) return;

        const filtered = this.studentsCache.filter(s => s.full_name.toLowerCase().includes(term.toLowerCase()));

        if (filtered.length === 0) {
            listContainer.innerHTML = '<div style="padding:15px; color:#999; text-align:center;">Nenhuma aluna encontrada</div>';
            return;
        }

        listContainer.innerHTML = filtered.map(s => `
            <div class="dropdown-item-student" onclick="AdminNutritionHandler.selectTarget('${s.id}', '${s.full_name}')" 
                    style="padding:10px 12px; border-bottom:1px solid #f9f9f9; cursor:pointer; display:flex; align-items:center; gap:8px; color:#333;">
                <div style="width:24px; height:24px; background:#eee; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; color:#666;">${s.full_name.charAt(0)}</div>
                ${s.full_name}
            </div>
        `).join('');
    },

    selectTarget(id, name) {
        document.getElementById('student-search-input').value = name;
        document.getElementById('diet-student').value = id;
        document.getElementById('student-dropdown-list').style.display = 'none';

        // Lógica de exibir o carregador de templates
        this.handleTargetChange(id);
    },

    // --- TEMPLATE LOGIC ---
    
    handleTargetChange(val) {
        // Mostra o loader de templates se o usuário interagir
        const loaderGroup = document.getElementById('diet-template-loader-group');
        if (loaderGroup) loaderGroup.style.display = 'block';
    },

    async loadTemplate(templateId) {
        if(!templateId) return;

        // Confirmação se já houver itens adicionados
        if(this.builderState.meals.length > 0) {
            if(!confirm('Isso substituirá as refeições atuais. Continuar?')) {
                document.getElementById('diet-template-load').value = "";
                return;
            }
        }

        const diet = await Services.getDietById(templateId);
        
        if(diet) {
            // Preenche campos do Header
            document.getElementById('diet-title').value = diet.title;
            document.getElementById('diet-desc').value = diet.description || '';
            
            // Reconstrói o estado do builder com os dados do template
            this.builderState.meals = diet.meals.map(m => ({
                id_temp: Date.now() + Math.random(),
                name: m.name,
                time: m.time || '08:00',
                foods: m.foods.map(f => ({
                    food_item: f.food_item,
                    portion: f.portion
                }))
            }));
            
            this.renderMealsList();
            Toast.info('Modelo carregado com sucesso!');
        }
    },


    // --- MANIPULAÇÃO DO ESTADO ---

    addMeal() {
        this.builderState.meals.push({
            id_temp: Date.now(),
            name: 'Nova Refeição',
            time: '08:00',
            foods: [{ food_item: '', portion: '' }]
        });
        this.renderMealsList();
        
        // Scroll para o fim
        setTimeout(() => {
            const list = document.getElementById('meals-builder-list');
            if(list) list.scrollTop = list.scrollHeight;
        }, 50);
    },

    removeMeal(index) {
        this.builderState.meals.splice(index, 1);
        this.renderMealsList();
    },

    updateMeal(index, field, value) {
        this.builderState.meals[index][field] = value;
    },

    addFoodToMeal(mealIndex) {
        this.builderState.meals[mealIndex].foods.push({ food_item: '', portion: '' });
        this.renderMealsList();
    },

    removeFoodFromMeal(mealIndex, foodIndex) {
        this.builderState.meals[mealIndex].foods.splice(foodIndex, 1);
        this.renderMealsList();
    },

    updateFood(mealIndex, foodIndex, field, value) {
        this.builderState.meals[mealIndex].foods[foodIndex][field] = value;
    },

    // --- RENDERIZAÇÃO ---
    renderMealsList() {
        const list = document.getElementById('meals-builder-list');
        if(!list) return;

        if (this.builderState.meals.length === 0) {
            list.innerHTML = `
                <div style="text-align:center; padding:40px; color:#999; border:2px dashed #eee; border-radius:12px;">
                    <span class="material-icons" style="font-size:3rem; opacity:0.3;">restaurant</span>
                    <p>Comece adicionando refeições ao plano.</p>
                    <button onclick="AdminNutritionHandler.addMeal()" class="btn-secondary" style="margin-top:10px;">+ Adicionar Refeição</button>
                </div>`;
            return;
        }

        list.innerHTML = this.builderState.meals.map((meal, mIdx) => `
            <div class="meal-card">
                <div class="meal-header">
                    <div style="display:flex; gap:10px; align-items:center; flex:1;">
                        <input type="time" class="meal-time-input" value="${meal.time}" onchange="AdminNutritionHandler.updateMeal(${mIdx}, 'time', this.value)">
                        <input type="text" class="meal-title-input" value="${meal.name}" placeholder="Nome (Ex: Café da Manhã)" onchange="AdminNutritionHandler.updateMeal(${mIdx}, 'name', this.value)">
                    </div>
                    <button onclick="AdminNutritionHandler.removeMeal(${mIdx})" class="btn-icon-sm" style="color:var(--error-color);">✕</button>
                </div>
                <div class="meal-body">
                    ${meal.foods.map((food, fIdx) => `
                        <div class="food-item-row">
                            <input type="text" class="food-input" placeholder="Alimento" value="${food.food_item}" onchange="AdminNutritionHandler.updateFood(${mIdx}, ${fIdx}, 'food_item', this.value)">
                            <input type="text" class="portion-input" placeholder="Qtd" value="${food.portion}" onchange="AdminNutritionHandler.updateFood(${mIdx}, ${fIdx}, 'portion', this.value)">
                            <button onclick="AdminNutritionHandler.removeFoodFromMeal(${mIdx}, ${fIdx})" class="btn-icon-sm" tabindex="-1">🗑️</button>
                        </div>
                    `).join('')}
                    <button onclick="AdminNutritionHandler.addFoodToMeal(${mIdx})" class="add-food-btn">+ Adicionar Item</button>
                </div>
            </div>
        `).join('');
    },

    // --- SALVAR ---
    async saveDiet() {
        // Agora pega o valor do input hidden
        const studentId = document.getElementById('diet-student').value;
        const title = document.getElementById('diet-title').value;
        const desc = document.getElementById('diet-desc').value;

        if (!studentId) return Toast.warning('Selecione um destinatário.');
        if (!title) return Toast.warning('Dê um título ao plano.');
        
        // Validação básica
        const cleanMeals = this.builderState.meals.map(m => ({
            ...m,
            foods: m.foods.filter(f => f.food_item.trim() !== '')
        })).filter(m => m.foods.length > 0);

        if (cleanMeals.length === 0) return Toast.warning('O plano precisa ter refeições com alimentos.');

        const btn = document.getElementById('btn-save-diet');
        btn.innerText = 'Salvando...';
        btn.disabled = true;

        const { data: session } = await supabase.auth.getSession();
        const currentAdminId = session.session.user.id;
        
        // SE FOR TEMPLATE: Atribui ao próprio Admin
        const assignedTo = (studentId === 'template') ? currentAdminId : studentId;

        const header = {
            title,
            description: desc,
            assigned_to: assignedTo,
            created_by: currentAdminId
        };

        const { error } = await Services.createDietPlan(header, cleanMeals);

        btn.innerText = 'Salvar Plano';
        btn.disabled = false;

        if (error) {
            Toast.error('Erro ao salvar.');
            console.error(error);
        } else {
            Toast.success(studentId === 'template' ? 'Modelo salvo com sucesso!' : 'Plano enviado para aluna!');
            
            // Reset
            this.builderState.meals = [];
            document.getElementById('diet-title').value = '';
            document.getElementById('diet-desc').value = '';
            
            // Reset da seleção
            document.getElementById('diet-student').value = '';
            document.getElementById('student-search-input').value = '';
            
            this.renderMealsList();

            // Se salvou template, atualiza cache
            if(studentId === 'template') {
                this.templatesCache = await Services.getDietTemplates(currentAdminId);
                // Re-renderiza para atualizar select de templates (se houver necessidade)
                // A view vai ser recriada se o user navegar, mas para atualizar o select de "Carregar Modelo" na hora:
                const selectTemplate = document.getElementById('diet-template-load');
                if(selectTemplate) {
                    selectTemplate.innerHTML = '<option value="">-- Não usar modelo --</option>' + 
                        this.templatesCache.map(t => `<option value="${t.id}">${t.title}</option>`).join('');
                }
            }
        }
    }
};