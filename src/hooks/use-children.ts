// src/hooks/use-children.ts
// Hook actualizado para gestión de niños con el nuevo modelo

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, userCanAccessChild, userCanEditChild, auditSensitiveAccess } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import type { 
  ChildWithRelation, 
  Child, 
  ChildInsert, 
  ChildUpdate, 
  ChildFilters,
  RelationInsert,
  UserAccessibleChild
} from '@/types';

// ================================================================
// INTERFACES DEL HOOK
// ================================================================

interface UseChildrenOptions {
  includeInactive?: boolean;
  autoRefresh?: boolean;
  realtime?: boolean;
}

interface UseChildrenReturn {
  children: ChildWithRelation[];
  loading: boolean;
  error: string | null;
  createChild: (childData: ChildInsert) => Promise<Child>;
  updateChild: (id: string, updates: ChildUpdate) => Promise<Child>;
  deleteChild: (id: string) => Promise<void>;
  addUserToChild: (childId: string, userId: string, relation: RelationInsert) => Promise<void>;
  removeUserFromChild: (childId: string, userId: string) => Promise<void>;
  refreshChildren: () => Promise<void>;
  getChildById: (id: string) => ChildWithRelation | undefined;
  filterChildren: (filters: ChildFilters) => ChildWithRelation[];
  canEditChild: (childId: string) => Promise<boolean>;
  canAccessChild: (childId: string) => Promise<boolean>;
}

// ================================================================
// HOOK PRINCIPAL
// ================================================================

