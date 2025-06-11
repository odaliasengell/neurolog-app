// src/hooks/use-logs.ts
// Hook actualizado para gestión de registros diarios con el nuevo modelo

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, userCanAccessChild, userCanEditChild, auditSensitiveAccess } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import type { 
  LogWithDetails, 
  DailyLog, 
  LogInsert, 
  LogUpdate, 
  LogFilters,
  DashboardStats,
  ChildLogStatistics
} from '@/types';

// ================================================================
// INTERFACES DEL HOOK
// ================================================================

interface UseLogsOptions {
  childId?: string;
  includePrivate?: boolean;
  includeDeleted?: boolean;
  autoRefresh?: boolean;
  realtime?: boolean;
  pageSize?: number;
}

interface UseLogsReturn {
  logs: LogWithDetails[];
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  createLog: (logData: LogInsert) => Promise<DailyLog>;
  updateLog: (id: string, updates: LogUpdate) => Promise<DailyLog>;
  deleteLog: (id: string) => Promise<void>;
  markAsReviewed: (id: string, specialistNotes?: string) => Promise<void>;
  addParentFeedback: (id: string, feedback: string) => Promise<void>;
  togglePrivacy: (id: string) => Promise<void>;
  loadMore: () => Promise<void>;
  refreshLogs: () => Promise<void>;
  filterLogs: (filters: LogFilters) => LogWithDetails[];
  exportLogs: (format: 'csv' | 'pdf', filters?: LogFilters) => Promise<void>;
  getLogById: (id: string) => LogWithDetails | undefined;
  canEditLog: (logId: string) => Promise<boolean>;
}

// ================================================================
// HOOK PRINCIPAL
// ================================================================

