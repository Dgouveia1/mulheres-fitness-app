// assets/js/services.js
import { supabase } from './supabase.js';

export const Services = {
    // --- FitFlix (Vídeos) ---
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
        if (!id) return null; // Previne erro de ID nulo

        const { data, error } = await supabase
            .from('fitflix_videos')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) return null;
        return data;
    },

    // --- FitGran (Social) ---
    async getPosts(currentUserId) {
        let { data, error } = await supabase
            .from('fitgran_posts')
            .select(`
                *,
                profiles:user_id (full_name, avatar_url)
            `)
            .order('created_at', { ascending: false });

        if (error || !data) return [];

        if (currentUserId) {
            const { data: likes } = await supabase
                .from('fitgran_likes')
                .select('post_id')
                .eq('user_id', currentUserId);
            
            const likedPostIds = new Set(likes?.map(l => l.post_id));
            
            data = data.map(post => ({
                ...post,
                is_liked: likedPostIds.has(post.id)
            }));
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

        let action = '';

        if (existing) {
            await supabase.from('fitgran_likes').delete().eq('id', existing.id);
            action = 'unlike';
        } else {
            await supabase.from('fitgran_likes').insert([{ post_id: postId, user_id: userId }]);
            action = 'like';
        }

        const { count } = await supabase
            .from('fitgran_likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId);

        await supabase
            .from('fitgran_posts')
            .update({ likes_count: count })
            .eq('id', postId);

        return { success: true, action, newCount: count };
    },

    async getComments(postId) {
        const { data, error } = await supabase
            .from('fitgran_comments')
            .select(`
                *,
                profiles:user_id (full_name, avatar_url)
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        
        return data || [];
    },

    async addComment(postId, userId, content) {
        const { data, error } = await supabase
            .from('fitgran_comments')
            .insert([{ post_id: postId, user_id: userId, content }])
            .select(`
                *,
                profiles:user_id (full_name, avatar_url)
            `)
            .single();
        
        return { data, error };
    },

    // [CORREÇÃO] Upload de Imagem com Sanitização de Nome
    // Isso evita que arquivos com espaços ou acentos quebrem a URL da imagem
    async uploadPostImage(file, userId) {
        // Remove acentos e caracteres especiais do nome do arquivo
        const cleanName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.]/g, "_");
        const fileName = `${Date.now()}_${cleanName}`;
        const filePath = `${userId}/${fileName}`; 

        const { data, error } = await supabase.storage
            .from('fitflix_post') // Certifique-se que o bucket tem esse nome no Supabase
            .upload(filePath, file);

        if (error) {
            console.error('Erro no upload:', error);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('fitflix_post')
            .getPublicUrl(filePath);

        return publicUrl;
    },

    async createPost(userId, imageUrl, caption) {
        const { data, error } = await supabase
            .from('fitgran_posts')
            .insert([{ 
                user_id: userId, 
                image_url: imageUrl, 
                caption: caption 
            }])
            .select()
            .single();
        return { data, error };
    },

    // --- Treinos ---
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
            data.forEach(workout => {
                if (workout.items) {
                    workout.items.sort((a, b) => a.order_index - b.order_index);
                }
            });
        }
        return data || [];
    },

    async logWorkoutSet(logData) {
        const { data, error } = await supabase.from('workout_logs').insert([logData]);
        return data;
    },

    async getDashboardStats(userId) {
        const { count } = await supabase
            .from('workout_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);
        return { completedWorkouts: count || 0 };
    }
};