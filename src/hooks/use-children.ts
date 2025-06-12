// src/hooks/use-children.ts

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

  // ✅ USAR useRef PARA MANTENER REFERENCIA ESTABLE
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ✅ MEMOIZAR userId PARA EVITAR RE-RENDERS
  const userId = useMemo(() => user?.id, [user?.id]);

  /**
   * ✅ FETCH CHILDREN CON QUERY CORREGIDA - ARREGLO URGENTE
   */
  const fetchChildren = useCallback(async (): Promise<void> => {
    if (!userId) {
      setChildren([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('👶 Fetching children for user:', userId);

      // ✅ ARREGLO: QUERY SIMPLIFICADA SIN FILTROS COMPLEJOS
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

      console.log('✅ Raw data fetched:', data?.length || 0);

      // ✅ PROCESAR Y FILTRAR DATOS
      const validRelations = (data || []).filter(relation => {
        // Verificar que el niño existe
        if (!relation.children) return false;
        
        // Verificar que incluir inactivos o que el niño esté activo
        if (!includeInactive && !relation.children.is_active) return false;
        
        // Verificar expiración
        if (relation.expires_at && new Date(relation.expires_at) <= new Date()) return false;
        
        return true;
      });

      // ✅ TRANSFORMAR A ChildWithRelation
      const transformedChildren: ChildWithRelation[] = validRelations.map(relation => {
        const child = relation.children;
        const creator = child.creator;

        return {
          ...child,
          relationship_type: relation.relationship_type,
          can_view: relation.can_view,
          can_edit: relation.can_edit,
          can_export: relation.can_export,
          can_invite_others: relation.can_invite_others,
          granted_at: relation.granted_at,
          expires_at: relation.expires_at,
          creator_name: creator?.full_name || 'Usuario desconocido'
        };
      });

      console.log('✅ Children fetched successfully:', transformedChildren.length);
      setChildren(transformedChildren);

      // Auditoría
      if (transformedChildren.length > 0) {
        await auditSensitiveAccess(
          'VIEW_CHILDREN_LIST',
          userId,
          `Accessed ${transformedChildren.length} children profiles`
        );
      }

    } catch (err) {
      console.error('❌ Error in fetchChildren:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar niños';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, includeInactive, supabase]);

  /**
   * ✅ REFRESH FUNCTION ESTABILIZADA
   */
  const refreshChildren = useCallback(async (): Promise<void> => {
    await fetchChildren();
  }, [fetchChildren]);

  // ================================================================
  // OTRAS FUNCIONES DEL HOOK (simplificadas)
  // ================================================================

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

      // Crear relación automática
      const { error: relationError } = await supabase
        .from('user_child_relations')
        .insert({
          user_id: userId,
          child_id: data.id,
          relationship_type: 'parent',
          can_view: true,
          can_edit: true,
          can_export: true,
          can_invite_others: true,
          granted_by: userId,
          is_active: true
        });

      if (relationError) {
        console.warn('⚠️ Error creating relation:', relationError);
      }

      await refreshChildren();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear niño';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase, refreshChildren]);

  const updateChild = useCallback(async (id: string, updates: ChildUpdate): Promise<Child> => {
    const { data, error } = await supabase
      .from('children')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    await refreshChildren();
    return data;
  }, [supabase, refreshChildren]);

  const deleteChild = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('children')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;
    await refreshChildren();
  }, [supabase, refreshChildren]);

  const getChildById = useCallback((id: string): ChildWithRelation | undefined => {
    return children.find(child => child.id === id);
  }, [children]);

  const filterChildren = useCallback((filters: ChildFilters): ChildWithRelation[] => {
    return children.filter(child => {
      if (filters.name && !child.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
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
  // EFFECTS CORREGIDOS - SIN LOOPS INFINITOS
  // ================================================================

  // ✅ EFECTO INICIAL - SOLO EJECUTAR CUANDO CAMBIE userId
  useEffect(() => {
    if (userId) {
      fetchChildren();
    } else {
      setChildren([]);
      setLoading(false);
    }
  }, [userId]); // ✅ SOLO userId COMO DEPENDENCY

  // ✅ REALTIME CON DEPENDENCIES CORRECTAS
  useEffect(() => {
    if (!realtime || !userId) return;

    console.log('🔄 Setting up realtime subscription for children');

    const channel = supabase
      .channel('children-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'children'
      }, (payload) => {
        console.log('🔄 Children realtime update:', payload);
        fetchChildren(); // ✅ USAR FUNCIÓN DIRECTAMENTE
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_child_relations'
      }, (payload) => {
        console.log('🔄 Relations realtime update:', payload);
        fetchChildren(); // ✅ USAR FUNCIÓN DIRECTAMENTE
      })
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up children realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [realtime, userId]); // ✅ DEPENDENCIES MÍNIMAS Y ESTABLES

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