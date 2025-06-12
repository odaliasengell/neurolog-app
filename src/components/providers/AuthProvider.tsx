// src/components/providers/AuthProvider.tsx
// AuthProvider actualizado para el nuevo modelo de base de datos y Supabase v2

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';

// ================================================================
// TIPOS DEL CONTEXTO
// ================================================================

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ================================================================
// PROVIDER PROPS
// ================================================================

interface AuthProviderProps {
  children: ReactNode;
}

// ================================================================
// AUTH PROVIDER COMPONENT
// ================================================================

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const supabase = createClient();

  // ================================================================
  // FUNCIONES HELPER PRIVADAS
  // ================================================================

  /**
   * Obtiene el perfil completo del usuario desde la base de datos
   */
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      console.log('🔍 Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        throw error;
      }

      if (!data) {
        console.warn('⚠️ No profile found for user:', userId);
        return null;
      }

      console.log('✅ Profile fetched successfully');
      return data as Profile;
    } catch (err) {
      console.error('❌ Error in fetchProfile:', err);
      return null;
    }
  };

  /**
   * Verifica si el usuario es administrador
   */
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .rpc('is_admin', { user_id: userId });
      
      if (error) {
        console.error('❌ Error checking admin status:', error);
        return false;
      }
      
      return data === true;
    } catch (err) {
      console.error('❌ Error in checkAdminStatus:', err);
      return false;
    }
  };

  /**
   * Actualiza el último login del usuario
   */
  const updateLastLogin = async (userId: string): Promise<void> => {
    try {
      await supabase
        .from('profiles')
        .update({ 
          last_login: new Date().toISOString(),
          failed_login_attempts: 0,
          last_failed_login: null,
          account_locked_until: null
        })
        .eq('id', userId);
    } catch (err) {
      console.warn('Warning: Could not update last login:', err);
    }
  };

  // ================================================================
  // FUNCIONES PÚBLICAS DEL CONTEXTO
  // ================================================================

  /**
   * Iniciar sesión con email y contraseña
   */
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔑 Attempting sign in for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Manejar errores de login fallidos
        try {
          await supabase.rpc('handle_failed_login', { user_email: email });
        } catch {
          // Ignorar errores de tracking
        }
        throw error;
      }

      if (data.user) {
        // Actualizar último login
        await updateLastLogin(data.user.id);
        
        // Obtener perfil completo
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          setUser(profile);
          
          // Verificar status de admin
          const adminStatus = await checkAdminStatus(data.user.id);
          setIsAdmin(adminStatus);
        }
      }

      console.log('✅ Sign in successful');
    } catch (err: any) {
      console.error('❌ Error in signIn:', err);
      const errorMessage = err.message || 'Error al iniciar sesión';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Registrar nuevo usuario
   */
  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    role: UserRole
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('📝 Attempting sign up for:', email);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      });

      if (error) throw error;

      console.log('✅ Sign up successful');
    } catch (err: any) {
      console.error('❌ Error in signUp:', err);
      const errorMessage = err.message || 'Error al crear la cuenta';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cerrar sesión
   */
  const signOut = async (): Promise<void> => {
    try {
      setLoading(true);
      console.log('🚪 Signing out...');

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setUser(null);
      setIsAdmin(false);
      setError(null);

      console.log('✅ Sign out successful');
    } catch (err: any) {
      console.error('❌ Error in signOut:', err);
      const errorMessage = err.message || 'Error al cerrar sesión';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualizar perfil del usuario
   */
  const updateProfile = async (updates: Partial<Profile>): Promise<void> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('💾 Updating profile...', updates);

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setUser(data as Profile);
      console.log('✅ Profile updated successfully');
    } catch (err: any) {
      console.error('❌ Error updating profile:', err);
      const errorMessage = err.message || 'Error al actualizar perfil';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Restablecer contraseña
   */
  const resetPassword = async (email: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔑 Sending password reset for:', email);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });

      if (error) throw error;

      console.log('✅ Password reset email sent');
    } catch (err: any) {
      console.error('❌ Error sending password reset:', err);
      const errorMessage = err.message || 'Error al enviar email de recuperación';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refrescar datos del usuario
   */
  const refreshUser = async (): Promise<void> => {
    if (!user) return;

    try {
      setLoading(true);
      console.log('🔄 Refreshing user data...');

      const profile = await fetchProfile(user.id);
      if (profile) {
        setUser(profile);
        
        const adminStatus = await checkAdminStatus(user.id);
        setIsAdmin(adminStatus);
      }

      console.log('✅ User data refreshed');
    } catch (err: any) {
      console.error('❌ Error refreshing user:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Limpiar errores
   */
  const clearError = (): void => {
    setError(null);
  };

  // ================================================================
  // EFECTOS
  // ================================================================

  useEffect(() => {
    let mounted = true;

    /**
     * Obtener sesión inicial - CORREGIDO: función declarada correctamente
     */
    async function getInitialSession(): Promise<void> {
      try {
        console.log('🔍 Getting initial session...');
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          console.log('✅ Session found, fetching profile...');
          const profile = await fetchProfile(session.user.id);
          
          if (profile && mounted) {
            setUser(profile);
            
            const adminStatus = await checkAdminStatus(session.user.id);
            setIsAdmin(adminStatus);
          }
        } else {
          console.log('ℹ️ No active session found');
        }
      } catch (err) {
        console.error('❌ Error getting initial session:', err);
        if (mounted) {
          setError('Error al cargar la sesión');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    getInitialSession();

    /**
     * Escuchar cambios de autenticación
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        console.log('🔄 Auth state changed:', event);

        try {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('✅ User signed in, fetching profile...');
            await updateLastLogin(session.user.id);
            
            const profile = await fetchProfile(session.user.id);
            if (profile && mounted) {
              setUser(profile);
              
              const adminStatus = await checkAdminStatus(session.user.id);
              setIsAdmin(adminStatus);
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out');
            if (mounted) {
              setUser(null);
              setIsAdmin(false);
              setError(null);
            }
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('🔄 Token refreshed');
          }
        } catch (err) {
          console.error('❌ Error handling auth state change:', err);
          if (mounted) {
            setError('Error en el cambio de estado de autenticación');
          }
        }
      }
    );

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ================================================================
  // PROVIDER VALUE
  // ================================================================

  const contextValue: AuthContextType = {
    user,
    loading,
    error,
    isAdmin,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
    refreshUser,
    clearError
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ================================================================
// HOOK PERSONALIZADO
// ================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}