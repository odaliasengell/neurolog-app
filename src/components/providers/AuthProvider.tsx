// src/components/providers/AuthProvider.tsx
// AuthProvider actualizado para el nuevo modelo de base de datos

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, handleSupabaseError, isAuthError } from '@/lib/supabase';
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
        
        // Si el perfil no existe, intentar crearlo (fallback)
        if (error.code === 'PGRST116') {
          console.log('🔧 Profile not found, attempting to create...');
          return await createProfileForUser(userId);
        }
        
        throw error;
      }

      console.log('✅ Profile fetched successfully:', data);
      return data as Profile;
    } catch (err) {
      console.error('❌ Error in fetchProfile:', err);
      const supabaseError = handleSupabaseError(err);
      throw new Error(supabaseError.message);
    }
  };

  /**
   * Crea un perfil básico si no existe (fallback)
   */
  const createProfileForUser = async (userId: string): Promise<Profile | null> => {
    try {
      // Obtener datos básicos del usuario de auth
      const { data: authUser } = await supabase.auth.getUser();
      
      if (!authUser.user) {
        throw new Error('No authenticated user found');
      }

      const newProfile = {
        id: userId,
        email: authUser.user.email || '',
        full_name: authUser.user.user_metadata?.full_name || 
                   authUser.user.email?.split('@')[0] || 
                   'Usuario',
        role: (authUser.user.user_metadata?.role as UserRole) || 'parent',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        preferences: {}
      };

      console.log('🔧 Creating new profile:', newProfile);

      const { data, error } = await supabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating profile:', error);
        throw error;
      }

      console.log('✅ Profile created successfully:', data);
      return data as Profile;
    } catch (err) {
      console.error('❌ Error creating profile:', err);
      return null;
    }
  };

  /**
   * Verifica si el usuario es administrador
   */
  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('is_admin');
      
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
          failed_login_attempts: 0, // Reset en login exitoso
          last_failed_login: null,
          account_locked_until: null
        })
        .eq('id', userId);
    } catch (err) {
      // No fallar por errores de tracking
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
        if (isAuthError(error)) {
          // Intentar registrar intento fallido si el usuario existe
          try {
            await supabase.rpc('handle_failed_login', { user_email: email });
          } catch {
            // Ignorar errores de tracking
          }
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
    } catch (err) {
      const supabaseError = handleSupabaseError(err);
      setError(supabaseError.message);
      console.error('❌ Sign in error:', supabaseError);
      throw new Error(supabaseError.message);
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
            role,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // El perfil se crea automáticamente con el trigger
        // Esperar un momento para que se procese
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const profile = await fetchProfile(data.user.id);
        if (profile) {
          setUser(profile);
          
          // Verificar status de admin
          const adminStatus = await checkAdminStatus(data.user.id);
          setIsAdmin(adminStatus);
        }
      }

      console.log('✅ Sign up successful');
    } catch (err) {
      const supabaseError = handleSupabaseError(err);
      setError(supabaseError.message);
      console.error('❌ Sign up error:', supabaseError);
      throw new Error(supabaseError.message);
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
      
      await supabase.auth.signOut();
      setUser(null);
      setIsAdmin(false);
      setError(null);
      
      console.log('✅ Signed out successfully');
    } catch (err) {
      const supabaseError = handleSupabaseError(err);
      setError(supabaseError.message);
      console.error('❌ Sign out error:', supabaseError);
      throw new Error(supabaseError.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Actualizar perfil del usuario
   */
  const updateProfile = async (updates: Partial<Profile>): Promise<void> => {
    try {
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }

      setLoading(true);
      setError(null);

      console.log('📝 Updating profile:', updates);

      // Filtrar campos que no se pueden actualizar directamente
      const { id, email, created_at, ...allowedUpdates } = updates;

      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...allowedUpdates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating profile:', error);
        throw error;
      }

      console.log('✅ Profile updated successfully:', data);
      setUser(data as Profile);
    } catch (err) {
      const supabaseError = handleSupabaseError(err);
      setError(supabaseError.message);
      console.error('❌ Update profile error:', supabaseError);
      throw new Error(supabaseError.message);
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

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        throw error;
      }

      console.log('✅ Password reset email sent');
    } catch (err) {
      const supabaseError = handleSupabaseError(err);
      setError(supabaseError.message);
      throw new Error(supabaseError.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refrescar datos del usuario
   */
  const refreshUser = async (): Promise<void> => {
    try {
      if (!user) return;

      setLoading(true);
      const profile = await fetchProfile(user.id);
      if (profile) {
        setUser(profile);
        
        const adminStatus = await checkAdminStatus(user.id);
        setIsAdmin(adminStatus);
      }
    } catch (err) {
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
     * Obtener sesión inicial
     */
    async function getInitialSession(): Promise<void> => {
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
          const supabaseError = handleSupabaseError(err);
          setError(supabaseError.message);
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
            console.log('🚪 User signed out');
            setUser(null);
            setIsAdmin(false);
            setError(null);
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('🔄 Token refreshed');
            // Opcional: refrescar datos del usuario
          }
        } catch (err) {
          console.error('❌ Error in auth state change:', err);
          if (mounted) {
            const supabaseError = handleSupabaseError(err);
            setError(supabaseError.message);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ================================================================
  // VALOR DEL CONTEXTO
  // ================================================================

  const value = {
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
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ================================================================
// ALIAS PARA COMPATIBILIDAD
// ================================================================

// Mantener compatibilidad con código existente
export { useAuth as useAuthContext };

// Hook para verificar permisos específicos
export function usePermissions() {
  const { user, isAdmin } = useAuth();
  
  return {
    isParent: user?.role === 'parent',
    isTeacher: user?.role === 'teacher',
    isSpecialist: user?.role === 'specialist',
    isAdmin,
    canCreateChildren: user?.role === 'parent' || isAdmin,
    canManageUsers: isAdmin,
    canViewAuditLogs: isAdmin,
    canExportData: user?.role !== 'observer',
  };
}