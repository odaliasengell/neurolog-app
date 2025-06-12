// src/hooks/use-logs.ts
// Hook actualizado para gestión de registros diarios SIN usar vistas - usando JOINs directos

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient, userCanAccessChild, userCanEditChild, auditSensitiveAccess } from '@/lib/supabase';
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
  const supabase = createClient();

  // ================================================================
  // FUNCIÓN HELPER PARA OBTENER NIÑOS ACCESIBLES
  // ================================================================

  const getAccessibleChildrenIds = useCallback(async (): Promise<string[]> => {
  if (!user) return [];

  try {
    // ✅ USAR CONSULTA SIMPLE SIN OR PROBLEMÁTICO
    const { data } = await supabase
      .from('user_child_relations')
      .select('child_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    return data?.map(relation => relation.child_id) || [];
  } catch (error) {
    console.error('❌ Error getting accessible children:', error);
    return [];
  }
}, [user, supabase]);

  // ================================================================
  // FUNCIONES PRINCIPALES
  // ================================================================

  /**
   * Obtener logs con detalles completos usando JOINs directos
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

      // Obtener IDs de niños accesibles
      const accessibleChildrenIds = await getAccessibleChildrenIds();
      
      if (accessibleChildrenIds.length === 0) {
        setLogs([]);
        setHasMore(false);
        return;
      }

      // Construir query con joins para obtener detalles completos
      let query = supabase
        .from('daily_logs')
        .select(`
          *,
          child:children(id, name, avatar_url),
          category:categories(id, name, color, icon),
          logged_by_profile:profiles!logged_by(id, full_name, avatar_url),
          reviewed_by_profile:profiles!reviewed_by(id, full_name, avatar_url)
        `);

      // Filtros
      if (childId) {
        query = query.eq('child_id', childId);
      } else {
        // Solo logs de niños accesibles
        query = query.in('child_id', accessibleChildrenIds);
      }

      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      if (!includePrivate && user.role !== 'admin') {
        query = query.eq('is_private', false);
      }

      // Paginación
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error: fetchError } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (fetchError) {
        console.error('❌ Error fetching logs:', fetchError);
        throw fetchError;
      }

      console.log('✅ Logs fetched successfully:', data?.length || 0);

      const newLogs = data || [];
      
      if (append) {
        setLogs(prev => [...prev, ...newLogs]);
      } else {
        setLogs(newLogs);
      }

      // Determinar si hay más páginas
      setHasMore(newLogs.length === pageSize);

      // Registrar acceso para auditoría
      if (newLogs.length > 0) {
        await auditSensitiveAccess(
          'VIEW_LOGS_LIST',
          user.id,
          `Accessed ${newLogs.length} logs (page ${page})`
        );
      }

    } catch (err) {
      console.error('❌ Error in fetchLogs:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar los registros';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, childId, includePrivate, includeDeleted, pageSize, supabase, getAccessibleChildrenIds]);

  /**
   * Obtener estadísticas del dashboard
   */
  const fetchStats = useCallback(async (): Promise<void> => {
    if (!user) return;

    try {
      console.log('📊 Fetching dashboard stats...');

      // Obtener IDs de niños accesibles primero
      const accessibleChildrenIds = await getAccessibleChildrenIds();

      // Obtener estadísticas usando queries SQL directas
      const [
        childrenCount,
        logsCount,
        weeklyLogs,
        monthlyLogs,
        categoriesCount,
        pendingReviews,
        followUps
      ] = await Promise.all([
        // Total niños accesibles - simplemente contar los IDs
        Promise.resolve({ count: accessibleChildrenIds.length }),

        // Total logs de niños accesibles
        accessibleChildrenIds.length > 0 ? 
          supabase
            .from('daily_logs')
            .select('id', { count: 'exact', head: true })
            .in('child_id', accessibleChildrenIds)
            .eq('is_deleted', false) :
          Promise.resolve({ count: 0 }),

        // Logs esta semana
        accessibleChildrenIds.length > 0 ?
          supabase
            .from('daily_logs')
            .select('id', { count: 'exact', head: true })
            .in('child_id', accessibleChildrenIds)
            .eq('is_deleted', false)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) :
          Promise.resolve({ count: 0 }),

        // Logs este mes
        accessibleChildrenIds.length > 0 ?
          supabase
            .from('daily_logs')
            .select('id', { count: 'exact', head: true })
            .in('child_id', accessibleChildrenIds)
            .eq('is_deleted', false)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) :
          Promise.resolve({ count: 0 }),

        // Categorías activas
        supabase
          .from('categories')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),

        // Logs pendientes de revisión
        accessibleChildrenIds.length > 0 ?
          supabase
            .from('daily_logs')
            .select('id', { count: 'exact', head: true })
            .in('child_id', accessibleChildrenIds)
            .eq('is_deleted', false)
            .is('reviewed_by', null) :
          Promise.resolve({ count: 0 }),

        // Follow-ups vencidos
        accessibleChildrenIds.length > 0 ?
          supabase
            .from('daily_logs')
            .select('id', { count: 'exact', head: true })
            .in('child_id', accessibleChildrenIds)
            .eq('is_deleted', false)
            .eq('follow_up_required', true)
            .lte('follow_up_date', new Date().toISOString().split('T')[0]) :
          Promise.resolve({ count: 0 })
      ]);

      const newStats: DashboardStats = {
        total_children: childrenCount.count || 0,
        total_logs: logsCount.count || 0,
        logs_this_week: weeklyLogs.count || 0,
        logs_this_month: monthlyLogs.count || 0,
        active_categories: categoriesCount.count || 0,
        pending_reviews: pendingReviews.count || 0,
        follow_ups_due: followUps.count || 0
      };

      console.log('✅ Stats fetched successfully:', newStats);
      setStats(newStats);

    } catch (err) {
      console.error('❌ Error fetching stats:', err);
    }
  }, [user, supabase, getAccessibleChildrenIds]);

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

      // Verificar permisos de acceso al niño
      const canAccess = await userCanAccessChild(logData.child_id, user.id);
      if (!canAccess) {
        throw new Error('No tienes permisos para crear registros para este niño');
      }

      const { data, error } = await supabase
        .from('daily_logs')
        .insert({
          ...logData,
          logged_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating log:', error);
        throw error;
      }

      console.log('✅ Log created successfully:', data.id);

      // Refrescar logs y stats
      await Promise.all([
        fetchLogs(0, false),
        fetchStats()
      ]);

      // Auditoría
      await auditSensitiveAccess(
        'CREATE_LOG',
        data.id,
        `Created log: ${data.title}`
      );

      return data;
    } catch (err) {
      console.error('❌ Error in createLog:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al crear el registro';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchLogs, fetchStats, supabase]);

  /**
   * Actualizar log
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

      console.log('✅ Log updated successfully:', data.id);

      // Refrescar logs
      await fetchLogs(0, false);

      // Auditoría
      await auditSensitiveAccess(
        'UPDATE_LOG',
        data.id,
        `Updated log: ${data.title}`
      );

      return data;
    } catch (err) {
      console.error('❌ Error in updateLog:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el registro';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchLogs, supabase]);

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

      console.log('🗑️ Deleting log:', id);

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

      console.log('✅ Log deleted successfully:', id);

      // Refrescar logs y stats
      await Promise.all([
        fetchLogs(0, false),
        fetchStats()
      ]);

      // Auditoría
      await auditSensitiveAccess(
        'DELETE_LOG',
        id,
        'Log marked as deleted'
      );

    } catch (err) {
      console.error('❌ Error in deleteLog:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar el registro';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchLogs, fetchStats, supabase]);

  /**
   * Marcar log como revisado
   */
  const markAsReviewed = useCallback(async (id: string, specialistNotes?: string): Promise<void> => {
    if (!user || user.role !== 'specialist') {
      throw new Error('Solo los especialistas pueden revisar registros');
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
          specialist_notes: specialistNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('❌ Error marking as reviewed:', error);
        throw error;
      }

      console.log('✅ Log marked as reviewed successfully');

      // Refrescar logs y stats
      await Promise.all([
        fetchLogs(0, false),
        fetchStats()
      ]);

    } catch (err) {
      console.error('❌ Error in markAsReviewed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al marcar como revisado';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchLogs, fetchStats, supabase]);

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
        console.error('❌ Error adding feedback:', error);
        throw error;
      }

      console.log('✅ Parent feedback added successfully');

      // Refrescar logs
      await fetchLogs(0, false);

    } catch (err) {
      console.error('❌ Error in addParentFeedback:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al agregar comentario';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchLogs, supabase]);

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
      await fetchLogs(0, false);
    } catch (err) {
      console.error('❌ Error in togglePrivacy:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al cambiar privacidad';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user, fetchLogs, supabase]);

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

      // Filtro por intensidad
      if (filters.intensity_level && log.intensity_level !== filters.intensity_level) return false;

      // Filtro por estado de ánimo
      if (filters.mood_score && log.mood_score !== filters.mood_score) return false;

      // Filtro por búsqueda de texto
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!log.title.toLowerCase().includes(searchLower) &&
            !log.content.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [logs]);

  /**
   * Exportar logs
   */
  const exportLogs = useCallback(async (format: 'csv' | 'pdf', filters?: LogFilters): Promise<void> => {
    try {
      console.log(`📄 Exporting logs as ${format.toUpperCase()}...`);

      const logsToExport = filters ? filterLogs(filters) : logs;

      if (format === 'csv') {
        // Implementar exportación CSV
        const csvContent = [
          // Header
          ['Fecha', 'Niño', 'Categoría', 'Título', 'Contenido', 'Estado de Ánimo', 'Intensidad'].join(','),
          // Data rows
          ...logsToExport.map(log => [
            log.log_date,
            log.child?.name || '',
            log.category?.name || '',
            `"${log.title}"`,
            `"${log.content.replace(/"/g, '""')}"`,
            log.mood_score || '',
            log.intensity_level
          ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `neurolog-registros-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
      } else {
        // TODO: Implementar exportación PDF con jsPDF
        console.log('PDF export not implemented yet');
        throw new Error('Exportación PDF próximamente disponible');
      }

      // Auditoría
      await auditSensitiveAccess(
        'EXPORT_LOGS',
        user?.id || '',
        `Exported ${logsToExport.length} logs as ${format.toUpperCase()}`
      );

    } catch (err) {
      console.error('❌ Error exporting logs:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al exportar';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [logs, filterLogs, user]);

  /**
   * Obtener log por ID
   */
  const getLogById = useCallback((id: string): LogWithDetails | undefined => {
    return logs.find(log => log.id === id);
  }, [logs]);

  /**
   * Verificar si el usuario puede editar un log
   */
  const canEditLog = useCallback(async (logId: string): Promise<boolean> => {
    const log = logs.find(l => l.id === logId);
    if (!log) return false;

    return await userCanEditChild(log.child_id, user?.id);
  }, [logs, user]);

  // ================================================================
  // EFFECTS
  // ================================================================

  useEffect(() => {
    Promise.all([
      fetchLogs(0, false),
      fetchStats()
    ]);
  }, [fetchLogs, fetchStats]);

  // Configurar realtime si está habilitado
  useEffect(() => {
    if (!realtime || !user) return;

    console.log('🔄 Setting up realtime subscription for logs');

    const channel = supabase
      .channel('logs-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_logs'
      }, (payload) => {
        console.log('🔄 Logs realtime update:', payload);
        refreshLogs();
      })
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up logs realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [realtime, user, refreshLogs, supabase]);

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
    canEditLog
  };
}