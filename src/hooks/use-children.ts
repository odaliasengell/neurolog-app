// src/hooks/use-children.ts
// Hook CORREGIDO - Query simplificada que funciona con la BD actual

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient, userCanAccessChild, userCanEditChild, auditSensitiveAccess } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import type { 
  ChildWithRelation, 
  Child, 
  ChildInsert, 
  ChildUpdate, 
  ChildFilters,
  RelationInsert
} from '@/types';

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
// HOOK PRINCIPAL - CORREGIDO CON QUERY FUNCIONAL
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

  //  REFERENCIAS ESTABLES
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);

  //  MEMOIZAR userId
  const userId = useMemo(() => user?.id, [user?.id]);

  //  GENERAR ID ÚNICO PARA CANAL
  const channelId = useMemo(() => {
    return `children-${userId || 'anonymous'}-${Date.now()}`;
  }, [userId]);

  // ================================================================
  // FUNCIONES PRINCIPALES
  // ================================================================

  /**
   *  FETCH CHILDREN CON QUERY CORREGIDA Y FUNCIONAL
   */
  const fetchChildren = useCallback(async (): Promise<void> => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('👶 Fetching children for user:', userId);

      //  QUERY SIMPLIFICADA QUE SÍ FUNCIONA
      const { data, error: fetchError } = await supabase
        .from('user_child_relations')
        .select(`
          child_id,
          relationship_type,
          can_view,
          can_edit,
          can_export,
          can_invite_others,
          granted_at,
          expires_at,
          is_active,
          children:child_id (
            id,
            name,
            birth_date,
            diagnosis,
            notes,
            is_active,
            avatar_url,
            emergency_contact,
            medical_info,
            educational_info,
            privacy_settings,
            created_by,
            created_at,
            updated_at,
            creator:profiles!created_by (
              full_name
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .eq('can_view', true);

      if (fetchError) {
        console.error('❌ Error fetching children:', fetchError);
        throw fetchError;
      }

      if (!mountedRef.current) return;

      console.log('✅ Raw data fetched:', data?.length || 0);

      //  PROCESAR Y FILTRAR DATOS
      const validRelations = (data || []).filter(relation => {
        // Verificar que el niño existe
        if (!relation.children) return false;
        
        // Verificar que incluir inactivos o que el niño esté activo
        if (!includeInactive && !relation.children.is_active) return false;
        
        // Verificar expiración
        if (relation.expires_at && new Date(relation.expires_at) <= new Date()) return false;
        
        return true;
      });

      //  TRANSFORMAR A ChildWithRelation
      const transformedChildren: ChildWithRelation[] = validRelations.map(relation => {
        const child = relation.children;
        const creator = child.creator;

        return {
          ...child,
          //  AÑADIR CAMPOS DE RELACIÓN
          user_id: userId,
          relationship_type: relation.relationship_type,
          can_view: relation.can_view,
          can_edit: relation.can_edit,
          can_export: relation.can_export,
          can_invite_others: relation.can_invite_others,
          granted_at: relation.granted_at,
          expires_at: relation.expires_at,
          is_relation_active: relation.is_active,
          relation_created_at: relation.granted_at,
          relation_expires_at: relation.expires_at,
          creator_name: creator?.full_name || 'Usuario desconocido'
        };
      });

      console.log('✅ Children fetched successfully:', transformedChildren.length);
      setChildren(transformedChildren);

      // AUDITORÍA
      if (transformedChildren.length > 0) {
        await auditSensitiveAccess(
          'VIEW_CHILDREN_LIST',
          userId,
          `Accessed ${transformedChildren.length} children profiles`
        );
      }

    } catch (err) {
      console.error('❌ Error in fetchChildren:', err);
      if (mountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar niños';
        setError(errorMessage);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, includeInactive, supabase]);

  /**
   * CREATE CHILD - ESTABILIZADA
   */
  const createChild = useCallback(async (childData: ChildInsert): Promise<Child> => {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('children')
        .insert({
          ...childData,
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      // CREAR RELACIÓN AUTOMÁTICA COMO PADRE/MADRE
      const { error: relationError } = await supabase
        .from('user_child_relations')
        .insert({
          user_id: userId,
          child_id: data.id,
          relationship_type: 'parent',
          can_edit: true,
          can_view: true,
          can_export: true,
          granted_by: userId,
          granted_at: new Date().toISOString()
        });

      if (relationError) {
        console.warn('⚠️ Error creating relation:', relationError);
      }

      await fetchChildren();
      
      await auditSensitiveAccess(
        'CREATE_CHILD',
        data.id,
        `Created child: ${data.name}`
      );

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear niño';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase, fetchChildren]);

  /**
   * UPDATE CHILD - ESTABILIZADA
   */
  const updateChild = useCallback(async (id: string, updates: ChildUpdate): Promise<Child> => {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      const canEdit = await userCanEditChild(id, userId);
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

      if (error) throw error;

      await fetchChildren();
      
      await auditSensitiveAccess(
        'UPDATE_CHILD',
        data.id,
        `Updated child: ${data.name}`
      );

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar niño';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase, fetchChildren]);

  /**
   * DELETE CHILD - ESTABILIZADA
   */
  const deleteChild = useCallback(async (id: string): Promise<void> => {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      const canEdit = await userCanEditChild(id, userId);
      if (!canEdit) {
        throw new Error('No tienes permisos para eliminar este niño');
      }

      //  SOFT DELETE
      const { error } = await supabase
        .from('children')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await fetchChildren();
      
      await auditSensitiveAccess(
        'DELETE_CHILD',
        id,
        'Deleted child (soft delete)'
      );

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar niño';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase, fetchChildren]);

  // ================================================================
  // FUNCIONES HELPER
  // ================================================================

  const refreshChildren = useCallback(async (): Promise<void> => {
    await fetchChildren();
  }, [fetchChildren]);

  const getChildById = useCallback((id: string): ChildWithRelation | undefined => {
    return children.find(child => child.id === id);
  }, [children]);

  const filterChildren = useCallback((filters: ChildFilters): ChildWithRelation[] => {
    return children.filter(child => {
      if (filters.name) {
        if (!child.name.toLowerCase().includes(filters.name.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [children]);

  const canEditChild = useCallback(async (childId: string): Promise<boolean> => {
    return await userCanEditChild(childId, userId);
  }, [userId]);

  const canAccessChild = useCallback(async (childId: string): Promise<boolean> => {
    return await userCanAccessChild(childId, userId);
  }, [userId]);

  // Funciones no implementadas
  const addUserToChild = useCallback(async (): Promise<void> => {
    throw new Error('Not implemented');
  }, []);

  const removeUserFromChild = useCallback(async (): Promise<void> => {
    throw new Error('Not implemented');
  }, []);

  // ================================================================
  // EFFECTS CORREGIDOS
  // ================================================================

  //  EFECTO INICIAL
  useEffect(() => {
    mountedRef.current = true;
    
    if (userId) {
      fetchChildren();
    } else {
      setChildren([]);
      setLoading(false);
    }

    return () => {
      mountedRef.current = false;
    };
  }, [userId]);

  //  REALTIME CON CANAL ÚNICO
  useEffect(() => {
    if (!realtime || !userId) return;

    // LIMPIAR CANAL ANTERIOR
    if (channelRef.current) {
      console.log('🔄 Cleaning up previous children realtime subscription');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('🔄 Setting up realtime subscription for children with unique channel:', channelId);

    // CREAR CANAL ÚNICO
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'children'
      }, (payload) => {
        console.log('🔄 Children realtime update:', payload.eventType);
        if (mountedRef.current) {
          fetchChildren();
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_child_relations'
      }, (payload) => {
        console.log('🔄 Relations realtime update:', payload.eventType);
        if (mountedRef.current) {
          fetchChildren();
        }
      })
      .subscribe((status) => {
        console.log('📡 Children realtime status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('🔄 Cleaning up children realtime subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [realtime, userId, channelId]);

  // CLEANUP ON UNMOUNT
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

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