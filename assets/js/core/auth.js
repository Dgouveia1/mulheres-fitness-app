
// auth.js - Lógica de Autenticação
import { supabase } from './supabase.js';

export const auth = {
    user: null,

    async signUp(email, password, metaData = {}) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metaData
            }
        });
        return { data, error };
    },

    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (data?.user) {
            this.user = data.user;
        }
        return { data, error };
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    async getSession() {
        const { data, error } = await supabase.auth.getSession();
        if (data.session) {
            this.user = data.session.user;
            // Busca o perfil do usuário para ter acesso à role
            await this.getProfile();
        }
        return { data, error };
    },

    async getProfile() {
        if (!this.user) return { data: null, error: 'User not authenticated' };

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', this.user.id)
            .eq('id', this.user.id)
            .maybeSingle();

        if (data) {
            this.user.profile = data; // Anexa o perfil ao objeto user
        }
        return { data, error };
    },

    onAuthStateChange(callback) {
        supabase.auth.onAuthStateChange(async (event, session) => {
            this.user = session ? session.user : null;
            if (this.user) {
                await this.getProfile();
            }
            callback(event, session);
        });
    }
};
