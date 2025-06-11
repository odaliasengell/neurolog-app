// src/hooks/use-logs.ts
'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/components/providers/auth-provider'

interface Log {
  id: string
  child_id: string
  category_id: string | null
  title: string
  content: string
  mood_score: number | null
  intensity_level: 'low' | 'medium' | 'high'
  logged_by: string
  log_date: string
  created_at: string
  updated_at: string
}

interface LogWithDetails extends Log {
  child_name: string
  category_name: string | null
  category_color: string
  logged_by_name: string
  can_edit: boolean
}

interface LogStats {
  total: number
  thisWeek: number
  weeklyAverage: number
  daysSinceLastLog: number | null
}

interface UseLogsParams {
  childId?: string
  categoryId?: string
  searchTerm?: string
}

export function useLogs({ childId, categoryId, searchTerm }: UseLogsParams) {
  const [logs, setLogs] = useState<LogWithDetails[]>([])
  const [stats, setStats] = useState<LogStats>({
    total: 0,
    thisWeek: 0,
    weeklyAverage: 0,
    daysSinceLastLog: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()
  const supabase = createClientComponentClient()

  const fetchLogs = async () => {
  if (!profile) {
    setLoading(false)
    return
  }

  try {
    setLoading(true)

    // Primero obtener los niños accesibles
    const { data: relations } = await supabase
      .from('user_child_relations')
      .select('child_id, can_view')
      .eq('user_id', profile.id)
      .eq('can_view', true)

    if (!relations || relations.length === 0) {
      setLogs([])
      setStats({ total: 0, thisWeek: 0, weeklyAverage: 0, daysSinceLastLog: null })
      setLoading(false)
      return
    }

    const accessibleChildrenIds = relations.map(rel => rel.child_id)

    // Construir query para logs
    let query = supabase
      .from('daily_logs')
      .select(`
        *,
        categories (name, color),
        profiles!daily_logs_logged_by_fkey (full_name)
      `)
      .in('child_id', accessibleChildrenIds)

    // Aplicar filtros adicionales
    if (childId && accessibleChildrenIds.includes(childId)) {
      query = query.eq('child_id', childId)
    }
    
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    query = query.order('log_date', { ascending: false })
      .order('created_at', { ascending: false })

    const { data: logsData, error } = await query

    if (error) throw error

    // Obtener nombres de niños por separado
    const { data: childrenData } = await supabase
      .from('children')
      .select('id, name')
      .in('id', accessibleChildrenIds)

    // Combinar datos
    const logsWithDetails: LogWithDetails[] = logsData?.map(log => {
      const child = childrenData?.find(c => c.id === log.child_id)
      return {
        ...log,
        child_name: child?.name || 'Niño',
        category_name: log.categories?.name || null,
        category_color: log.categories?.color || '#6B7280',
        logged_by_name: log.profiles?.full_name || 'Usuario',
        can_edit: log.logged_by === profile.id
      }
    }) || []

    // Resto de la función...
    setLogs(logsWithDetails)
    // ... calcular estadísticas

  } catch (err: any) {
    setError(err.message)
    console.error('Error fetching logs:', err)
  } finally {
    setLoading(false)
  }
}

  useEffect(() => {
    fetchLogs()
  }, [profile, childId, categoryId, searchTerm])

  const addLog = async (logData: {
    child_id: string
    category_id: string | null
    title: string
    content: string
    mood_score: number | null
    intensity_level: 'low' | 'medium' | 'high'
    log_date: string
  }) => {
    if (!profile) throw new Error('No user profile')

    try {
      const { error } = await supabase
        .from('daily_logs')
        .insert({
          ...logData,
          logged_by: profile.id
        })

      if (error) throw error

      // Recargar logs
      await fetchLogs()
    } catch (error) {
      console.error('Error adding log:', error)
      throw error
    }
  }

  const updateLog = async (logId: string, updates: Partial<Log>) => {
    try {
      const { error } = await supabase
        .from('daily_logs')
        .update(updates)
        .eq('id', logId)

      if (error) throw error

      await fetchLogs()
    } catch (error) {
      console.error('Error updating log:', error)
      throw error
    }
  }

  const deleteLog = async (logId: string) => {
    try {
      const { error } = await supabase
        .from('daily_logs')
        .delete()
        .eq('id', logId)

      if (error) throw error

      await fetchLogs()
    } catch (error) {
      console.error('Error deleting log:', error)
      throw error
    }
  }

  return {
    logs,
    stats,
    loading,
    error,
    fetchLogs,
    addLog,
    updateLog,
    deleteLog
  }
}