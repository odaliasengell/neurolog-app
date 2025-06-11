// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { User as AppUser } from '@/types'

interface UseAuthReturn {
  user: AppUser | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<AppUser>) => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async (userId: string): Promise<AppUser | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return data as AppUser
    } catch (err) {
      console.error('Error fetching profile:', err)
      return null
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        const profile = await fetchProfile(data.user.id)
        setUser(profile)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [fetchProfile])

  const signUp = useCallback(async (
    email: string, 
    password: string, 
    fullName: string, 
    role: UserRole
  ): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          }
        }
      })

      if (error) throw error

      if (data.user) {
        // El perfil se crea automáticamente con el trigger
        const profile = await fetchProfile(data.user.id)
        setUser(profile)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrarse'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [fetchProfile])

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      await supabase.auth.signOut()
      setUser(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cerrar sesión'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (updates: Partial<AppUser>): Promise<void> => {
    try {
      if (!user) throw new Error('No hay usuario autenticado')

      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setUser(data as AppUser)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar perfil'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    let mounted = true

    async function getInitialSession(): Promise<void> {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user && mounted) {
          const profile = await fetchProfile(session.user.id)
          setUser(profile)
        }
      } catch (err) {
        console.error('Error getting initial session:', err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id)
          setUser(profile)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }
}