export function useChildren(options: UseChildrenOptions = {}): UseChildrenReturn {
  const {
    includeInactive = false,
    autoRefresh = true,
    realtime = true
  } = options;

  const { user } = useAuth();
  const [children, setChildren] = useState<ChildWithRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ================================================================
  // FUNCIONES PRINCIPALES
  // ================================================================

  /**
   * Obtener todos los niños accesibles para el usuario actual
   */
  const fetchChildren = useCallback(async (): Promise<void> => {
    if (!user) {
      setChildren([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📚 Fetching accessible children...');

      // Usar la vista optimizada que ya incluye RLS
      let query = supabase
        .from('user_accessible_children')
        .select('*')
        .order('name');

      // Filtrar por estado activo si es necesario
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching children:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} children`);
      
      // Convertir a formato ChildWithRelation
      const childrenWithRelations: ChildWithRelation[] = (data || []).map(child => ({
        id: child.id!,
        name: child.name!,
        birth_date: child.birth_date,
        diagnosis: child.diagnosis,
        notes: child.notes,
        is_active: child.is_active!,
        avatar_url: child.avatar_url,
        emergency_contact: child.emergency_contact as any || [],
        medical_info: child.medical_info as any || {},
        educational_info: child.educational_info as any || {},
        privacy_settings: child.privacy_settings as any || { 
          share_with_specialists: true, 
          share_progress_reports: true 
        },
        created_by: child.created_by!,
        created_at: child.created_at!,
        updated_at: child.updated_at!,
        relationship_type: child.relationship_type!,
        can_edit: child.can_edit!,
        can_view: child.can_view!,
        can_export: child.can_export!,
        can_invite_others: child.can_invite_others!,
        granted_at: child.granted_at!,
        expires_at: child.expires_at,
        creator_name: child.creator_name!
      }));

      setChildren(childrenWithRelations);

      // Registrar acceso para auditoría
      for (const child of childrenWithRelations) {
        await auditSensitiveAccess('children', child.id, 'SELECT');
      }

    } catch (err) {
      console.error('❌ Error in fetchChildren:', err);
      setError(err instanceof Error ? err.message : 'Error loading children');
    } finally {
      setLoading(false);
    }
  }, [user, includeInactive]);

  /**
   * Crear un nuevo niño
   */
  const createChild = useCallback(async (childData: ChildInsert): Promise<Child> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('👶 Creating new child:', childData.name);

      // Asegurar que el usuario sea el creador
      const dataToInsert = {
        ...childData,
        created_by: user.id,
        privacy_settings: {
          share_with_specialists: true,
          share_progress_reports: true,
          ...childData.privacy_settings
        }
      };

      const { data, error } = await supabase
        .from('children')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating child:', error);
        throw error;
      }

      console.log('✅ Child created successfully:', data);

      // Refrescar la lista
      await fetchChildren();

      return data as Child;
    } catch (err) {
      console.error('❌ Error in createChild:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error creating child';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchChildren]);

  /**
   * Actualizar un niño existente
   */
  const updateChild = useCallback(async (id: string, updates: ChildUpdate): Promise<Child> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📝 Updating child:', id);

      // Verificar permisos antes de actualizar
      const canEdit = await userCanEditChild(id);
      if (!canEdit) {
        throw new Error('No tienes permisos para editar este niño');
      }

      const { data, error } = await supabase
        .from('children')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating child:', error);
        throw error;
      }

      console.log('✅ Child updated successfully:', data);

      // Refrescar la lista
      await fetchChildren();

      return data as Child;
    } catch (err) {
      console.error('❌ Error in updateChild:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error updating child';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchChildren]);

  /**
   * Eliminar (desactivar) un niño
   */
  const deleteChild = useCallback(async (id: string): Promise<void> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🗑️ Soft deleting child:', id);

      // Solo soft delete - cambiar is_active a false
      const { error } = await supabase
        .from('children')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('created_by', user.id); // Solo el creador puede eliminar

      if (error) {
        console.error('❌ Error deleting child:', error);
        throw error;
      }

      console.log('✅ Child deleted successfully');

      // Refrescar la lista
      await fetchChildren();
    } catch (err) {
      console.error('❌ Error in deleteChild:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error deleting child';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchChildren]);

  /**
   * Agregar usuario a un niño con permisos específicos
   */
  const addUserToChild = useCallback(async (
    childId: string, 
    userId: string, 
    relation: RelationInsert
  ): Promise<void> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('👥 Adding user to child:', { childId, userId, relation });

      const relationData = {
        ...relation,
        user_id: userId,
        child_id: childId,
        granted_by: user.id,
        granted_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_child_relations')
        .insert(relationData);

      if (error) {
        console.error('❌ Error adding user to child:', error);
        throw error;
      }

      console.log('✅ User added to child successfully');

      // Refrescar la lista
      await fetchChildren();
    } catch (err) {
      console.error('❌ Error in addUserToChild:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error adding user to child';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchChildren]);

  /**
   * Remover usuario de un niño
   */
  const removeUserFromChild = useCallback(async (
    childId: string, 
    userId: string
  ): Promise<void> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🚫 Removing user from child:', { childId, userId });

      const { error } = await supabase
        .from('user_child_relations')
        .delete()
        .eq('child_id', childId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error removing user from child:', error);
        throw error;
      }

      console.log('✅ User removed from child successfully');

      // Refrescar la lista
      await fetchChildren();
    } catch (err) {
      console.error('❌ Error in removeUserFromChild:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error removing user from child';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchChildren]);

  /**
   * Refrescar lista de niños
   */
  const refreshChildren = useCallback(async (): Promise<void> => {
    await fetchChildren();
  }, [fetchChildren]);

  /**
   * Obtener niño por ID
   */
  const getChildById = useCallback((id: string): ChildWithRelation | undefined => {
    return children.find(child => child.id === id);
  }, [children]);

  /**
   * Filtrar niños según criterios
   */
  const filterChildren = useCallback((filters: ChildFilters): ChildWithRelation[] => {
    return children.filter(child => {
      // Filtro por término de búsqueda
      if (filters.search_term) {
        const term = filters.search_term.toLowerCase();
        if (!child.name.toLowerCase().includes(term) &&
            !child.diagnosis?.toLowerCase().includes(term)) {
          return false;
        }
      }

      // Filtro por tipo de relación
      if (filters.relationship_type && child.relationship_type !== filters.relationship_type) {
        return false;
      }

      // Filtro por estado activo
      if (filters.is_active !== undefined && child.is_active !== filters.is_active) {
        return false;
      }

      // Filtro por edad
      if (child.birth_date && (filters.age_min || filters.age_max)) {
        const birthDate = new Date(child.birth_date);
        const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        
        if (filters.age_min && age < filters.age_min) return false;
        if (filters.age_max && age > filters.age_max) return false;
      }

      // Filtro por diagnóstico
      if (filters.has_diagnosis !== undefined) {
        const hasDiagnosis = Boolean(child.diagnosis && child.diagnosis.trim());
        if (hasDiagnosis !== filters.has_diagnosis) return false;
      }

      return true;
    });
  }, [children]);

  /**
   * Verificar si puede editar un niño
   */
  const canEditChild = useCallback(async (childId: string): Promise<boolean> => {
    return await userCanEditChild(childId);
  }, []);

  /**
   * Verificar si puede acceder a un niño
   */
  const canAccessChild = useCallback(async (childId: string): Promise<boolean> => {
    return await userCanAccessChild(childId);
  }, []);

  // ================================================================
  // EFECTOS
  // ================================================================

  // Cargar niños cuando cambie el usuario
  useEffect(() => {
    if (user) {
      fetchChildren();
    } else {
      setChildren([]);
      setLoading(false);
    }
  }, [user, fetchChildren]);

  // Configurar realtime si está habilitado
  useEffect(() => {
    if (!realtime || !user) return;

    console.log('🔄 Setting up realtime subscription for children');

    const subscription = supabase
      .channel('children_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'children'
      }, (payload) => {
        console.log('🔄 Children realtime update:', payload);
        if (autoRefresh) {
          fetchChildren();
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_child_relations'
      }, (payload) => {
        console.log('🔄 Relations realtime update:', payload);
        if (autoRefresh) {
          fetchChildren();
        }
      })
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up children realtime subscription');
      subscription.unsubscribe();
    };
  }, [realtime, user, autoRefresh, fetchChildren]);

  // ================================================================
  // RETURN
  // ================================================================

  return {
    children,
    loading,
    error,
    createChild,
    updateChild,
    deleteChild,
    addUserToChild,
    removeUserFromChild,
    refreshChildren,
    getChildById,
    filterChildren,
    canEditChild,
    canAccessChild,
  };
}