export function useLogs(options: UseLogsOptions = {}): UseLogsReturn {
  const {
    childId,
    includePrivate = false,
    includeDeleted = false,
    autoRefresh = true,
    realtime = true,
    pageSize = 20
  } = options;

  const { user } = useAuth();
  const [logs, setLogs] = useState<LogWithDetails[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_children: 0,
    total_logs: 0,
    logs_this_week: 0,
    logs_this_month: 0,
    active_categories: 0,
    pending_reviews: 0,
    follow_ups_due: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // ================================================================
  // FUNCIONES PRINCIPALES
  // ================================================================

  /**
   * Obtener logs con detalles completos
   */
  const fetchLogs = useCallback(async (page: number = 0, append: boolean = false): Promise<void> => {
    if (!user) {
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      if (!append) {
        setLoading(true);
      }
      setError(null);

      console.log(`📚 Fetching logs (page ${page})...`);

      // Construir query base con joins para detalles
      let query = supabase
        .from('daily_logs')
        .select(`
          *,
          children!inner (
            id,
            name,
            avatar_url
          ),
          categories (
            name,
            color,
            icon
          ),
          profiles!daily_logs_logged_by_fkey (
            full_name,
            avatar_url
          ),
          profiles!daily_logs_reviewed_by_fkey (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Aplicar filtros
      if (childId) {
        query = query.eq('child_id', childId);
      }

      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      // El filtro de privacidad se maneja automáticamente por RLS
      // pero podemos agregar lógica adicional si es necesario

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching logs:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} logs`);

      // Transformar datos a LogWithDetails
      const logsWithDetails: LogWithDetails[] = (data || []).map(log => ({
        id: log.id,
        child_id: log.child_id,
        category_id: log.category_id,
        title: log.title,
        content: log.content,
        mood_score: log.mood_score,
        intensity_level: log.intensity_level,
        logged_by: log.logged_by,
        log_date: log.log_date,
        is_private: log.is_private,
        is_deleted: log.is_deleted,
        is_flagged: log.is_flagged,
        attachments: log.attachments as any || [],
        tags: log.tags || [],
        location: log.location,
        weather: log.weather,
        reviewed_by: log.reviewed_by,
        reviewed_at: log.reviewed_at,
        specialist_notes: log.specialist_notes,
        parent_feedback: log.parent_feedback,
        follow_up_required: log.follow_up_required,
        follow_up_date: log.follow_up_date,
        created_at: log.created_at,
        updated_at: log.updated_at,
        // Datos de relaciones
        child_name: log.children?.name || 'Niño desconocido',
        child_avatar_url: log.children?.avatar_url,
        category_name: log.categories?.name || null,
        category_color: log.categories?.color || '#3B82F6',
        category_icon: log.categories?.icon || 'circle',
        logged_by_name: log.profiles?.full_name || 'Usuario desconocido',
        logged_by_avatar: log.profiles?.avatar_url,
        reviewer_name: log.profiles?.full_name || null,
        can_edit: log.logged_by === user.id || user.role === 'specialist'
      }));

      if (append) {
        setLogs(prev => [...prev, ...logsWithDetails]);
      } else {
        setLogs(logsWithDetails);
      }

      // Verificar si hay más páginas
      setHasMore(data?.length === pageSize);

      // Registrar acceso para auditoría
      for (const log of logsWithDetails) {
        await auditSensitiveAccess('daily_logs', log.id, 'SELECT');
      }

    } catch (err) {
      console.error('❌ Error in fetchLogs:', err);
      setError(err instanceof Error ? err.message : 'Error loading logs');
    } finally {
      if (!append) {
        setLoading(false);
      }
    }
  }, [user, childId, includeDeleted, pageSize]);

  /**
   * Obtener estadísticas del dashboard
   */
  const fetchStats = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      console.log('📊 Fetching dashboard stats...');

      // Usar la vista optimizada
      const { data: childStats } = await supabase
        .from('child_log_statistics')
        .select('*');

      if (childStats) {
        const stats: DashboardStats = {
          total_children: childStats.length,
          total_logs: childStats.reduce((sum, child) => sum + (child.total_logs || 0), 0),
          logs_this_week: childStats.reduce((sum, child) => sum + (child.logs_this_week || 0), 0),
          logs_this_month: childStats.reduce((sum, child) => sum + (child.logs_this_month || 0), 0),
          last_log_date: childStats.reduce((latest, child) => {
            if (!child.last_log_date) return latest;
            if (!latest) return child.last_log_date;
            return child.last_log_date > latest ? child.last_log_date : latest;
          }, null as string | null),
          avg_mood_score: childStats.reduce((sum, child, _, arr) => {
            return sum + (child.avg_mood_score || 0) / arr.length;
          }, 0),
          active_categories: 0, // Se calculará por separado
          pending_reviews: 0,   // Se calculará por separado
          follow_ups_due: 0     // Se calculará por separado
        };

        // Obtener categorías activas
        const { data: categories } = await supabase
          .from('categories')
          .select('id')
          .eq('is_active', true);
        
        stats.active_categories = categories?.length || 0;

        // Obtener reviews pendientes
        const { data: pendingReviews } = await supabase
          .from('daily_logs')
          .select('id')
          .is('reviewed_by', null)
          .eq('is_deleted', false);
        
        stats.pending_reviews = pendingReviews?.length || 0;

        // Obtener follow-ups pendientes
        const { data: followUps } = await supabase
          .from('daily_logs')
          .select('id')
          .eq('follow_up_required', true)
          .lte('follow_up_date', new Date().toISOString().split('T')[0])
          .eq('is_deleted', false);
        
        stats.follow_ups_due = followUps?.length || 0;

        setStats(stats);
      }

    } catch (err) {
      console.warn('Warning: Could not fetch stats:', err);
    }
  }, [user]);

  /**
   * Crear nuevo log
   */
  const createLog = useCallback(async (logData: LogInsert): Promise<DailyLog> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📝 Creating new log:', logData.title);

      // Verificar permisos
      const canEdit = await userCanEditChild(logData.child_id);
      if (!canEdit) {
        throw new Error('No tienes permisos para crear logs para este niño');
      }

      const dataToInsert = {
        ...logData,
        logged_by: user.id,
        log_date: logData.log_date || new Date().toISOString().split('T')[0]
      };

      const { data, error } = await supabase
        .from('daily_logs')
        .insert(dataToInsert)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating log:', error);
        throw error;
      }

      console.log('✅ Log created successfully:', data);

      // Refrescar logs y stats
      await Promise.all([
        fetchLogs(),
        fetchStats()
      ]);

      return data as DailyLog;
    } catch (err) {
      console.error('❌ Error in createLog:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error creating log';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchLogs, fetchStats]);

  /**
   * Actualizar log existente
   */
  const updateLog = useCallback(async (id: string, updates: LogUpdate): Promise<DailyLog> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📝 Updating log:', id);

      const { data, error } = await supabase
        .from('daily_logs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating log:', error);
        throw error;
      }

      console.log('✅ Log updated successfully:', data);

      // Refrescar logs
      await fetchLogs();

      return data as DailyLog;
    } catch (err) {
      console.error('❌ Error in updateLog:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error updating log';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchLogs]);

  /**
   * Eliminar log (soft delete)
   */
  const deleteLog = useCallback(async (id: string): Promise<void> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🗑️ Soft deleting log:', id);

      const { error } = await supabase
        .from('daily_logs')
        .update({ 
          is_deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting log:', error);
        throw error;
      }

      console.log('✅ Log deleted successfully');

      // Refrescar logs y stats
      await Promise.all([
        fetchLogs(),
        fetchStats()
      ]);
    } catch (err) {
      console.error('❌ Error in deleteLog:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error deleting log';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchLogs, fetchStats]);

  /**
   * Marcar log como revisado (especialistas)
   */
  const markAsReviewed = useCallback(async (id: string, specialistNotes?: string): Promise<void> => {
    if (!user || user.role !== 'specialist') {
      throw new Error('Solo especialistas pueden revisar logs');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('✅ Marking log as reviewed:', id);

      const { error } = await supabase
        .from('daily_logs')
        .update({
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          specialist_notes: specialistNotes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error marking log as reviewed:', error);
        throw error;
      }

      console.log('✅ Log marked as reviewed successfully');

      // Refrescar logs y stats
      await Promise.all([
        fetchLogs(),
        fetchStats()
      ]);
    } catch (err) {
      console.error('❌ Error in markAsReviewed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error marking log as reviewed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchLogs, fetchStats]);

  /**
   * Agregar feedback de padres
   */
  const addParentFeedback = useCallback(async (id: string, feedback: string): Promise<void> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('💬 Adding parent feedback:', id);

      const { error } = await supabase
        .from('daily_logs')
        .update({
          parent_feedback: feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error adding parent feedback:', error);
        throw error;
      }

      console.log('✅ Parent feedback added successfully');

      // Refrescar logs
      await fetchLogs();
    } catch (err) {
      console.error('❌ Error in addParentFeedback:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error adding parent feedback';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchLogs]);

  /**
   * Toggle privacidad del log
   */
  const togglePrivacy = useCallback(async (id: string): Promise<void> => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔒 Toggling log privacy:', id);

      // Obtener estado actual
      const { data: currentLog } = await supabase
        .from('daily_logs')
        .select('is_private')
        .eq('id', id)
        .single();

      if (!currentLog) {
        throw new Error('Log no encontrado');
      }

      const { error } = await supabase
        .from('daily_logs')
        .update({
          is_private: !currentLog.is_private,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error toggling privacy:', error);
        throw error;
      }

      console.log('✅ Log privacy toggled successfully');

      // Refrescar logs
      await fetchLogs();
    } catch (err) {
      console.error('❌ Error in togglePrivacy:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error toggling privacy';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchLogs]);

  /**
   * Cargar más logs (paginación)
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || loading) return;

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await fetchLogs(nextPage, true);
  }, [hasMore, loading, currentPage, fetchLogs]);

  /**
   * Refrescar logs
   */
  const refreshLogs = useCallback(async (): Promise<void> => {
    setCurrentPage(0);
    await Promise.all([
      fetchLogs(0, false),
      fetchStats()
    ]);
  }, [fetchLogs, fetchStats]);

  /**
   * Filtrar logs según criterios
   */
  const filterLogs = useCallback((filters: LogFilters): LogWithDetails[] => {
    return logs.filter(log => {
      // Filtro por niño
      if (filters.child_id && log.child_id !== filters.child_id) return false;

      // Filtro por categoría
      if (filters.category_id && log.category_id !== filters.category_id) return false;

      // Filtro por rango de fechas
      if (filters.date_from && log.log_date < filters.date_from) return false;
      if (filters.date_to && log.log_date > filters.date_to) return false;

      // Filtro por mood score
      if (filters.mood_score_min && (!log.mood_score || log.mood_score < filters.mood_score_min)) return false;
      if (filters.mood_score_max && (!log.mood_score || log.mood_score > filters.mood_score_max)) return false;

      // Filtro por intensidad
      if (filters.intensity_level && log.intensity_level !== filters.intensity_level) return false;

      // Filtro por privacidad
      if (filters.is_private !== undefined && log.is_private !== filters.is_private) return false;

      // Filtro por adjuntos
      if (filters.has_attachments !== undefined) {
        const hasAttachments = log.attachments.length > 0;
        if (hasAttachments !== filters.has_attachments) return false;
      }

      // Filtro por tags
      if (filters.tags && filters.tags.length > 0) {
        const hasTag = filters.tags.some(tag => log.tags.includes(tag));
        if (!hasTag) return false;
      }

      // Filtro por término de búsqueda
      if (filters.search_term) {
        const term = filters.search_term.toLowerCase();
        if (!log.title.toLowerCase().includes(term) &&
            !log.content.toLowerCase().includes(term) &&
            !log.tags.some(tag => tag.toLowerCase().includes(term))) {
          return false;
        }
      }

      // Filtro por autor
      if (filters.logged_by && log.logged_by !== filters.logged_by) return false;

      // Filtro por estado de revisión
      if (filters.reviewed_status) {
        if (filters.reviewed_status === 'reviewed' && !log.reviewed_by) return false;
        if (filters.reviewed_status === 'pending' && log.reviewed_by) return false;
      }

      // Filtro por follow-up
      if (filters.follow_up_status) {
        if (filters.follow_up_status === 'required' && !log.follow_up_required) return false;
        if (filters.follow_up_status === 'completed' && log.follow_up_required) return false;
      }

      return true;
    });
  }, [logs]);

  /**
   * Exportar logs
   */
  const exportLogs = useCallback(async (format: 'csv' | 'pdf', filters?: LogFilters): Promise<void> => {
    // TODO: Implementar exportación
    console.log('📄 Exporting logs:', { format, filters });
    throw new Error('Export functionality not implemented yet');
  }, []);

  /**
   * Obtener log por ID
   */
  const getLogById = useCallback((id: string): LogWithDetails | undefined => {
    return logs.find(log => log.id === id);
  }, [logs]);

  /**
   * Verificar si puede editar un log
   */
  const canEditLog = useCallback(async (logId: string): Promise<boolean> => {
    const log = getLogById(logId);
    if (!log || !user) return false;
    
    // Solo el autor puede editar en las primeras 24 horas
    const createdAt = new Date(log.created_at);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    return log.logged_by === user.id && hoursSinceCreation <= 24;
  }, [getLogById, user]);

  // ================================================================
  // EFECTOS
  // ================================================================

  // Cargar logs cuando cambie el usuario o filtros
  useEffect(() => {
    if (user) {
      setCurrentPage(0);
      Promise.all([
        fetchLogs(0, false),
        fetchStats()
      ]);
    } else {
      setLogs([]);
      setLoading(false);
    }
  }, [user, childId, fetchLogs, fetchStats]);

  // Configurar realtime si está habilitado
  useEffect(() => {
    if (!realtime || !user) return;

    console.log('🔄 Setting up realtime subscription for logs');

    const subscription = supabase
      .channel('logs_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_logs'
      }, (payload) => {
        console.log('🔄 Logs realtime update:', payload);
        if (autoRefresh) {
          refreshLogs();
        }
      })
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up logs realtime subscription');
      subscription.unsubscribe();
    };
  }, [realtime, user, autoRefresh, refreshLogs]);

  // ================================================================
  // RETURN
  // ================================================================

  return {
    logs,
    stats,
    loading,
    error,
    hasMore,
    createLog,
    updateLog,
    deleteLog,
    markAsReviewed,
    addParentFeedback,
    togglePrivacy,
    loadMore,
    refreshLogs,
    filterLogs,
    exportLogs,
    getLogById,
    canEditLog,
  };
}