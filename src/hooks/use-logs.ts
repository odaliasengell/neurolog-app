// src/hooks/use-logs.ts

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
// HOOK PRINCIPAL - CORREGIDO
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
  
  // ✅ USAR useRef PARA MANTENER REFERENCIA ESTABLE
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  // ✅ MEMOIZAR userId PARA EVITAR RE-RENDERS
  const userId = useMemo(() => user?.id, [user?.id]);

  // ================================================================
  // FUNCIÓN HELPER ESTABILIZADA
  // ================================================================

  const getAccessibleChildrenIds = useCallback(async (): Promise<string[]> => {
    if (!userId) return [];

    try {
      const { data } = await supabase
        .from('user_child_relations')
        .select('child_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      return data?.map(relation => relation.child_id) || [];
    } catch (error) {
      console.error('❌ Error getting accessible children:', error);
      return [];
    }
  }, [userId, supabase]); // ✅ DEPENDENCIES ESTABLES

  // ================================================================
  // FUNCIONES PRINCIPALES ESTABILIZADAS
  // ================================================================

  /**
   * ✅ FETCH LOGS CON DEPENDENCIES CORREGIDAS
   */
  const fetchLogs = useCallback(async (page: number = 0, append: boolean = false): Promise<void> => {
    if (!userId) {
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

      const accessibleChildrenIds = await getAccessibleChildrenIds();
      
      if (accessibleChildrenIds.length === 0) {
        setLogs([]);
        setHasMore(false);
        return;
      }

      let query = supabase
        .from('daily_logs')
        .select(`
          *,
          child:children(id, name, avatar_url),
          category:categories(id, name, color, icon),
          logged_by_profile:profiles!logged_by(id, full_name, avatar_url),
          reviewed_by_profile:profiles!reviewed_by(id, full_name, avatar_url)
        `);

      if (childId) {
        query = query.eq('child_id', childId);
      } else {
        query = query.in('child_id', accessibleChildrenIds);
      }

      if (!includeDeleted) {
        query = query.eq('is_deleted', false);
      }

      if (!includePrivate && user?.role !== 'admin') {
        query = query.eq('is_private', false);
      }

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

      setHasMore(newLogs.length === pageSize);

      if (newLogs.length > 0) {
        await auditSensitiveAccess(
          'VIEW_LOGS_LIST',
          userId,
          `Accessed ${newLogs.length} logs (page ${page})`
        );
      }

    } catch (err) {
      console.error('❌ Error in fetchLogs:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar registros';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, childId, includeDeleted, includePrivate, user?.role, pageSize, getAccessibleChildrenIds, supabase]);

  /**
   * ✅ FETCH STATS CON DEPENDENCIES CORREGIDAS
   */
  const fetchStats = useCallback(async (): Promise<void> => {
    if (!userId) return;

    try {
      console.log('📊 Fetching dashboard stats...');

      const accessibleChildrenIds = await getAccessibleChildrenIds();

      if (accessibleChildrenIds.length === 0) {
        setStats({
          total_children: 0,
          total_logs: 0,
          logs_this_week: 0,
          logs_this_month: 0,
          active_categories: 0,
          pending_reviews: 0,
          follow_ups_due: 0
        });
        return;
      }

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const [
        childrenCount,
        logsCount,
        weeklyLogs,
        monthlyLogs,
        categoriesCount,
        pendingReviews,
        followUps
      ] = await Promise.all([
        supabase
          .from('children')
          .select('id', { count: 'exact', head: true })
          .in('id', accessibleChildrenIds)
          .eq('is_active', true),

        supabase
          .from('daily_logs')
          .select('id', { count: 'exact', head: true })
          .in('child_id', accessibleChildrenIds)
          .eq('is_deleted', false),

        supabase
          .from('daily_logs')
          .select('id', { count: 'exact', head: true })
          .in('child_id', accessibleChildrenIds)
          .eq('is_deleted', false)
          .gte('created_at', weekAgo.toISOString()),

        supabase
          .from('daily_logs')
          .select('id', { count: 'exact', head: true })
          .in('child_id', accessibleChildrenIds)
          .eq('is_deleted', false)
          .gte('created_at', monthAgo.toISOString()),

        supabase
          .from('categories')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),

        supabase
          .from('daily_logs')
          .select('id', { count: 'exact', head: true })
          .in('child_id', accessibleChildrenIds)
          .eq('is_deleted', false)
          .is('reviewed_by', null),

        supabase
          .from('daily_logs')
          .select('id', { count: 'exact', head: true })
          .in('child_id', accessibleChildrenIds)
          .eq('is_deleted', false)
          .eq('follow_up_required', true)
          .lte('follow_up_date', new Date().toISOString().split('T')[0])
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
  }, [userId, getAccessibleChildrenIds, supabase]);

  /**
   * ✅ REFRESH FUNCTION ESTABILIZADA
   */
  const refreshLogs = useCallback(async (): Promise<void> => {
    setCurrentPage(0);
    await Promise.all([
      fetchLogs(0, false),
      fetchStats()
    ]);
  }, [fetchLogs, fetchStats]);

  // ================================================================
  // OTRAS FUNCIONES DEL HOOK (mantener igual pero con dependencies corregidas)
  // ================================================================

  const createLog = useCallback(async (logData: LogInsert): Promise<DailyLog> => {
    if (!userId) {
      throw new Error('Usuario no autenticado');
    }

    try {
      setLoading(true);
      setError(null);

      const canAccess = await userCanAccessChild(logData.child_id, userId);
      if (!canAccess) {
        throw new Error('No tienes permisos para crear registros para este niño');
      }

      const { data, error } = await supabase
        .from('daily_logs')
        .insert({
          ...logData,
          logged_by: userId
        })
        .select()
        .single();

      if (error) throw error;

      await refreshLogs();
      
      await auditSensitiveAccess(
        'CREATE_LOG',
        data.id,
        `Created log: ${data.title}`
      );

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear registro';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase, refreshLogs]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (!hasMore || loading) return;
    
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await fetchLogs(nextPage, true);
  }, [hasMore, loading, currentPage, fetchLogs]);

  const getLogById = useCallback((id: string): LogWithDetails | undefined => {
    return logs.find(log => log.id === id);
  }, [logs]);

  const filterLogs = useCallback((filters: LogFilters): LogWithDetails[] => {
    return logs.filter(log => {
      if (filters.child_id && log.child_id !== filters.child_id) return false;
      if (filters.category_id && log.category_id !== filters.category_id) return false;
      if (filters.search_term) {
        const searchLower = filters.search_term.toLowerCase();
        if (!log.title.toLowerCase().includes(searchLower) && 
            !log.content.toLowerCase().includes(searchLower)) return false;
      }
      return true;
    });
  }, [logs]);

  // ================================================================
  // EFFECTS CORREGIDOS - SIN LOOPS INFINITOS
  // ================================================================

  // ✅ EFECTO INICIAL - SOLO EJECUTAR CUANDO CAMBIE userId
  useEffect(() => {
    if (userId) {
      Promise.all([
        fetchLogs(0, false),
        fetchStats()
      ]);
    } else {
      setLogs([]);
      setStats({
        total_children: 0,
        total_logs: 0,
        logs_this_week: 0,
        logs_this_month: 0,
        active_categories: 0,
        pending_reviews: 0,
        follow_ups_due: 0
      });
      setLoading(false);
    }
  }, [userId]); // ✅ SOLO userId COMO DEPENDENCY

  // ✅ REALTIME CON DEPENDENCIES CORRECTAS
  useEffect(() => {
    if (!realtime || !userId) return;

    console.log('🔄 Setting up realtime subscription for logs');

    const channel = supabase
      .channel('logs-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_logs'
      }, (payload) => {
        console.log('🔄 Logs realtime update:', payload);
        // ✅ USAR refreshLogs DIRECTAMENTE SIN DEPENDENCIES
        refreshLogs();
      })
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up logs realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [realtime, userId]); // ✅ DEPENDENCIES MÍNIMAS Y ESTABLES

  return {
    logs,
    stats,
    loading,
    error,
    hasMore,
    createLog,
    updateLog: async () => { throw new Error('Not implemented') },
    deleteLog: async () => { throw new Error('Not implemented') },
    markAsReviewed: async () => { throw new Error('Not implemented') },
    addParentFeedback: async () => { throw new Error('Not implemented') },
    togglePrivacy: async () => { throw new Error('Not implemented') },
    loadMore,
    refreshLogs,
    filterLogs,
    exportLogs: async () => { throw new Error('Not implemented') },
    getLogById,
    canEditLog: async () => false
  };
}