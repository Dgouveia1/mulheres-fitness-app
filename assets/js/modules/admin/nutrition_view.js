export const AdminNutritionView = {
    // Container Principal
    Main: () => `
        <div id="nutrition-root">
            <div class="loader-spinner" style="margin:50px auto;"></div>
        </div>
    `,

    // Builder agora aceita templates como argumento
    Builder: (students, templates) => `
        <div class="admin-page-header">
            <h1>Gestão Nutricional</h1>
            <p>Crie planos alimentares ou utilize seus modelos salvos.</p>
        </div>

        <div class="diet-builder-wrapper">
            <!-- COLUNA ESQUERDA: Configuração -->
            <div style="flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 20px;">
                <div class="card" style="background:white; padding:20px; border:1px solid #e5e7eb;">
                    <h3 style="margin-bottom:15px; color:var(--primary-color);">1. Destinatário</h3>
                    
                    <div class="form-group" style="position:relative;">
                        <label>Para quem é este plano?</label>
                        
                        <!-- Input Escondido para Guardar o ID Selecionado -->
                        <input type="hidden" id="diet-student">

                        <!-- Campo de Busca Interativo -->
                        <div style="position:relative;">
                            <input type="text" 
                                   id="student-search-input" 
                                   class="custom-select" 
                                   placeholder="🔍 Buscar aluna..." 
                                   autocomplete="off"
                                   onfocus="AdminNutritionHandler.showStudentDropdown()"
                                   onkeyup="AdminNutritionHandler.filterStudentDropdown(this.value)"
                                   style="padding-right: 30px; cursor: text;">
                            
                            <span class="material-icons" 
                                  onclick="AdminNutritionHandler.toggleStudentDropdown()"
                                  style="position:absolute; right:10px; top:50%; transform:translateY(-50%); color:#999; cursor:pointer;">
                                  expand_more
                            </span>

                            <!-- Lista Suspensa -->
                            <div id="student-dropdown-list" 
                                 style="display:none; position:absolute; top:100%; left:0; width:100%; background:white; border:1px solid #ddd; border-radius:8px; max-height:250px; overflow-y:auto; z-index:100; box-shadow:0 4px 15px rgba(0,0,0,0.1); margin-top:5px;">
                                
                                <!-- Opção Fixa: Template -->
                                <div onclick="AdminNutritionHandler.selectTarget('template', '💾 Salvar como MODELO (Template)')" 
                                     style="padding:12px; border-bottom:1px solid #eee; cursor:pointer; background:#fdf2f8; color:var(--primary-color); font-weight:700; display:flex; align-items:center; gap:8px;">
                                    <span class="material-icons">save</span> Salvar como MODELO
                                </div>
                                
                                <!-- Lista de Alunas -->
                                <div id="student-list-content">
                                    ${students && students.length > 0 ? students.map(s => `
                                        <div class="dropdown-item-student" onclick="AdminNutritionHandler.selectTarget('${s.id}', '${s.full_name}')" 
                                             style="padding:10px 12px; border-bottom:1px solid #f9f9f9; cursor:pointer; display:flex; align-items:center; gap:8px; color:#333;">
                                            <div style="width:24px; height:24px; background:#eee; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; color:#666;">${s.full_name.charAt(0)}</div>
                                            ${s.full_name}
                                        </div>
                                    `).join('') : '<div style="padding:15px; color:#999; text-align:center;">Nenhuma aluna encontrada</div>'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Carregador de Template (visível após interação ou se houver templates) -->
                    <div id="diet-template-loader-group" style="display:${templates && templates.length > 0 ? 'block' : 'none'}; margin-top:10px; padding-top:10px; border-top:1px dashed #eee;">
                        <label style="font-size:0.8rem; color:#666;">Carregar modelo base (opcional):</label>
                        <select id="diet-template-load" onchange="AdminNutritionHandler.loadTemplate(this.value)" class="custom-select" style="font-size:0.85rem;">
                            <option value="">-- Não usar modelo --</option>
                            ${templates && templates.length > 0 ? templates.map(t => `<option value="${t.id}">${t.title}</option>`).join('') : '<option disabled>Nenhum modelo salvo</option>'}
                        </select>
                    </div>
                </div>

                <div class="card" style="background:white; padding:20px; border:1px solid #e5e7eb;">
                    <h3 style="margin-bottom:15px; color:var(--primary-color);">2. Detalhes</h3>
                    <div class="form-group">
                        <label>Título do Plano</label>
                        <input type="text" id="diet-title" placeholder="Ex: Protocolo Low Carb" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px;">
                    </div>
                    <div class="form-group">
                        <label>Observações</label>
                        <textarea id="diet-desc" rows="3" placeholder="Instruções gerais..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:8px; resize:none;"></textarea>
                    </div>
                </div>

                <button id="btn-save-diet" class="btn-primary" onclick="AdminNutritionHandler.saveDiet()" style="padding:15px; font-size:1.1rem; margin-top:auto;">
                    Salvar Plano
                </button>
            </div>

            <!-- COLUNA DIREITA: Refeições -->
            <div style="flex: 2; display: flex; flex-direction: column; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; min-height: 500px;">
                <div style="padding: 15px; background: white; border-bottom: 1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="color:#333;">Cardápio Diário</h3>
                    <button class="btn-secondary" onclick="AdminNutritionHandler.addMeal()" style="color:var(--nutri-color); border-color:var(--nutri-color);">+ Nova Refeição</button>
                </div>
                
                <div id="meals-builder-list" style="flex: 1; padding: 20px; overflow-y: auto;">
                    <!-- Lista de Refeições Aqui -->
                </div>
            </div>
        </div>
    `
};