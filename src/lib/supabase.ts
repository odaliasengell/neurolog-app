// src/lib/supabase.ts
// Configuración de Supabase actualizada con el nuevo modelo

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// ================================================================
// FUNCIONES HELPER PARA USAR LAS FUNCIONES DE BASE DE DATOS
// ================================================================

/**
 * Verifica si el usuario actual puede acceder a un niño específico
 */
export async function userCanAccessChild(childId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('user_can_access_child', {
      child_uuid: childId
    });
    
    if (error) {
      console.error('Error checking child access:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error in userCanAccessChild:', error);
    return false;
  }
}

/**
 * Verifica si el usuario actual puede editar un niño específico
 */
export async function userCanEditChild(childId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('user_can_edit_child', {
      child_uuid: childId
    });
    
    if (error) {
      console.error('Error checking child edit permissions:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error in userCanEditChild:', error);
    return false;
  }
}

/**
 * Verifica si el usuario actual es administrador
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error in isAdmin:', error);
    return false;
  }
}

/**
 * Registra acceso a datos sensibles para auditoría
 */
export async function auditSensitiveAccess(
  tableName: string,
  recordId: string,
  operation: string = 'SELECT'
): Promise<void> {
  try {
    await supabase.rpc('audit_sensitive_access', {
      table_name: tableName,
      record_id: recordId,
      operation
    });
  } catch (error) {
    // No fallar por errores de auditoría, solo log
    console.warn('Audit logging failed:', error);
  }
}

/**
 * Función para probar conexión a Supabase
 */
export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('count(*)')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Conexión a Supabase exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a Supabase:', error);
    return false;
  }
}

/**
 * Función para verificar la instalación de la base de datos
 */
export async function verifyDatabaseInstallation(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('verify_installation');
    
    if (error) {
      throw new Error(`Database verification failed: ${error.message}`);
    }
    
    return data || 'Database verification completed';
  } catch (error) {
    console.error('Error verifying database:', error);
    throw error;
  }
}

// ================================================================
// TIPOS PARA LAS FUNCIONES RPC
// ================================================================

export type RpcFunctions = {
  user_can_access_child: {
    Args: { child_uuid: string };
    Returns: boolean;
  };
  user_can_edit_child: {
    Args: { child_uuid: string };
    Returns: boolean;
  };
  is_admin: {
    Args: Record<string, never>;
    Returns: boolean;
  };
  audit_sensitive_access: {
    Args: {
      table_name: string;
      record_id: string;
      operation?: string;
    };
    Returns: void;
  };
  verify_installation: {
    Args: Record<string, never>;
    Returns: string;
  };
};

// ================================================================
// CONFIGURACIÓN DE REALTIME
// ================================================================

/**
 * Configuración de subscripciones realtime por tabla
 */
export const realtimeConfig = {
  profiles: {
    event: '*',
    schema: 'public',
    table: 'profiles'
  },
  children: {
    event: '*',
    schema: 'public',
    table: 'children'
  },
  daily_logs: {
    event: '*',
    schema: 'public',
    table: 'daily_logs'
  },
  user_child_relations: {
    event: '*',
    schema: 'public',
    table: 'user_child_relations'
  }
} as const;

/**
 * Helper para crear subscripciones realtime con filtros RLS automáticos
 */
export function createRealtimeSubscription<T>(
  table: keyof typeof realtimeConfig,
  callback: (payload: any) => void,
  filter?: string
) {
  const config = realtimeConfig[table];
  
  let subscription = supabase
    .channel(`public:${table}`)
    .on('postgres_changes', {
      event: config.event,
      schema: config.schema,
      table: config.table,
      filter
    }, callback);
    
  return subscription.subscribe();
}

// ================================================================
// UTILIDADES DE ERROR HANDLING
// ================================================================

export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export function handleSupabaseError(error: any): SupabaseError {
  if (error?.message) {
    return {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    };
  }
  
  return {
    message: 'An unexpected error occurred',
    details: error?.toString() || 'Unknown error'
  };
}

export function isAuthError(error: any): boolean {
  return error?.message?.includes('JWT') || 
         error?.message?.includes('auth') ||
         error?.code === 'PGRST301';
}

export function isPermissionError(error: any): boolean {
  return error?.message?.includes('permission') ||
         error?.message?.includes('RLS') ||
         error?.code === 'PGRST113';
}

// ================================================================
// CONFIGURACIÓN DE STORAGE PARA ARCHIVOS
// ================================================================

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  attachments: 'log-attachments',
  exports: 'data-exports'
} as const;

/**
 * Helper para subir archivos con validación
 */
export async function uploadFile(
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string,
  file: File,
  options?: {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
  }
) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .upload(path, file, {
      cacheControl: options?.cacheControl || '3600',
      upsert: options?.upsert || false,
      contentType: options?.contentType || file.type
    });

  if (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }

  return data;
}

/**
 * Helper para obtener URL pública de archivo
 */
export function getPublicUrl(
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string
): string {
  const { data } = supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Helper para eliminar archivo
 */
export async function deleteFile(
  bucket: keyof typeof STORAGE_BUCKETS,
  path: string
) {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS[bucket])
    .remove([path]);

  if (error) {
    throw new Error(`File deletion failed: ${error.message}`);
  }
}

// ================================================================
// CONFIGURACIÓN DE TIPOS DE BASE DE DATOS
// ================================================================

export type Tables<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Row'];

export type Inserts<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Insert'];

export type Updates<T extends keyof Database['public']['Tables']> = 
  Database['public']['Tables'][T]['Update'];

export type Views<T extends keyof Database['public']['Views']> = 
  Database['public']['Views'][T]['Row'];

// Aliases para fácil uso
export type DbProfile = Tables<'profiles'>;
export type DbChild = Tables<'children'>;
export type DbUserChildRelation = Tables<'user_child_relations'>;
export type DbCategory = Tables<'categories'>;
export type DbDailyLog = Tables<'daily_logs'>;
export type DbAuditLog = Tables<'audit_logs'>;

export type ProfileInsert = Inserts<'profiles'>;
export type ChildInsert = Inserts<'children'>;
export type RelationInsert = Inserts<'user_child_relations'>;
export type LogInsert = Inserts<'daily_logs'>;

export type ProfileUpdate = Updates<'profiles'>;
export type ChildUpdate = Updates<'children'>;
export type RelationUpdate = Updates<'user_child_relations'>;
export type LogUpdate = Updates<'daily_logs'>;

// Vistas
export type UserAccessibleChild = Views<'user_accessible_children'>;
export type ChildLogStats = Views<'child_log_statistics'>;