// src/app/dashboard/page.tsx
// Dashboard principal actualizado con el nuevo modelo de datos

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/components/providers/AuthProvider';
import { useChildren } from '@/hooks/use-children';
import { useLogs } from '@/hooks/use-logs';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Calendar, 
  Heart,
  AlertCircle,
  Clock,
  Eye,
  Plus,
  BarChart3,
  Bell
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ================================================================
// COMPONENTES AUXILIARES
// ================================================================

interface QuickStatsProps {
  stats: any;
  loading: boolean;
}

function QuickStats({ stats, loading }: QuickStatsProps) {
  const statCards = [
    {
      title: 'Niños Registrados',
      value: stats.total_children || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Total de niños en seguimiento'
    },
    {
      title: 'Registros Totales',
      value: stats.total_logs || 0,
      icon: BookOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Registros diarios documentados'
    },
    {
      title: 'Esta Semana',
      value: stats.logs_this_week || 0,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Nuevos registros en 7 días'
    },
    {
      title: 'Pendientes de Revisión',
      value: stats.pending_reviews || 0,
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Registros esperando revisión'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                stat.value.toLocaleString()
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface RecentLogsProps {
  logs: any[];
  loading: boolean;
}

function RecentLogs({ logs, loading }: RecentLogsProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border bg-white">
            <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <p className="text-lg font-medium">No hay registros recientes</p>
        <p className="text-sm">Comienza creando tu primer registro diario</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/logs/new">
            <Plus className="mr-2 h-4 w-4" />
            Crear Registro
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {logs.slice(0, 5).map((log) => (
        <div key={log.id} className="flex items-start space-x-4 p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
          <Avatar className="h-10 w-10">
            <AvatarImage 
              src={log.child_avatar_url} 
              alt={log.child_name}
            />
            <AvatarFallback className="bg-blue-100 text-blue-600">
              {log.child_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {log.title}
              </h4>
              <div className="flex items-center space-x-2">
                {log.is_private && (
                  <Eye className="h-3 w-3 text-gray-400" />
                )}
                {log.mood_score && (
                  <div className="flex items-center">
                    <Heart className="h-3 w-3 text-red-400 mr-1" />
                    <span className="text-xs text-gray-500">
                      {log.mood_score}/5
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm text-gray-600">
                {log.child_name}
              </span>
              {log.category_name && (
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ 
                    backgroundColor: `${log.category_color}20`,
                    color: log.category_color 
                  }}
                >
                  {log.category_name}
                </Badge>
              )}
              <span className="text-xs text-gray-400">
                {format(new Date(log.created_at), 'dd MMM, HH:mm', { locale: es })}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {log.content}
            </p>
            
            {log.follow_up_required && (
              <div className="flex items-center mt-2">
                <Clock className="h-3 w-3 text-orange-500 mr-1" />
                <span className="text-xs text-orange-600">
                  Seguimiento requerido
                  {log.follow_up_date && ` - ${format(new Date(log.follow_up_date), 'dd MMM', { locale: es })}`}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {logs.length > 5 && (
        <div className="text-center pt-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard/logs">
              Ver todos los registros ({logs.length - 5} más)
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

interface AccessibleChildrenProps {
  children: any[];
  loading: boolean;
}

function AccessibleChildren({ children, loading }: AccessibleChildrenProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 rounded-lg border bg-white">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <p className="text-lg font-medium">No hay niños registrados</p>
        <p className="text-sm">Agrega el primer niño para comenzar el seguimiento</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/children/new">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Niño
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {children.map((child) => (
        <Card key={child.id} className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href={`/dashboard/children/${child.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={child.avatar_url} 
                    alt={child.name}
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                    {child.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {child.name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {child.relationship_type}
                    </Badge>
                    {child.birth_date && (
                      <span className="text-xs text-gray-500">
                        {Math.floor((Date.now() - new Date(child.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años
                      </span>
                    )}
                  </div>
                  
                  {child.diagnosis && (
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {child.diagnosis}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      {child.can_edit && (
                        <span className="flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Editar
                        </span>
                      )}
                      {child.can_export && (
                        <span className="flex items-center">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Exportar
                        </span>
                      )}
                    </div>
                    
                    {child.expires_at && (
                      <span className="text-xs text-orange-600 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Expira {format(new Date(child.expires_at), 'dd MMM', { locale: es })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      ))}
    </div>
  );
}

// ================================================================
// COMPONENTE PRINCIPAL
// ================================================================

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { children, loading: childrenLoading } = useChildren({ 
    includeInactive: false,
    realtime: true 
  });
  const { 
    logs, 
    stats, 
    loading: logsLoading 
  } = useLogs({ 
    includePrivate: false,
    realtime: true,
    pageSize: 10 
  });

  const [greeting, setGreeting] = useState('');

  // Calcular saludo basado en la hora
  useEffect(() => {
    const hour = new Date().getHours();
    let greetingText = '';
    
    if (hour < 12) {
      greetingText = 'Buenos días';
    } else if (hour < 18) {
      greetingText = 'Buenas tardes';
    } else {
      greetingText = 'Buenas noches';
    }
    
    setGreeting(greetingText);
  }, []);

  const loading = childrenLoading || logsLoading;

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {greeting}, {user?.full_name}
          </h1>
          <p className="text-gray-600 mt-1">
            Aquí tienes un resumen de la actividad reciente
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {isAdmin && (
            <Button variant="outline" asChild>
              <Link href="/dashboard/admin">
                <BarChart3 className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}
          
          <Button asChild>
            <Link href="/dashboard/logs/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Registro
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats stats={stats} loading={loading} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Logs - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Registros Recientes
              </CardTitle>
              <CardDescription>
                Últimos registros diarios documentados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentLogs logs={logs} loading={logsLoading} />
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Pending Actions */}
          {(stats.pending_reviews > 0 || stats.follow_ups_due > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-orange-600">
                  <Bell className="mr-2 h-5 w-5" />
                  Acciones Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.pending_reviews > 0 && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-orange-900">
                        Revisiones Pendientes
                      </p>
                      <p className="text-xs text-orange-700">
                        {stats.pending_reviews} registros esperando revisión
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/dashboard/logs?filter=pending_review">
                        Ver
                      </Link>
                    </Button>
                  </div>
                )}
                
                {stats.follow_ups_due > 0 && (
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-yellow-900">
                        Seguimientos Vencidos
                      </p>
                      <p className="text-xs text-yellow-700">
                        {stats.follow_ups_due} seguimientos requieren atención
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/dashboard/logs?filter=follow_up_due">
                        Ver
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Stats Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Promedio semanal</span>
                <span className="font-medium">
                  {stats.logs_this_week > 0 ? Math.round(stats.logs_this_week / 7) : 0} registros/día
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Humor promedio</span>
                <div className="flex items-center">
                  <Heart className="h-4 w-4 text-red-400 mr-1" />
                  <span className="font-medium">
                    {stats.avg_mood_score ? stats.avg_mood_score.toFixed(1) : 'N/A'}/5
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Último registro</span>
                <span className="text-xs text-gray-500">
                  {stats.last_log_date ? 
                    format(new Date(stats.last_log_date), 'dd MMM', { locale: es }) : 
                    'Ninguno'
                  }
                </span>
              </div>

              <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                <Link href="/dashboard/reports">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Ver Reportes Completos
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Children Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Niños en Seguimiento
              </CardTitle>
              <CardDescription>
                Niños a los que tienes acceso para registrar actividades
              </CardDescription>
            </div>
            
            <Button variant="outline" asChild>
              <Link href="/dashboard/children">
                Ver Todos
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AccessibleChildren children={children} loading={childrenLoading} />
        </CardContent>
      </Card>
    </div>
  );
}