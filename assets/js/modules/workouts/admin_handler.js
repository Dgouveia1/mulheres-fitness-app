import { Services } from '../../core/services.js';
import { Toast } from '../../core/toast.js';
import { AdminWorkoutView } from './view.js';
import { supabase } from '../../core/supabase.js';

export const AdminWorkoutHandler = {
    exercisesCache: [],
    templatesCache: [],
    studentsCache: [],
    
    // Estado do Construtor de Treinos
    builderState: {
        items: []
    },

    // Inicialização
    init() {
        window.AdminWorkoutHandler = this; // Exporta para o escopo global
        this.loadInitialData().then(() => {
            this.renderMain();
        });
    },

    renderMain() {
        const area = document.getElementById('workouts-root');
        
        if(area) {
            area.innerHTML = AdminWorkoutView.Main();
            // Inicia na aba Builder para facilitar o fluxo de trabalho
            this.switchTab('builder'); 
        } else {
            console.warn('Container #workouts-root ainda não existe no DOM.');
        }
    },

    async loadInitialData() {
        try {
            // 1. Carrega Exercícios
            this.exercisesCache = await Services.getAllExercises();
            
            // 2. Carrega Alunas (Garantindo que traga todos com role 'user')
            // Se o role estiver em metadata, ajustamos a query, mas assumindo coluna 'role' na tabela profiles
            const { data: students, error: errStudents } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .eq('role', 'user')
                .order('full_name');
            
            if (errStudents) console.error("Erro ao buscar alunos:", errStudents);
            this.studentsCache = students || [];
            
            // 3. Carrega Templates
            const { data: session } = await supabase.auth.getSession();
            if(session?.session?.user) {
                this.templatesCache = await Services.getTemplates(session.session.user.id);
            }
            
        } catch (e) {
            console.error(e);
            Toast.error('Erro ao carregar dados iniciais.');
        }
    },

    switchTab(tabName) {
        document.querySelectorAll('.workout-tab').forEach(t => t.classList.remove('active'));
        
        // Lógica para encontrar o botão correto baseado no texto ou índice seria frágil
        // Vamos usar o onclick direto no HTML para definir a classe, mas aqui garantimos o estado visual
        const buttons = document.querySelectorAll('.workout-tab');
        if (tabName === 'library') buttons[0].classList.add('active');
        else buttons[1].classList.add('active');

        if (tabName === 'library') {
            this.renderLibrary();
        } else {
            this.renderBuilder();
        }
    },

    // --- LÓGICA DA BIBLIOTECA ---
    renderLibrary() {
        const content = document.getElementById('workout-content-area');
        if(content) content.innerHTML = AdminWorkoutView.LibraryTemplate(this.exercisesCache);
    },

    filterLibrary(term) {
        const filtered = this.exercisesCache.filter(e => e.name.toLowerCase().includes(term.toLowerCase()));
        const grid = document.getElementById('exercise-lib-grid');
        if (grid) {
            // Gambiarra inteligente: Reutiliza o template apenas gerando o grid interno
            // Mas como o Template retorna a header junto, vamos fazer um replace simples no innerHTML do grid
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = AdminWorkoutView.LibraryTemplate(filtered);
            const newGridContent = tempDiv.querySelector('#exercise-lib-grid').innerHTML;
            grid.innerHTML = newGridContent;
        }
    },

    openExerciseModal() {
        const modal = document.getElementById('modal-exercise');
        if(modal) {
            modal.classList.add('active');
            // Reset fields
            document.getElementById('ex-id').value = '';
            document.getElementById('ex-name').value = '';
            document.getElementById('ex-video-file').value = '';
            document.getElementById('ex-image-file').value = '';
            document.getElementById('ex-video-url-hidden').value = '';
            document.getElementById('ex-image-url-hidden').value = '';
            
            // Reset status text
            const vidStatus = document.getElementById('ex-video-status');
            const imgStatus = document.getElementById('ex-image-status');
            if(vidStatus) vidStatus.innerText = 'Selecione um arquivo para substituir o atual (se houver).';
            if(imgStatus) imgStatus.innerText = 'Selecione um arquivo para substituir a atual.';
        }
    },

    editExercise(id) {
        const ex = this.exercisesCache.find(e => e.id == id);
        if(!ex) return;
        
        this.openExerciseModal();
        
        document.getElementById('ex-id').value = ex.id;
        document.getElementById('ex-name').value = ex.name;
        document.getElementById('ex-muscle').value = ex.muscle_group || 'Pernas';
        document.getElementById('ex-video-url-hidden').value = ex.video_url || '';
        document.getElementById('ex-image-url-hidden').value = ex.image_url || '';

        if(ex.video_url) document.getElementById('ex-video-status').innerText = '📹 Vídeo cadastrado. Envie outro para substituir.';
        if(ex.image_url) document.getElementById('ex-image-status').innerText = '🖼️ Imagem cadastrada. Envie outra para substituir.';
    },

    async saveExercise(e) {
        e.preventDefault();
        const id = document.getElementById('ex-id').value;
        const btn = e.target.querySelector('button[type="submit"]');
        const progressBox = document.getElementById('exercise-upload-progress');
        
        const name = document.getElementById('ex-name').value;
        const muscleGroup = document.getElementById('ex-muscle').value;
        
        const videoFile = document.getElementById('ex-video-file').files[0];
        const imageFile = document.getElementById('ex-image-file').files[0];

        let finalVideoUrl = document.getElementById('ex-video-url-hidden').value;
        let finalImageUrl = document.getElementById('ex-image-url-hidden').value;

        btn.disabled = true;
        btn.innerText = 'Salvando...';
        if (videoFile || imageFile) progressBox.style.display = 'block';

        try {
            if (videoFile) finalVideoUrl = await Services.uploadExerciseAsset(videoFile);
            if (imageFile) finalImageUrl = await Services.uploadExerciseAsset(imageFile);

            const payload = { name, muscle_group: muscleGroup, video_url: finalVideoUrl, image_url: finalImageUrl };

            let res;
            if(id) res = await Services.updateExercise(id, payload);
            else res = await Services.createExercise(payload);

            if(res.error) throw res.error;

            Toast.success(id ? 'Exercício atualizado!' : 'Exercício criado!');
            document.getElementById('modal-exercise').classList.remove('active');
            
            // Recarrega e renderiza
            this.exercisesCache = await Services.getAllExercises();
            
            // Se estiver na aba library, atualiza
            if(document.querySelector('.workout-tab.active')?.innerText.includes('Banco')) {
                this.renderLibrary();
            }

        } catch (err) {
            console.error(err);
            Toast.error('Erro: ' + (err.message || 'Falha ao salvar.'));
        } finally {
            btn.disabled = false;
            btn.innerText = 'Salvar';
            progressBox.style.display = 'none';
        }
    },

    async deleteExercise(id) {
        if(!confirm('Tem certeza? Isso pode quebrar treinos existentes.')) return;
        const { error } = await Services.deleteExercise(id);
        if(error) Toast.error('Erro ao excluir.');
        else {
            Toast.success('Exercício removido.');
            this.exercisesCache = this.exercisesCache.filter(e => e.id != id);
            this.renderLibrary();
        }
    },


    // --- LÓGICA DO BUILDER (CONSTRUTOR) ---
    renderBuilder() {
        const content = document.getElementById('workout-content-area');
        if(content) {
            content.innerHTML = AdminWorkoutView.BuilderTemplate(this.studentsCache, this.templatesCache);
            this.renderSourceList();
            this.renderBuilderItems(); // Restaura estado atual se houver
        }
    },

    renderSourceList(filter = '') {
        const list = document.getElementById('builder-source-list');
        if(!list) return;

        const filtered = this.exercisesCache.filter(e => e.name.toLowerCase().includes(filter.toLowerCase()));
        
        if (filtered.length === 0) {
            list.innerHTML = '<div style="padding:20px; color:#999; text-align:center;">Nenhum exercício encontrado.</div>';
            return;
        }

        list.innerHTML = filtered.map(ex => `
            <div class="source-item" onclick="AdminWorkoutHandler.addItem(${ex.id})">
                <div class="s-img" style="background-image:url('${ex.image_url || ''}');">${!ex.image_url ? ex.muscle_group.charAt(0) : ''}</div>
                <div class="s-info">
                    <strong>${ex.name}</strong>
                    <small>${ex.muscle_group}</small>
                </div>
                <span class="material-icons add-icon">add_circle_outline</span>
            </div>
        `).join('');
    },

    filterBuilderList(val) {
        this.renderSourceList(val);
    },

    handleTargetChange(val) {
        const loaderGroup = document.getElementById('template-loader-group');
        // Se selecionar "Salvar como Template", esconde a opção de carregar template para evitar confusão visual?
        // Na verdade, pode ser útil carregar um template para editar e salvar como outro. Vamos manter visível.
        if (val === 'template') {
            // Lógica opcional visual
        }
        
        if (loaderGroup) loaderGroup.style.display = 'block';
    },

    async loadTemplate(templateId) {
        if(!templateId) return;
        
        if(this.builderState.items.length > 0) {
            if(!confirm('Isso substituirá os itens atuais da ficha. Continuar?')) {
                document.getElementById('builder-template-load').value = "";
                return;
            }
        }

        const { data: workout } = await Services.getWorkoutDetails(templateId);
        
        if(workout) {
            document.getElementById('builder-title').value = workout.title;
            document.getElementById('builder-desc').value = workout.description || '';
            document.getElementById('builder-level').value = workout.difficulty_level || 'Iniciante';
            
            this.builderState.items = workout.items.map(item => ({
                exercise: item.exercise,
                sets: item.sets,
                reps: item.reps,
                suggested_load_kg: item.suggested_load_kg,
                rest_seconds: item.rest_seconds
            }));
            
            this.renderBuilderItems();
            Toast.info('Modelo carregado!');
        }
    },

    addItem(exerciseId) {
        const ex = this.exercisesCache.find(e => e.id == exerciseId);
        if(!ex) return;

        this.builderState.items.push({
            exercise: ex,
            sets: 3,
            reps: '12',
            suggested_load_kg: 0,
            rest_seconds: 60
        });
        
        this.renderBuilderItems();
        
        // Auto-scroll para o final da lista
        setTimeout(() => {
            const area = document.getElementById('builder-items-area');
            if(area) area.scrollTop = area.scrollHeight;
        }, 50);
        
        Toast.info('Adicionado!', 'info', 1000);
    },

    removeItem(index) {
        this.builderState.items.splice(index, 1);
        this.renderBuilderItems();
    },

    updateItem(index, field, value) {
        if (this.builderState.items[index]) {
            this.builderState.items[index][field] = value;
        }
    },

    renderBuilderItems() {
        const area = document.getElementById('builder-items-area');
        const badge = document.getElementById('items-count-badge');
        
        if(!area) return;

        if (this.builderState.items.length === 0) {
            area.innerHTML = `
                <div class="empty-builder-state">
                    <span class="material-icons" style="font-size:3rem; color:#e5e7eb;">playlist_add_check</span>
                    <h3>Ficha Vazia</h3>
                    <p>Clique no ícone <strong>(+)</strong> nos exercícios da lista à esquerda para começar a montar o treino.</p>
                </div>
            `;
            if(badge) badge.innerText = '0 exercícios';
            return;
        }

        area.innerHTML = this.builderState.items.map((item, idx) => 
            AdminWorkoutView.BuilderItem(item.exercise, idx, item)
        ).join('');
        
        if(badge) badge.innerText = `${this.builderState.items.length} exercícios`;
    },

    async saveWorkoutRoutine() {
        const studentId = document.getElementById('builder-student').value;
        const title = document.getElementById('builder-title').value;
        const desc = document.getElementById('builder-desc').value;
        const level = document.getElementById('builder-level').value;

        if (!studentId) return Toast.warning('Selecione um destinatário (Aluna ou Salvar como Modelo).');
        if (!title) return Toast.warning('Dê um título ao treino.');
        if (this.builderState.items.length === 0) return Toast.warning('Adicione exercícios antes de salvar.');

        const { data: session } = await supabase.auth.getSession();
        const currentAdminId = session.session.user.id;

        const assignedTo = (studentId === 'template') ? currentAdminId : studentId;

        const workoutHeader = {
            title,
            description: desc,
            difficulty_level: level,
            assigned_to: assignedTo,
            created_by: currentAdminId
        };

        const itemsPayload = this.builderState.items.map((i, idx) => ({
            exercise_id: i.exercise.id,
            sets: i.sets,
            reps: i.reps,
            rest_seconds: i.rest_seconds,
            suggested_load_kg: i.suggested_load_kg,
            order_index: idx
        }));

        Toast.info('Salvando treino...');
        
        // Chamada de serviço unificada
        const { error } = await Services.createWorkoutRoutine(workoutHeader, itemsPayload);

        if (error) {
            console.error(error);
            Toast.error('Erro ao salvar.');
        } else {
            Toast.success('Treino salvo com sucesso!');
            
            // Reset do Builder
            this.builderState.items = [];
            document.getElementById('builder-title').value = '';
            document.getElementById('builder-desc').value = '';
            document.getElementById('builder-student').value = '';
            this.renderBuilderItems();

            // Se salvou como template, recarrega cache
            if(studentId === 'template') {
                this.templatesCache = await Services.getTemplates(currentAdminId);
            }
        }
    }
};