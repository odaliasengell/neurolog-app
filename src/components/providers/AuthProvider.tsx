// src/components/providers/AuthProvider.tsx
'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthContextType {
  user: Profile | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, role: 'parent' | 'teacher' | 'specialist') => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Función mejorada para obtener perfil
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('🔍 Fetching profile for user:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ Error fetching profile from database:', error)
        
        // Si el perfil no existe, intentar crearlo
        if (error.code === 'PGRST116') {
          console.log('🔧 Profile not found, attempting to create...')
          return await createProfileForUser(userId)
        }
        
        throw error
      }

      console.log('✅ Profile fetched successfully:', data)
      return data as Profile
    } catch (err) {
      console.error('❌ Error in fetchProfile:', err)
      return null
    }
  }

  // Función para crear perfil si no existe
  const createProfileForUser = async (userId: string): Promise<Profile | null> => {
    try {
      // Obtener datos básicos del usuario de auth
      const { data: authUser } = await supabase.auth.getUser()
      
      if (!authUser.user) {
        throw new Error('No authenticated user found')
      }

      const newProfile = {
        id: userId,
        email: authUser.user.email || '',
        full_name: authUser.user.user_metadata?.full_name || 
                   authUser.user.email?.split('@')[0] || 
                   'Usuario',
        role: 'parent' as const,
        avatar_url: null,
        phone: null,
        is_active: true,
        last_login: new Date().toISOString(),
      }

      console.log('🔧 Creating new profile:', newProfile)

      const { data, error } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single()

      if (error) {
        console.error('❌ Error creating profile:', error)
        throw error
      }

      console.log('✅ Profile created successfully:', data)
      return data as Profile
    } catch (err) {
      console.error('❌ Error creating profile:', err)
      return null
    }
  }

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔐 Attempting sign in for:', email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('❌ Sign in error:', error)
        throw error
      }

      if (data.user) {
        console.log('✅ User authenticated, fetching profile...')
        const profile = await fetchProfile(data.user.id)
        
        if (profile) {
          // Actualizar last_login
          await supabase
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', data.user.id)
          
          setUser(profile)
        } else {
          throw new Error('No se pudo obtener o crear el perfil del usuario')
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    role: 'parent' | 'teacher' | 'specialist'
  ): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      console.log('📝 Attempting sign up for:', email)

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

      if (error) {
        console.error('❌ Sign up error:', error)
        throw error
      }

      if (data.user) {
        console.log('✅ User created, waiting for profile...')
        
        // Esperar un momento para que se ejecute el trigger
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const profile = await fetchProfile(data.user.id)
        
        if (profile) {
          setUser(profile)
        } else {
          // Si el trigger no funcionó, crear manualmente
          console.log('🔧 Trigger failed, creating profile manually...')
          const manualProfile = await createProfileForUser(data.user.id)
          setUser(manualProfile)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al registrarse'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async (): Promise<void> => {
    try {
      setLoading(true)
      console.log('🚪 Signing out...')
      
      await supabase.auth.signOut()
      setUser(null)
      
      console.log('✅ Signed out successfully')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cerrar sesión'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<Profile>): Promise<void> => {
    try {
      if (!user) throw new Error('No hay usuario autenticado')

      setLoading(true)
      setError(null)

      console.log('📝 Updating profile:', updates)

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating profile:', error)
        throw error
      }

      console.log('✅ Profile updated successfully:', data)
      setUser(data as Profile)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar perfil'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function getInitialSession(): Promise<void> => {
      try {
        console.log('🔍 Getting initial session...')
        
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user && mounted) {
          console.log('✅ Session found, fetching profile...')
          const profile = await fetchProfile(session.user.id)
          
          if (profile && mounted) {
            setUser(profile)
          }
        } else {
          console.log('ℹ️ No active session found')
        }
      } catch (err) {
        console.error('❌ Error getting initial session:', err)
        if (mounted) {
          setError('Error al cargar la sesión')
        }
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

        console.log('🔄 Auth state changed:', event)

        try {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('✅ User signed in, fetching profile...')
            const profile = await fetchProfile(session.user.id)
            if (profile && mounted) {
              setUser(profile)
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('🚪 User signed out')
            setUser(null)
          }
        } catch (err) {
          console.error('❌ Error in auth state change:', err)
          if (mounted) {
            setError('Error en el cambio de estado de autenticación')
          }
        } finally {
          if (mounted) {
            setLoading(false)
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
