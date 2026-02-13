// assets/js/core/services.js
import { supabase } from './supabase.js';

export const Services = {
    // =========================================================================
    // MÓDULO 1: FITFLIX (VÍDEOS)
    // =========================================================================

    async getVideos() {
        const { data, error } = await supabase
            .from('fitflix_videos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar vídeos:', error);
            return [];
        }
        return data;
    },

    async getVideoById(id) {
        if (!id) return null;
        const { data, error } = await supabase
            .from('fitflix_videos')
            .select('*')
            .eq('id', id)
            .single();
        return error ? null : data;
    },

    async uploadFitFlixFile(file, folder) {
        const cleanName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.]/g, "_");
        const filePath = `${folder}/${Date.now()}_${cleanName}`;

        const { error } = await supabase.storage
            .from('fitflix_content')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('fitflix_content')
            .getPublicUrl(filePath);
        return publicUrl;
    },

    async createVideo(videoData) {
        const { data, error } = await supabase.from('fitflix_videos').insert([videoData]).select().single();
        return { data, error };
    },

    async updateVideo(id, updateData) {
        const { data, error } = await supabase.from('fitflix_videos').update(updateData).eq('id', id).select().single();
        return { data, error };
    },

    async deleteVideo(id) {
        const { error } = await supabase.from('fitflix_videos').delete().eq('id', id);
        return { error };
    },

    async getFitFlixCategories() {
        const { data, error } = await supabase.from('fitflix_categories').select('*').order('name');
        return error ? [] : data;
    },

    async createFitFlixCategory(name) {
        const { data, error } = await supabase.from('fitflix_categories').insert([{ name }]).select().single();
        return { data, error };
    },

    async updateFitFlixCategory(id, name) {
        const { data, error } = await supabase.from('fitflix_categories').update({ name }).eq('id', id).select().single();
        return { data, error };
    },

    async deleteFitFlixCategory(id) {
        const { error } = await supabase.from('fitflix_categories').delete().eq('id', id);
        return { error };
    },


    // =========================================================================
    // MÓDULO 2: FITGRAN (SOCIAL)
    // =========================================================================

    async getPosts(currentUserId) {
        // Removido avatar_url da query
        let { data, error } = await supabase
            .from('fitgran_posts')
            .select(`*, profiles:user_id (full_name)`)
            .order('created_at', { ascending: false });

        if (error || !data) return [];

        if (currentUserId) {
            const { data: likes } = await supabase
                .from('fitgran_likes')
                .select('post_id')
                .eq('user_id', currentUserId);

            const likedSet = new Set(likes?.map(l => l.post_id));
            data = data.map(p => ({ ...p, is_liked: likedSet.has(p.id) }));
        }
        return data;
    },

    async toggleLike(postId, userId) {
        const { data: existing } = await supabase
            .from('fitgran_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .single();

        if (existing) {
            await supabase.from('fitgran_likes').delete().eq('id', existing.id);
        } else {
            await supabase.from('fitgran_likes').insert([{ post_id: postId, user_id: userId }]);
        }

        const { count } = await supabase
            .from('fitgran_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        await supabase.from('fitgran_posts').update({ likes_count: count }).eq('id', postId);
        return { success: true, newCount: count };
    },

    async getComments(postId) {
        // Removido avatar_url da query
        const { data } = await supabase
            .from('fitgran_comments')
            .select(`*, profiles:user_id (full_name)`)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        return data || [];
    },

    async addComment(postId, userId, content) {
        // Removido avatar_url da query
        const { data, error } = await supabase
            .from('fitgran_comments')
            .insert([{ post_id: postId, user_id: userId, content }])
            .select(`*, profiles:user_id (full_name)`)
            .single();
        return { data, error };
    },

    async uploadPostImage(file, userId) {
        const cleanName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.]/g, "_");
        const filePath = `${userId}/${Date.now()}_${cleanName}`;

        const { error } = await supabase.storage.from('fitflix_post').upload(filePath, file);
        if (error) return null;

        const { data: { publicUrl } } = supabase.storage.from('fitflix_post').getPublicUrl(filePath);
        return publicUrl;
    },

    async createPost(userId, imageUrl, caption) {
        const { data, error } = await supabase
            .from('fitgran_posts')
            .insert([{ user_id: userId, image_url: imageUrl, caption }])
            .select().single();
        return { data, error };
    },


    // =========================================================================
    // MÓDULO 3: TREINOS (APP ALUNA)
    // =========================================================================

    async getMyWorkouts(userId) {
        const { data, error } = await supabase
            .from('workouts')
            .select(`
                *,
                items:workout_items (
                    id, sets, reps, rest_seconds, suggested_load_kg, order_index,
                    exercise:exercises (id, name, image_url, video_url, muscle_group)
                )
            `)
            .eq('assigned_to', userId)
            .order('created_at', { ascending: false });

        if (data) {
            data.forEach(w => {
                if (w.items) w.items.sort((a, b) => a.order_index - b.order_index);
            });
        }
        return data || [];
    },

    async logWorkoutSet(logData) {
        const { data } = await supabase.from('workout_logs').insert([logData]);
        return data;
    },

    async getUserStats(userId) {
        const { data: logs } = await supabase
            .from('workout_logs')
            .select('performed_at, reps_performed, load_kg')
            .eq('user_id', userId)
            .order('performed_at', { ascending: false });

        if (!logs) return { totalWorkouts: 0, streak: 0, weeklyFreq: [0, 0, 0, 0, 0, 0, 0], totalTonnage: 0 };

        const uniqueDays = new Set(logs.map(l => l.performed_at.split('T')[0]));

        const weeklyFreq = [0, 0, 0, 0, 0, 0, 0];
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        logs.forEach(l => {
            const d = new Date(l.performed_at);
            if (d >= startOfWeek) weeklyFreq[d.getDay()] = 1;
        });

        return {
            totalWorkouts: uniqueDays.size,
            streak: uniqueDays.size > 0 ? 1 : 0,
            weeklyFreq
        };
    },

    async getDashboardStats(userId) {
        const { count } = await supabase
            .from('workout_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        return { completedWorkouts: count || 0 };
    },


    // =========================================================================
    // MÓDULO 4: AGENDA & CLIENTES
    // =========================================================================

    async getAppointments(startDate, endDate) {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('time', { ascending: true });
        return error ? [] : data;
    },

    async searchAppointments(term) {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .ilike('client_name', `%${term}%`)
            .order('date', { ascending: false }) // Mais recentes primeiro
            .order('time', { ascending: true })
            .limit(50);
        return error ? [] : data;
    },

    async checkAppointmentAvailability(date, time, type, excludeId = null) {
        let query = supabase
            .from('appointments')
            .select('id', { count: 'exact', head: true })
            .eq('date', date)
            .eq('time', time)
            .eq('type', type)
            .neq('status', 'cancelled');

        if (excludeId) query = query.neq('id', excludeId);

        const { count, error } = await query;
        return (error) ? false : (count === 0);
    },

    async createAppointment(apptData) {
        const { data, error } = await supabase.from('appointments').insert([apptData]).select().single();
        return { data, error };
    },

    async updateAppointment(id, apptData) {
        const { data, error } = await supabase.from('appointments').update(apptData).eq('id', id).select().single();
        return { data, error };
    },

    async deleteAppointment(id) {
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        return { error };
    },

    async getClients() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'user')
            .order('full_name');
        return error ? [] : data;
    },

    async createClientAccount(email, password, fullName, unit) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: 'user',
                    unit: unit
                }
            }
        });
        return { data, error };
    },

    async getClientDetails(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        return { data, error };
    },

    async getAssessments(userId) {
        const { data, error } = await supabase
            .from('assessments')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar avaliações:', error);
            return [];
        }
        return data;
    },

    async createAssessment(payload) {
        const { data, error } = await supabase
            .from('assessments')
            .insert([payload])
            .select()
            .single();
        return { data, error };
    },


    // =========================================================================
    // MÓDULO 5: CHAT (ATUALIZADO)
    // =========================================================================
    async getChatContacts() {
        const { data, error } = await supabase.from('profiles').select('id, full_name, role, unit').order('full_name');
        return error ? [] : data;
    },
    async getRecentMessagesSummary(currentUserId) {
        // Busca 100 ultimas mensagens onde sou remetente, destinatario ou destinatario é nulo (grupo)
        const { data, error } = await supabase
            .from('messages')
            .select('sender_id, recipient_id, content, created_at')
            .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId},recipient_id.is.null`)
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) return [];
        return data;
    },
    async getChatMessages(senderId, recipientId, limit = 20, offset = 0) {
        let query = supabase.from('messages').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
        if (recipientId === 'STAFF_GROUP') {
            query = query.is('recipient_id', null);
        } else {
            query = query.or(`and(sender_id.eq.${senderId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${senderId})`);
        }
        const { data, error } = await query;
        return error ? [] : data.reverse();
    },
    async sendMessage(senderId, recipientId, content) {
        const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', senderId).single();
        const payload = {
            sender_id: senderId,
            content,
            sender_name: profile?.full_name || 'Usuário',
            recipient_id: (recipientId === 'STAFF_GROUP') ? null : recipientId
        };
        const { data, error } = await supabase.from('messages').insert([payload]).select().single();
        return { data, error };
    },

    // =========================================================================
    // MÓDULO 6: GESTÃO DE TREINOS
    // =========================================================================

    async uploadExerciseAsset(file) {
        const cleanName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.]/g, "_");
        const filePath = `${Date.now()}_${cleanName}`;

        const { error } = await supabase.storage
            .from('exercise-assets')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('exercise-assets')
            .getPublicUrl(filePath);
        return publicUrl;
    },

    async getAllExercises() {
        const { data, error } = await supabase.from('exercises').select('*').order('name');
        return error ? [] : data;
    },

    async createExercise(exData) {
        const { data, error } = await supabase.from('exercises').insert([exData]).select().single();
        return { data, error };
    },

    async updateExercise(id, exData) {
        const { data, error } = await supabase.from('exercises').update(exData).eq('id', id).select().single();
        return { data, error };
    },

    async deleteExercise(id) {
        const { error } = await supabase.from('exercises').delete().eq('id', id);
        return { error };
    },

    async getTemplates(adminId) {
        const { data, error } = await supabase
            .from('workouts')
            .select(`*, items:workout_items (count)`)
            .eq('assigned_to', adminId)
            .order('created_at', { ascending: false });
        return data || [];
    },

    async getWorkoutDetails(workoutId) {
        const { data, error } = await supabase
            .from('workouts')
            .select(`
                *,
                items:workout_items (
                    id, sets, reps, rest_seconds, suggested_load_kg, order_index, exercise_id,
                    exercise:exercises (id, name, muscle_group, image_url)
                )
            `)
            .eq('id', workoutId)
            .single();

        if (data && data.items) {
            data.items.sort((a, b) => a.order_index - b.order_index);
        }
        return { data, error };
    },

    async createWorkoutRoutine(workoutData, items) {
        const { data: workout, error: wError } = await supabase
            .from('workouts')
            .insert([workoutData])
            .select()
            .single();

        if (wError) return { error: wError };

        if (items && items.length > 0) {
            const itemsPayload = items.map((item, idx) => ({
                workout_id: workout.id,
                exercise_id: item.exercise_id,
                sets: item.sets,
                reps: item.reps,
                rest_seconds: item.rest_seconds,
                suggested_load_kg: item.suggested_load_kg || 0,
                order_index: idx
            }));

            const { error: iError } = await supabase
                .from('workout_items')
                .insert(itemsPayload);

            if (iError) {
                await supabase.from('workouts').delete().eq('id', workout.id);
                return { error: iError };
            }
        }
        return { data: workout };
    },

    async deleteWorkout(id) {
        await supabase.from('workout_items').delete().eq('workout_id', id);
        const { error } = await supabase.from('workouts').delete().eq('id', id);
        return { error };
    },

    // =========================================================================
    // MÓDULO 7: NUTRIÇÃO
    // =========================================================================

    async getActiveDiet(userId) {
        const { data: diet, error } = await supabase
            .from('diets')
            .select('*')
            .eq('assigned_to', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !diet) return null;

        const { data: meals } = await supabase
            .from('diet_meals')
            .select(`*, foods:diet_foods(*)`)
            .eq('diet_id', diet.id)
            .order('order_index', { ascending: true });

        if (meals) {
            meals.forEach(meal => {
                if (meal.foods) meal.foods.sort((a, b) => a.order_index - b.order_index);
            });
        }

        return { ...diet, meals: meals || [] };
    },

    async getDietTemplates(adminId) {
        const { data, error } = await supabase
            .from('diets')
            .select('*')
            .eq('assigned_to', adminId)
            .order('created_at', { ascending: false });
        return data || [];
    },

    async getDietById(dietId) {
        const { data: diet, error } = await supabase
            .from('diets')
            .select('*')
            .eq('id', dietId)
            .single();

        if (error || !diet) return null;

        const { data: meals } = await supabase
            .from('diet_meals')
            .select(`*, foods:diet_foods(*)`)
            .eq('diet_id', diet.id)
            .order('order_index', { ascending: true });

        if (meals) {
            meals.forEach(meal => {
                if (meal.foods) meal.foods.sort((a, b) => a.order_index - b.order_index);
            });
        }

        return { ...diet, meals: meals || [] };
    },

    async createDietPlan(dietHeader, mealsData) {
        const { data: diet, error: dError } = await supabase
            .from('diets')
            .insert([dietHeader])
            .select()
            .single();

        if (dError) return { error: dError };

        for (let i = 0; i < mealsData.length; i++) {
            const meal = mealsData[i];

            const { data: newMeal, error: mError } = await supabase
                .from('diet_meals')
                .insert([{
                    diet_id: diet.id,
                    name: meal.name,
                    time: meal.time,
                    order_index: i
                }])
                .select()
                .single();

            if (mError) continue;

            if (meal.foods && meal.foods.length > 0) {
                const foodsPayload = meal.foods.map((f, idx) => ({
                    meal_id: newMeal.id,
                    food_item: f.food_item,
                    portion: f.portion,
                    order_index: idx
                }));

                await supabase.from('diet_foods').insert(foodsPayload);
            }
        }

        return { data: diet };
    }
};