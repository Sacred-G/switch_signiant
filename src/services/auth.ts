// SigniantAuth.ts
import { supabase } from '../lib/supabase'
import { Session, AuthChangeEvent } from '@supabase/supabase-js'

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export const SigniantAuth = {
  async register(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: isElectron && await window.electronAPI.isDevelopment()
            ? 'http://localhost:5173/login'
            : `${window.location.origin}/login`
        }
      })
      
      if (error) {
        console.error('Registration error details:', error)
        throw new Error(error.message || 'Failed to register')
      }

      if (data?.user?.identities?.length === 0) {
        throw new Error('Email already registered. Please try logging in instead.')
      }

      // Store session in electron store if available
      if (isElectron && data.session) {
        await window.electronAPI.storeSession(data.session)
      }

      return data
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  },

  async login(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Login error details:', error)
        throw new Error(error.message || 'Failed to login')
      }

      // Store session in electron store if available
      if (isElectron && data.session) {
        await window.electronAPI.storeSession(data.session)
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
          redirectTo: isElectron && await window.electronAPI.isDevelopment()
            ? 'http://localhost:5173/'
            : `${window.location.origin}/`
        }
      })

      if (error) {
        console.error('Google sign-in error details:', error)
        throw new Error(error.message || 'Failed to sign in with Google')
      }

      // Store session when it becomes available if in Electron
      if (isElectron) {
        window.electronAPI.handleAuthCallback(async (_event: any, session: Session) => {
          if (session) {
            await window.electronAPI.storeSession(session)
          }
        })
      }

      return data
    } catch (error) {
      console.error('Google sign-in error:', error)
      throw error
    }
  },

  async getSession(): Promise<Session | null> {
    try {
      // First try to get session from electron store if available
      if (isElectron) {
        const storedSession = await window.electronAPI.getStoredSession()
        if (storedSession) {
          // Set the session in Supabase
          await supabase.auth.setSession(storedSession)
          return storedSession
        }
      }

      // If no stored session or not in Electron, get from Supabase
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Get session error details:', error)
        throw error
      }

      // Store valid session if in Electron
      if (isElectron && session) {
        await window.electronAPI.storeSession(session)
      }

      return session
    } catch (error) {
      console.error('Get session error:', error)
      throw error
    }
  },

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession()
    return !!session
  },

  async getAuthHeader(): Promise<Record<string, string>> {
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

      // Clear stored session if in Electron
      if (isElectron) {
        await window.electronAPI.clearSession()
        window.electronAPI.send('log-out')
      }
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    // Set up supabase auth listener
    const subscription = supabase.auth.onAuthStateChange(async (event, session) => {
      // Store or clear session based on auth state if in Electron
      if (isElectron) {
        if (session) {
          await window.electronAPI.storeSession(session)
        } else {
          await window.electronAPI.clearSession()
        }
      }
      
      callback(event, session)
    })

    // Initialize with stored session
    this.getSession().then(session => {
      if (session) {
        callback('SIGNED_IN', session)
      }
    })

    return subscription
  },

  // Initialize auth state
  async initialize() {
    try {
      if (isElectron) {
        const storedSession = await window.electronAPI.getStoredSession()
        if (storedSession) {
          await supabase.auth.setSession(storedSession)
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error)
      throw error
    }
  }
}
