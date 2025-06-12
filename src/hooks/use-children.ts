// src/hooks/use-children.ts
// Hook actualizado para gestión de niños SIN usar vistas - usando JOINs directos

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient, userCanAccessChild, userCanEditChild, auditSensitiveAccess } from '@/lib/supabase';
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
  const supabase = createClient();

  // ================================================================
  // FUNCIONES PRINCIPALES
  // ================================================================

  /**
   * Obtener niños accesibles para el usuario usando JOINs directos
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

    console.log('👶 Fetching children for user:', user.id);

    // ✅ SOLUCIÓN: Usar la vista user_accessible_children que ya maneja toda la lógica
    let query = supabase
      .from('user_accessible_children')  // Vista en lugar de tabla + JOIN
      .select('*')
      .eq('user_id', user.id);  // La vista ya incluye user_id

    // Filtrar por estado activo si se requiere
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching children:', error);
      throw error;
    }

    // Transformar datos para el tipo ChildWithRelation
    const transformedChildren: ChildWithRelation[] = (data || []).map((child: any) => ({
      id: child.id,
      name: child.name,
      birth_date: child.birth_date,
      diagnosis: child.diagnosis,
      notes: child.notes,
      is_active: child.is_active,
      avatar_url: child.avatar_url,
      emergency_contact: child.emergency_contact,
      medical_info: child.medical_info,
      educational_info: child.educational_info,
      privacy_settings: child.privacy_settings,
      created_by: child.created_by,
      created_at: child.created_at,
      updated_at: child.updated_at,
      // Campos de la relación
      relationship_type: child.relationship_type,
      can_view: child.can_view,
      can_edit: child.can_edit,
      can_export: child.can_export,
      can_invite_others: child.can_invite_others,
    }));

    setChildren(transformedChildren);
    console.log('✅ Children fetched successfully:', transformedChildren.length);

  } catch (err) {
    console.error('❌ Error in fetchChildren:', err);
    const errorMessage = err instanceof Error ? err.message : 'Error al cargar los niños';
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
}, [user, includeInactive, supabase]);

  /**
   * Crear nuevo niño
   */
  const createChild = useCallback(async (childData: ChildInsert): Promise<Child> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('👶 Creating new child:', childData.name);

      const { data: child, error } = await supabase
        .from('children')
        .insert({
          ...childData,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating child:', error);
        throw error;
      }

      // Crear relación automática como padre/creador
      const { error: relationError } = await supabase
        .from('user_child_relations')
        .insert({
          user_id: user.id,
          child_id: child.id,
          relationship_type: 'parent',
          can_view: true,
          can_edit: true,
          can_export: true,
          can_invite_others: true,
          granted_by: user.id
        });

      if (relationError) {
        console.error('❌ Error creating child relation:', relationError);
        // No hacer throw aquí, el niño ya se creó
      }

      console.log('✅ Child created successfully:', child.id);

      // Refrescar lista
      await fetchChildren();

      // Auditoría
      await auditSensitiveAccess(
        'CREATE_CHILD',
        child.id,
        `Created child: ${child.name}`
      );

      return child;
    } catch (err) {
      console.error('❌ Error in createChild:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al crear el niño';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchChildren, supabase]);

  /**
   * Actualizar niño
   */
  const updateChild = useCallback(async (id: string, updates: ChildUpdate): Promise<Child> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('👶 Updating child:', id);

      // Verificar permisos
      const canEdit = await userCanEditChild(id, user.id);
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

      console.log('✅ Child updated successfully:', data.id);

      // Refrescar lista
      await fetchChildren();

      // Auditoría
      await auditSensitiveAccess(
        'UPDATE_CHILD',
        data.id,
        `Updated child: ${data.name}`
      );

      return data;
    } catch (err) {
      console.error('❌ Error in updateChild:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el niño';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchChildren, supabase]);

  /**
   * Eliminar niño (soft delete)
   */
  const deleteChild = useCallback(async (id: string): Promise<void> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('👶 Deleting child:', id);

      // Verificar permisos (solo el creador puede eliminar)
      const { data: child } = await supabase
        .from('children')
        .select('created_by, name')
        .eq('id', id)
        .single();

      if (!child || child.created_by !== user.id) {
        throw new Error('Solo el creador puede eliminar un niño');
      }

      const { error } = await supabase
        .from('children')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting child:', error);
        throw error;
      }

      console.log('✅ Child deleted successfully:', id);

      // Refrescar lista
      await fetchChildren();

      // Auditoría
      await auditSensitiveAccess(
        'DELETE_CHILD',
        id,
        `Deleted child: ${child.name}`
      );

    } catch (err) {
      console.error('❌ Error in deleteChild:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar el niño';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchChildren, supabase]);

  /**
   * Agregar usuario a un niño
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

      console.log('👥 Adding user to child:', { childId, userId });

      const { error } = await supabase
        .from('user_child_relations')
        .insert({
          user_id: userId,
          child_id: childId,
          granted_by: user.id,
          ...relation
        });

      if (error) {
        console.error('❌ Error adding user to child:', error);
        throw error;
      }

      console.log('✅ User added to child successfully');

      // Refrescar lista
      await fetchChildren();

      // Auditoría
      await auditSensitiveAccess(
        'ADD_USER_TO_CHILD',
        childId,
        `Added user ${userId} with role ${relation.relationship_type}`
      );

    } catch (err) {
      console.error('❌ Error in addUserToChild:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al agregar usuario';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchChildren, supabase]);

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

      console.log('👥 Removing user from child:', { childId, userId });

      const { error } = await supabase
        .from('user_child_relations')
        .update({ is_active: false })
        .eq('child_id', childId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error removing user from child:', error);
        throw error;
      }

      console.log('✅ User removed from child successfully');

      // Refrescar lista
      await fetchChildren();

      // Auditoría
      await auditSensitiveAccess(
        'REMOVE_USER_FROM_CHILD',
        childId,
        `Removed user ${userId}`
      );

    } catch (err) {
      console.error('❌ Error in removeUserFromChild:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al remover usuario';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchChildren, supabase]);

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
   * Filtrar niños
   */
  const filterChildren = useCallback((filters: ChildFilters): ChildWithRelation[] => {
    return children.filter(child => {
      // Filtro por texto
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!child.name.toLowerCase().includes(searchLower) &&
            !child.diagnosis?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Filtro por relación
      if (filters.relationship && child.relationship_type !== filters.relationship) {
        return false;
      }

      // Filtro por estado activo
      if (filters.is_active !== undefined && child.is_active !== filters.is_active) {
        return false;
      }

      return true;
    });
  }, [children]);

  /**
   * Verificar si el usuario puede editar un niño
   */
  const canEditChild = useCallback(async (childId: string): Promise<boolean> => {
    return await userCanEditChild(childId, user?.id);
  }, [user]);

  /**
   * Verificar si el usuario puede acceder a un niño
   */
  const canAccessChild = useCallback(async (childId: string): Promise<boolean> => {
    return await userCanAccessChild(childId, user?.id);
  }, [user]);

  // ================================================================
  // EFFECTS
  // ================================================================

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  // Configurar realtime si está habilitado
  useEffect(() => {
    if (!realtime || !user) return;

    console.log('🔄 Setting up realtime subscription for children');

    const channel = supabase
      .channel('children-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'children'
      }, (payload) => {
        console.log('🔄 Children realtime update:', payload);
        fetchChildren();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_child_relations'
      }, (payload) => {
        console.log('🔄 Relations realtime update:', payload);
        fetchChildren();
      })
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up children realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [realtime, user, fetchChildren, supabase]);

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
    canAccessChild
  };
}