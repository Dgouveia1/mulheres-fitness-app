export const AdminWorkoutView = {
    // 1. Estrutura Principal da Aba de Treinos (ADMIN)
    Main: () => `
        <div class="admin-page-header">
            <h1>Gestão de Treinos</h1>
            <p>Gerencie exercícios e crie fichas personalizadas para suas alunas.</p>
        </div>
        
        <div class="workouts-wrapper">
            <div class="workout-tabs-container">
                <button class="workout-tab" onclick="AdminWorkoutHandler.switchTab('library')">
                    <span class="material-icons">fitness_center</span> Banco de Exercícios
                </button>
                <button class="workout-tab active" onclick="AdminWorkoutHandler.switchTab('builder')">
                    <span class="material-icons">build</span> Construtor de Fichas
                </button>
            </div>

            <!-- Área Dinâmica de Conteúdo -->
            <div id="workout-content-area" class="workout-content-area">
                <div class="loader-spinner" style="margin: 50px auto;"></div>
            </div>
        </div>

        <!-- MODAL: Novo/Editar Exercício -->
        <div id="modal-exercise" class="modal-overlay">
            <div class="modal-content">
                <div class="row-between" style="margin-bottom:20px;">
                    <h3>Dados do Exercício</h3>
                    <button type="button" class="btn-icon-sm" onclick="document.getElementById('modal-exercise').classList.remove('active')">✕</button>
                </div>
                <form onsubmit="AdminWorkoutHandler.saveExercise(event)">
                    <input type="hidden" id="ex-id">
                    
                    <div class="form-group">
                        <label>Nome do Exercício</label>
                        <input type="text" id="ex-name" name="name" required placeholder="Ex: Agachamento Livre">
                    </div>
                    
                    <div class="form-group">
                        <label>Grupo Muscular</label>
                        <select id="ex-muscle" name="muscle_group" required>
                            <option value="Pernas">Pernas</option>
                            <option value="Glúteos">Glúteos</option>
                            <option value="Costas">Costas</option>
                            <option value="Peito">Peito</option>
                            <option value="Ombros">Ombros</option>
                            <option value="Braços">Braços</option>
                            <option value="Abdômen">Abdômen</option>
                            <option value="Cardio">Cardio</option>
                        </select>
                    </div>

                    <!-- UPLOAD DE VÍDEO -->
                    <div class="form-group">
                        <label>Vídeo do Exercício (Opcional)</label>
                        <input type="file" id="ex-video-file" name="video_file" accept="video/*">
                        <input type="hidden" id="ex-video-url-hidden">
                        <small id="ex-video-status" style="color:#999; display:block; margin-top:4px;">Selecione um arquivo para substituir o atual (se houver).</small>
                    </div>

                    <!-- UPLOAD DE IMAGEM -->
                    <div class="form-group">
                        <label>Imagem de Capa (Opcional)</label>
                        <input type="file" id="ex-image-file" name="image_file" accept="image/*">
                        <input type="hidden" id="ex-image-url-hidden">
                        <small id="ex-image-status" style="color:#999; display:block; margin-top:4px;">Selecione um arquivo para substituir a atual.</small>
                    </div>

                    <div id="exercise-upload-progress" style="display:none; margin-top:15px; background:#f9fafb; padding:10px; border-radius:6px;">
                        <span style="font-size:0.85rem; color:var(--primary-color); font-weight:600;">Enviando arquivos... aguarde.</span>
                    </div>

                    <div style="display:flex; justify-content:flex-end; margin-top:20px;">
                        <button type="button" class="btn-secondary" onclick="document.getElementById('modal-exercise').classList.remove('active')" style="margin-right:10px;">Cancelar</button>
                        <button type="submit" class="btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    `,

    // 2. Template da Biblioteca de Exercícios (Visualização em Grid)
    LibraryTemplate: (exercises) => `
        <div class="library-header">
            <div class="search-box" style="flex:1; max-width:400px;">
                <input type="text" id="search-exercise-lib" placeholder="🔍 Buscar exercício por nome..." onkeyup="AdminWorkoutHandler.filterLibrary(this.value)" class="custom-select">
            </div>
            <button class="btn-admin-primary" onclick="AdminWorkoutHandler.openExerciseModal()">+ Novo Exercício</button>
        </div>
        
        <div class="exercise-grid" id="exercise-lib-grid">
            ${exercises.length > 0 ? exercises.map(ex => `
                <div class="exercise-card">
                    <div class="ex-media" style="background-image:url('${ex.image_url || 'https://placehold.co/300x200/eee/999?text=' + ex.name.charAt(0)}');">
                        <div class="ex-badge">${ex.muscle_group}</div>
                    </div>
                    <div class="ex-info">
                        <h4>${ex.name}</h4>
                        <div class="ex-actions">
                            <button onclick="AdminWorkoutHandler.editExercise(${ex.id})" title="Editar"><span class="material-icons" style="font-size:1.1rem;">edit</span></button>
                            <button onclick="AdminWorkoutHandler.deleteExercise(${ex.id})" title="Excluir" style="color:var(--error-color);"><span class="material-icons" style="font-size:1.1rem;">delete</span></button>
                            ${ex.video_url ? `<button onclick="window.open('${ex.video_url}', '_blank')" title="Ver Vídeo" style="color:var(--primary-color);"><span class="material-icons" style="font-size:1.1rem;">play_circle</span></button>` : ''}
                        </div>
                    </div>
                </div>
            `).join('') : '<div style="grid-column: 1/-1; text-align:center; padding:40px; color:#999;">Nenhum exercício cadastrado.</div>'}
        </div>
    `,

    // 3. Template do Construtor (Design Renovado)
    BuilderTemplate: (students, templates) => `
        <div class="builder-container">
            
            <!-- ESQUERDA: CONFIGURAÇÃO & LISTA -->
            <div class="builder-sidebar">
                <!-- Painel 1: Destinatário e Dados -->
                <div class="builder-panel" style="flex-shrink: 0;">
                    <div class="panel-header">
                        <h3><span class="material-icons">person</span> Destinatário</h3>
                    </div>
                    <div class="panel-body">
                        <div class="form-group">
                            <label>Para quem é este treino?</label>
                            <select id="builder-student" onchange="AdminWorkoutHandler.handleTargetChange(this.value)" class="custom-select" style="font-weight:600;">
                                <option value="" disabled selected>-- Selecione --</option>
                                <option value="template" style="color:var(--primary-color); font-weight:bold;">💾 Salvar como MODELO (Template)</option>
                                <optgroup label="Alunas Cadastradas">
                                    ${students && students.length > 0 ? students.map(s => `<option value="${s.id}">${s.full_name}</option>`).join('') : '<option disabled>Nenhuma aluna encontrada</option>'}
                                </optgroup>
                            </select>
                        </div>
                        
                        <div id="template-loader-group" style="display:none; margin-top:10px; padding-top:10px; border-top:1px dashed #eee;">
                            <label style="font-size:0.8rem; color:#666;">Carregar modelo existente (opcional):</label>
                            <select id="builder-template-load" onchange="AdminWorkoutHandler.loadTemplate(this.value)" class="custom-select" style="font-size:0.85rem;">
                                <option value="">-- Não usar modelo --</option>
                                ${templates.map(t => `<option value="${t.id}">${t.title} (${t.difficulty_level})</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Painel 2: Lista de Exercícios -->
                <div class="builder-panel" style="flex:1; display:flex; flex-direction:column;">
                    <div class="panel-header" style="padding:10px 16px;">
                        <input type="text" placeholder="🔎 Filtrar exercícios..." class="custom-select" onkeyup="AdminWorkoutHandler.filterBuilderList(this.value)" style="padding:8px; font-size:0.9rem;">
                    </div>
                    <div id="builder-source-list" class="source-list">
                        <!-- Lista injetada via JS -->
                        <div class="loader-spinner"></div>
                    </div>
                </div>
            </div>

            <!-- DIREITA: A FICHA EM CONSTRUÇÃO -->
            <div class="builder-workspace">
                <div class="workspace-header">
                    <div>
                        <input type="text" id="builder-title" placeholder="Nome do Treino (Ex: Treino A - Pernas)" style="font-size:1.2rem; font-weight:700; border:none; border-bottom:2px solid #eee; padding:5px; width:100%; outline:none; color:var(--primary-color);">
                    </div>
                    <div style="display:flex; gap:10px;">
                        <select id="builder-level" class="custom-select" style="width:auto; padding:5px 10px;">
                            <option value="Iniciante">Iniciante</option>
                            <option value="Intermediário">Intermediário</option>
                            <option value="Avançado">Avançado</option>
                        </select>
                    </div>
                </div>
                
                <div style="padding: 0 20px; margin-top:10px;">
                    <input type="text" id="builder-desc" placeholder="Adicione uma descrição ou observação para a aluna..." style="width:100%; padding:8px; border:1px solid #eee; border-radius:6px; font-size:0.9rem;">
                </div>

                <div id="builder-items-area" class="builder-items-area">
                    <div class="empty-builder-state">
                        <span class="material-icons" style="font-size:4rem; opacity:0.2;">playlist_add_check</span>
                        <h3>Ficha Vazia</h3>
                        <p>Clique no ícone <strong>(+)</strong> nos exercícios ao lado para adicionar.</p>
                    </div>
                </div>

                <div class="builder-footer">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span id="items-count-badge" style="color:#666; font-size:0.9rem;">0 exercícios</span>
                        <button class="btn-primary" onclick="AdminWorkoutHandler.saveWorkoutRoutine()" style="padding:12px 24px; font-size:1rem; display:flex; align-items:center; gap:8px;">
                            <span class="material-icons">save</span> Salvar Treino
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,

    // 4. Item Individual na Ficha (ADMIN)
    BuilderItem: (exercise, index, data = {}) => `
        <div class="builder-item-card" id="b-item-${index}">
            <div class="b-item-header">
                <span class="b-item-number">${index + 1}</span>
                <strong class="b-item-name">${exercise.name}</strong>
                <button class="btn-icon-sm remove" onclick="AdminWorkoutHandler.removeItem(${index})" title="Remover" style="color:#ef4444;">✕</button>
            </div>
            <div class="b-item-controls">
                <div class="b-control">
                    <label>Séries</label>
                    <input type="number" value="${data.sets || 3}" min="1" onchange="AdminWorkoutHandler.updateItem(${index}, 'sets', this.value)">
                </div>
                <div class="b-control">
                    <label>Reps</label>
                    <input type="text" value="${data.reps || '12'}" onchange="AdminWorkoutHandler.updateItem(${index}, 'reps', this.value)">
                </div>
                <div class="b-control">
                    <label>Carga(kg)</label>
                    <input type="number" value="${data.suggested_load_kg || 0}" min="0" onchange="AdminWorkoutHandler.updateItem(${index}, 'suggested_load_kg', this.value)">
                </div>
                <div class="b-control">
                    <label>Desc.(s)</label>
                    <input type="number" value="${data.rest_seconds || 60}" step="10" min="0" onchange="AdminWorkoutHandler.updateItem(${index}, 'rest_seconds', this.value)">
                </div>
            </div>
        </div>
    `
};

