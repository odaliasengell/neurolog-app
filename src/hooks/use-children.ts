// src/hooks/use-children.ts
'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/components/providers/auth-provider'

interface Child {
  id: string
  name: string
  birth_date: string | null
  diagnosis: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

interface ChildWithRelation extends Child {
  relationship_type: string
  can_edit: boolean
  can_view: boolean
}

export function useChildren() {
  const [children, setChildren] = useState<ChildWithRelation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()
  const supabase = createClientComponentClient()

  const fetchChildren = async () => {
  if (!profile) {
    setLoading(false)
    return
  }

  try {
    setLoading(true)
    
    // CONSULTA CORREGIDA - Sin join directo que cause recursión
    const { data: relations, error: relationsError } = await supabase
      .from('user_child_relations')
      .select('*')
      .eq('user_id', profile.id)

    if (relationsError) throw relationsError

    if (!relations || relations.length === 0) {
      setChildren([])
      setError(null)
      setLoading(false)
      return
    }

    // Obtener los IDs de los niños
    const childrenIds = relations.map(rel => rel.child_id)

    // Consulta separada para los niños
    const { data: childrenData, error: childrenError } = await supabase
      .from('children')
      .select('*')
      .in('id', childrenIds)

    if (childrenError) throw childrenError

    // Combinar datos manualmente
    const childrenWithRelations: ChildWithRelation[] = childrenData?.map(child => {
      const relation = relations.find(rel => rel.child_id === child.id)
      return {
        ...child,
        relationship_type: relation?.relationship_type || 'observer',
        can_edit: relation?.can_edit || false,
        can_view: relation?.can_view || true
      }
    }) || []

    setChildren(childrenWithRelations)
    setError(null)
  } catch (err: any) {
    setError(err.message)
    console.error('Error fetching children:', err)
  } finally {
    setLoading(false)
  }
}

  useEffect(() => {
    fetchChildren()
  }, [profile])

  const addChild = async (childData: {
    name: string
    birth_date?: string
    diagnosis?: string
    notes?: string
  }) => {
    if (!profile) throw new Error('No user profile')

    try {
      // Crear el niño
      const { data: newChild, error: childError } = await supabase
        .from('children')
        .insert({
          ...childData,
          created_by: profile.id
        })
        .select()
        .single()

      if (childError) throw childError

      // Crear la relación
      const { error: relationError } = await supabase
        .from('user_child_relations')
        .insert({
          user_id: profile.id,
          child_id: newChild.id,
          relationship_type: 'parent',
          can_edit: true,
          can_view: true
        })

      if (relationError) throw relationError

      // Actualizar la lista
      await fetchChildren()
      return newChild
    } catch (error) {
      console.error('Error adding child:', error)
      throw error
    }
  }

  const updateChild = async (childId: string, updates: Partial<Child>) => {
    try {
      const { error } = await supabase
        .from('children')
        .update(updates)
        .eq('id', childId)

      if (error) throw error

      await fetchChildren()
    } catch (error) {
      console.error('Error updating child:', error)
      throw error
    }
  }

  const deleteChild = async (childId: string) => {
    try {
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId)

      if (error) throw error

      await fetchChildren()
    } catch (error) {
      console.error('Error deleting child:', error)
      throw error
    }
  }

  return {
    children,
    loading,
    error,
    fetchChildren,
    addChild,
    updateChild,
    deleteChild
  }
}