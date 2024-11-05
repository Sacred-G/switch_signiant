import { supabase } from '../lib/supabase'

export const SigniantAuth = {
    async register(email, password) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/login`
                }
            })

            if (error) {
                console.error('Registration error details:', error)
                throw new Error(error.message || 'Failed to register')
            }

            if (data?.user?.identities?.length === 0) {
                throw new Error('Email already registered. Please try logging in instead.')
            }

            return data
        } catch (error) {
            console.error('Registration error:', error)
            throw error
        }
    },

    async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                console.error('Login error details:', error)
                throw new Error(error.message || 'Failed to login')
            }

            return data
        } catch (error) {
            console.error('Login error:', error)
            throw error
        }
    },

    async signInWithGoogle() {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`
                }
            })

            if (error) {
                console.error('Google sign-in error details:', error)
                throw new Error(error.message || 'Failed to sign in with Google')
            }

            return data
        } catch (error) {
            console.error('Google sign-in error:', error)
            throw error
        }
    },

    async getSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession()
            if (error) {
                console.error('Get session error details:', error)
                throw error
            }
            return session
        } catch (error) {
            console.error('Get session error:', error)
            throw error
        }
    },

    isAuthenticated() {
        return this.getSession().then(session => !!session)
    },

    async getAuthHeader() {
        const session = await this.getSession()
        return session ? {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
        } : {}
    },

    async logout() {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) {
                console.error('Logout error details:', error)
                throw error
            }
        } catch (error) {
            console.error('Logout error:', error)
            throw error
        }
    },

    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session)
        })
    }
}
