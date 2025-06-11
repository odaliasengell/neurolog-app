// src/hooks/useChildren.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Child, ChildWithRelation, RelationshipType } from '@/types'

interface UseChildrenReturn {
  children: ChildWithRelation[]
  loading: boolean
  error: string | null
  createChild: (child: Omit<Child, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => Promise<Child>
  updateChild: (id: string, updates: Partial<Child>) => Promise<void>
  deleteChild: (id: string) => Promise<void>
  grantAccess: (childId: string, userId: string, relationshipType: RelationshipType, permissions: {
    canEdit: boolean
    canView: boolean
    canExport: boolean
  }) => Promise<void>
  revokeAccess: (childId: string, userId: string) => Promise<void>
  refreshChildren: () => Promise<void>
}

export function useChildren(userId: string): UseChildrenReturn {
  const [children, setChildren] = useState<ChildWithRelation[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChildren = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('children')
        .select(`
          *,
          user_child_relations!inner(
            relationship_type,
            can_edit,
            can_view,
            can_export
          )
        `)
        .eq('user_child_relations.user_id', userId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      const childrenWithRelations: ChildWithRelation[] = data.map((child: any) => ({
        ...child,
        relationship_type: child.user_child_relations[0]?.relationship_type,
        can_edit: child.user_child_relations[0]?.can_edit || false,
        can_view: child.user_child_relations[0]?.can_view || false,
        can_export: child.user_child_relations[0]?.can_export || false,
      }))

      setChildren(childrenWithRelations)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar niños'
      setError(message)
      console.error('Error fetching children:', err)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const createChild = useCallback(async (
    childData: Omit<Child, 'id' | 'created_at' | 'updated_at' | 'created_by'>
  ): Promise<Child> => {
    try {
      setError(null)

      const { data, error } = await supabase
        .from('children')
        .insert({
          ...childData,
          created_by: userId,
        })
        .select()
        .single()

      if (error) throw error

      await fetchChildren() // Refrescar la lista
      return data as Child
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear niño'
      setError(message)
      throw new Error(message)
    }
  }, [userId, fetchChildren])

  const updateChild = useCallback(async (
    id: string, 
    updates: Partial<Child>
  ): Promise<void> => {
    try {
      setError(null)

      const { error } = await supabase
        .from('children')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      await fetchChildren() // Refrescar la lista
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar niño'
      setError(message)
      throw new Error(message)
    }
  }, [fetchChildren])

  const deleteChild = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null)

      const { error } = await supabase
        .from('children')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error

      await fetchChildren() // Refrescar la lista
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar niño'
      setError(message)
      throw new Error(message)
    }
  }, [fetchChildren])

  const grantAccess = useCallback(async (
    childId: string,
    targetUserId: string,
    relationshipType: RelationshipType,
    permissions: {
      canEdit: boolean
      canView: boolean
      canExport: boolean
    }
  ): Promise<void> => {
    try {
      setError(null)

      const { error } = await supabase
        .from('user_child_relations')
        .upsert({
          user_id: targetUserId,
          child_id: childId,
          relationship_type: relationshipType,
          can_edit: permissions.canEdit,
          can_view: permissions.canView,
          can_export: permissions.canExport,
          granted_by: userId,
        })

      if (error) throw error
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al otorgar acceso'
      setError(message)
      throw new Error(message)
    }
  }, [userId])

  const revokeAccess = useCallback(async (
    childId: string,
    targetUserId: string
  ): Promise<void> => {
    try {
      setError(null)

      const { error } = await supabase
        .from('user_child_relations')
        .delete()
        .eq('child_id', childId)
        .eq('user_id', targetUserId)

      if (error) throw error
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al revocar acceso'
      setError(message)
      throw new Error(message)
    }
  }, [])

  const refreshChildren = useCallback(async (): Promise<void> => {
    await fetchChildren()
  }, [fetchChildren])

  useEffect(() => {
    if (userId) {
      fetchChildren()
    }
  }, [userId, fetchChildren])

  return {
    children,
    loading,
    error,
    createChild,
    updateChild,
    deleteChild,
    grantAccess,
    revokeAccess,
    refreshChildren,
  }
}
