// src/components/providers/AuthProvider.tsx
// AuthProvider CORREGIDO - Soluciona el problema del nombre que se oculta

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
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
// AUTH PROVIDER COMPONENT - VERSIÓN CORREGIDA
// ================================================================

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  
  // ✅ USAR useRef PARA MANTENER REFERENCIA ESTABLE
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  
  // ✅ REF PARA EVITAR MÚLTIPLES INICIALIZACIONES
  const initializedRef = useRef(false);
  const mountedRef = useRef(true);

  // ================================================================
  // FUNCIONES HELPER ESTABILIZADAS CON useCallback
  // ================================================================

  /**
   * ✅ FETCH PROFILE - MEJORADO CON FALLBACK
   */
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      console.log('🔍 Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching profile:', error);
        
        // ✅ ARREGLO: Si no existe el perfil, intentar crearlo
        if (error.code === 'PGRST116') { // No rows found
          console.log('ℹ️ Profile not found, attempting to create...');
          
          const { data: authUser, error: authError } = await supabase.auth.getUser();
          
          if (authUser?.user && !authError) {
            const userData = authUser.user;
            const fullName = userData.user_metadata?.full_name || 
                            userData.email?.split('@')[0] || 
                            'Usuario';
            
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                email: userData.email || '',
                full_name: fullName,
                role: userData.user_metadata?.role || 'parent',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (createError) {
              console.error('❌ Error creating profile:', createError);
              return null;
            }
            
            console.log('✅ Profile created successfully:', newProfile);
            return newProfile as Profile;
          }
        }
        
        return null;
      }

      if (!data) {
        console.warn('⚠️ No profile found for user:', userId);
        return null;
      }

      console.log('✅ Profile fetched successfully:', data.full_name);
      return data as Profile;
    } catch (err) {
      console.error('❌ Error in fetchProfile:', err);
      return null;
    }
  }, [supabase]);

  /**
   * ✅ CHECK ADMIN STATUS
   */
  const checkAdminStatus = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error checking admin status:', error);
        return false;
      }

      return data?.role === 'admin';
    } catch (err) {
      console.error('❌ Error in checkAdminStatus:', err);
      return false;
    }
  }, [supabase]);

  /**
   * ✅ UPDATE LAST LOGIN
   */
  const updateLastLogin = useCallback(async (userId: string): Promise<void> => {
    try {
      await supabase
        .from('profiles')
        .update({ 
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (err) {
      console.error('❌ Error updating last login:', err);
    }
  }, [supabase]);

  // ================================================================
  // FUNCIONES DE AUTENTICACIÓN
  // ================================================================

  /**
   * ✅ SIGN IN ESTABILIZADO
   */
  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔐 Attempting sign in for:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      console.log('✅ Sign in successful');
      // El estado se actualizará automáticamente por el listener
    } catch (err: any) {
      console.error('❌ Error in signIn:', err);
      const errorMessage = err.message || 'Error al iniciar sesión';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * ✅ SIGN UP CORREGIDO
   */
  const signUp = useCallback(async (
    email: string, 
    password: string, 
    fullName: string, 
    role: UserRole
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      console.log('📝 Attempting sign up for:', email, 'with name:', fullName);

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
  }, [supabase]);

  /**
   * ✅ SIGN OUT ESTABILIZADO
   */
  const signOut = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      console.log('👋 Signing out...');
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // ✅ LIMPIAR ESTADO INMEDIATAMENTE
      if (mountedRef.current) {
        setUser(null);
        setIsAdmin(false);
        setError(null);
      }

      console.log('✅ Sign out successful');
    } catch (err: any) {
      console.error('❌ Error in signOut:', err);
      const errorMessage = err.message || 'Error al cerrar sesión';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * ✅ UPDATE PROFILE ESTABILIZADO
   */
  const updateProfile = useCallback(async (updates: Partial<Profile>): Promise<void> => {
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

      if (mountedRef.current) {
        setUser(data as Profile);
      }
      
      console.log('✅ Profile updated successfully');
    } catch (err: any) {
      console.error('❌ Error updating profile:', err);
      const errorMessage = err.message || 'Error al actualizar perfil';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  /**
   * ✅ RESET PASSWORD ESTABILIZADO
   */
  const resetPassword = useCallback(async (email: string): Promise<void> => {
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
  }, [supabase]);

  /**
   * ✅ REFRESH USER ESTABILIZADO
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      console.log('🔄 Refreshing user data...');

      const profile = await fetchProfile(user.id);
      if (profile && mountedRef.current) {
        setUser(profile);
        
        const adminStatus = await checkAdminStatus(user.id);
        if (mountedRef.current) {
          setIsAdmin(adminStatus);
        }
      }

      console.log('✅ User data refreshed');
    } catch (err: any) {
      console.error('❌ Error refreshing user:', err);
    }
  }, [user, fetchProfile, checkAdminStatus]);

  /**
   * ✅ CLEAR ERROR ESTABILIZADO
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // ================================================================
  // EFFECT PRINCIPAL - CORREGIDO PARA EVITAR LOOPS
  // ================================================================

  useEffect(() => {
    // ✅ EVITAR MÚLTIPLES INICIALIZACIONES
    if (initializedRef.current) return;
    initializedRef.current = true;

    console.log('🚀 Initializing AuthProvider...');

    /**
     * ✅ FUNCIÓN DE INICIALIZACIÓN MEJORADA
     */
    const initializeAuth = async (): Promise<void> => {
      try {
        console.log('🔍 Getting initial session...');
        
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mountedRef.current) {
          console.log('✅ Session found, fetching profile...');
          
          // ✅ ACTUALIZAR LAST LOGIN
          await updateLastLogin(session.user.id);
          
          const profile = await fetchProfile(session.user.id);
          
          if (profile && mountedRef.current) {
            setUser(profile);
            
            const adminStatus = await checkAdminStatus(session.user.id);
            if (mountedRef.current) {
              setIsAdmin(adminStatus);
            }
          }
        } else {
          console.log('ℹ️ No active session found');
        }
      } catch (err) {
        console.error('❌ Error getting initial session:', err);
        if (mountedRef.current) {
          setError('Error al cargar la sesión');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    /**
     * ✅ LISTENER DE AUTH MEJORADO
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        console.log('🔄 Auth state changed:', event);

        try {
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('✅ User signed in, fetching profile...');
            setLoading(true);
            
            await updateLastLogin(session.user.id);
            
            const profile = await fetchProfile(session.user.id);
            if (profile && mountedRef.current) {
              setUser(profile);
              
              const adminStatus = await checkAdminStatus(session.user.id);
              if (mountedRef.current) {
                setIsAdmin(adminStatus);
              }
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out');
            if (mountedRef.current) {
              setUser(null);
              setIsAdmin(false);
              setError(null);
            }
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('🔄 Token refreshed');
            // No hacer nada especial para refresh de token
            // El usuario ya está cargado
          }
        } catch (err) {
          console.error('❌ Error handling auth state change:', err);
          if (mountedRef.current) {
            setError('Error en el cambio de estado de autenticación');
          }
        } finally {
          if (mountedRef.current) {
            setLoading(false);
          }
        }
      }
    );

    // ✅ INICIALIZAR UNA SOLA VEZ
    initializeAuth();

    // ✅ CLEANUP FUNCTION
    return () => {
      console.log('🧹 Cleaning up AuthProvider...');
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []); // ✅ DEPENDENCIES VACÍAS - SOLO EJECUTAR UNA VEZ

  // ================================================================
  // CLEANUP ON UNMOUNT
  // ================================================================
  
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ================================================================
  // CONTEXT VALUE MEMOIZADO
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