// =======================================================
// VISUALIZAÇÃO DA ALUNA (Exportada separadamente agora)
// =======================================================
export const StudentWorkoutView = {
    List: (workouts) => {
        if (!workouts || workouts.length === 0) {
            return `
                <div class="page-content" style="text-align:center; padding-top:60px;">
                    <span class="material-icons" style="font-size:4rem; color:#e5e7eb; margin-bottom:16px;">fitness_center</span>
                    <h3 style="color:#666;">Sem treinos ainda</h3>
                    <p style="color:#999; margin-top:8px;">Aguarde sua treinadora montar sua ficha personalizada.</p>
                </div>
            `;
        }

        return `
            <div class="page-content">
                <h2 class="section-title">Meus Treinos</h2>
                <div class="workouts-list-student">
                    ${workouts.map(w => `
                        <div class="workout-card-student" onclick="StudentWorkoutHandler.openSession(${w.id})">
                            <div class="wc-info">
                                <h3>${w.title}</h3>
                                <p>${w.description || 'Sem descrição'}</p>
                                <div class="wc-meta">
                                    <span class="badge">${w.items ? w.items.length : 0} exercícios</span>
                                    <span class="badge">${w.difficulty_level || 'Geral'}</span>
                                </div>
                            </div>
                            <div class="wc-action">
                                <span class="material-icons">play_circle</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <!-- MODAL DE SESSÃO DE TREINO (PLAYER) -->
                <div id="workout-modal" class="modal-fullscreen">
                    <div class="timer-overlay">
                        <div class="timer-circle">
                            <span id="timer-countdown">60</span>
                        </div>
                        <p style="color:white; font-weight:600; margin-top:20px;">Descanso</p>
                        <button id="skip-timer-btn" class="btn-secondary" style="background:white; margin-top:20px; color:var(--primary-color);">Pular Descanso</button>
                    </div>

                    <div class="session-header">
                        <button class="btn-icon-sm" onclick="document.getElementById('workout-modal').classList.remove('active')">
                            <span class="material-icons" style="color:white;">close</span>
                        </button>
                        <h3 id="modal-ex-name" style="color:white;">Nome do Exercício</h3>
                        <span style="width:32px;"></span> 
                    </div>

                    <div class="session-body">
                        <div id="modal-media" class="session-media">
                            <!-- Video ou Imagem aqui -->
                        </div>
                        
                        <div class="session-controls">
                            <div class="session-info-bar">
                                <span id="modal-ex-muscle" class="badge-outline">Músculo</span>
                                <span id="modal-meta-info" class="meta-text">3 x 12</span>
                            </div>

                            <div class="set-tracker" id="modal-dots">
                                <!-- Dots injetados via JS -->
                            </div>

                            <h2 id="modal-set-text" style="text-align:center; margin:15px 0; color:var(--primary-color);">Série 1</h2>
                            
                            <div class="input-grid">
                                <div class="input-group">
                                    <label>Carga (kg)</label>
                                    <input type="number" id="input-load" value="0">
                                </div>
                                <div class="input-group">
                                    <label>Repetições</label>
                                    <input type="number" id="input-reps" value="12">
                                </div>
                            </div>

                            <button id="modal-action-btn" class="btn-primary btn-lg" style="margin-top:20px; width:100%; padding:16px; font-size:1.1rem; border-radius:30px;">
                                Concluir Série
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};