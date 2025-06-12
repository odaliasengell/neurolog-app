// src/app/dashboard/page.tsx
// Dashboard principal completamente responsivo y mejorado

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/providers/AuthProvider';
import { useChildren } from '@/hooks/use-children';
import { useLogs } from '@/hooks/use-logs';
import { useCategories } from '@/hooks/use-categories';
import type { ChildWithRelation, LogWithDetails } from '@/types';
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  TrendingUp, 
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus,
  Eye,
  ArrowRight,
  Activity,
  Heart,
  Target,
  Award,
  Bell,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ================================================================
// COMPONENTES AUXILIARES
// ================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  color?: string;
  loading?: boolean;
}

function StatCard({ title, value, change, changeType, icon: Icon, href, color = 'blue', loading }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red: 'bg-red-50 text-red-700 border-red-200'
  };

  if (loading) {
    return (
      <Card className="card-responsive">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-6 w-1/3" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const content = (
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1 sm:space-y-2">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{value}</p>
            {change && (
              <span className={cn(
                "text-xs sm:text-sm font-medium",
                changeType === 'positive' && "text-green-600",
                changeType === 'negative' && "text-red-600",
                changeType === 'neutral' && "text-gray-600"
              )}>
                {change}
              </span>
            )}
          </div>
        </div>
        <div className={cn(
          "p-2 sm:p-3 rounded-lg border",
          colorClasses[color as keyof typeof colorClasses]
        )}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
        </div>
      </div>
    </CardContent>
  );

  if (href) {
    return (
      <Card className="card-responsive hover:shadow-lg transition-all cursor-pointer group">
        <Link href={href}>
          {content}
        </Link>
      </Card>
    );
  }

  return (
    <Card className="card-responsive">
      {content}
    </Card>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color?: string;
}

function QuickAction({ title, description, icon: Icon, href, color = 'blue' }: QuickActionProps) {
  const colorClasses = {
    blue: 'hover:bg-blue-50 group-hover:text-blue-700',
    green: 'hover:bg-green-50 group-hover:text-green-700',
    purple: 'hover:bg-purple-50 group-hover:text-purple-700',
    orange: 'hover:bg-orange-50 group-hover:text-orange-700'
  };

  return (
    <Link href={href} className="group">
      <Card className="card-responsive hover:shadow-lg transition-all cursor-pointer h-full">
        <CardContent className="p-4 sm:p-6 h-full flex flex-col">
          <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
            <div className={cn(
              "p-2 sm:p-3 rounded-lg transition-colors",
              colorClasses[color as keyof typeof colorClasses]
            )}>
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-base font-medium text-gray-900 group-hover:text-gray-800 transition-colors">
                {title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                {description}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

interface RecentActivityItemProps {
  log: LogWithDetails;
}

function RecentActivityItem({ log }: RecentActivityItemProps) {
  const timeFormatted = useMemo(() => {
    const date = new Date(log.created_at);
    if (isToday(date)) {
      return `Hoy ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Ayer ${format(date, 'HH:mm')}`;
    } else {
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    }
  }, [log.created_at]);

  const getMoodEmoji = (score: number) => {
    if (score >= 8) return '😊';
    if (score >= 6) return '🙂';
    if (score >= 4) return '😐';
    if (score >= 2) return '😞';
    return '😢';
  };

  return (
    <div className="flex items-start space-x-3 p-3 sm:p-4 rounded-lg hover:bg-gray-50 transition-colors">
      <Avatar className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
        <AvatarImage src={log.child?.avatar_url} />
        <AvatarFallback className="text-xs sm:text-sm">
          {log.child?.name?.charAt(0) || 'N'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
            {log.child?.name || 'Niño desconocido'}
          </p>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {timeFormatted}
          </span>
        </div>
        
        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2">
          {log.title}
        </p>
        
        <div className="flex items-center space-x-2">
          {log.category && (
            <Badge 
              variant="secondary" 
              className="text-xs"
              style={{ backgroundColor: `${log.category.color}20`, color: log.category.color }}
            >
              {log.category.name}
            </Badge>
          )}
          
          {log.mood_score && (
            <span className="text-sm">
              {getMoodEmoji(log.mood_score)}
            </span>
          )}
          
          {log.needs_review && (
            <Badge variant="destructive" className="text-xs">
              Requiere revisión
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// COMPONENTE PRINCIPAL
// ================================================================

export default function DashboardPage() {
  const { user } = useAuth();
  const { children, loading: childrenLoading } = useChildren();
  const { logs, stats, loading: logsLoading } = useLogs({ pageSize: 5 });
  const { categories, loading: categoriesLoading } = useCategories();

  const [selectedPeriod, setSelectedPeriod] = useState('week');

  // Stats calculadas
  const calculatedStats = useMemo(() => {
    const totalProgress = children.length > 0 ? 
      (stats.logs_this_month / (children.length * 30)) * 100 : 0;
    
    const activeChildren = children.filter(child => child.is_active).length;
    const pendingTasks = stats.pending_reviews + stats.follow_ups_due;
    
    return {
      totalProgress: Math.min(totalProgress, 100),
      activeChildren,
      pendingTasks
    };
  }, [children, stats]);

  // Logs recientes para la actividad
  const recentLogs = useMemo(() => {
    return logs.slice(0, 5);
  }, [logs]);

  // Determinar saludo según la hora
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }, []);

  const isLoading = childrenLoading || logsLoading || categoriesLoading;

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="space-y-2 sm:space-y-4">
        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              {greeting}, {user?.full_name?.split(' ')[0] || 'Usuario'}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Aquí tienes un resumen de la actividad reciente
            </p>
          </div>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <Button size="sm" className="w-full sm:w-auto" asChild>
              <Link href="/dashboard/logs?action=new">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Registro
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
              <Link href="/dashboard/reports">
                <BarChart3 className="h-4 w-4 mr-2" />
                Ver Reportes
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          title="Niños Activos"
          value={calculatedStats.activeChildren}
          change="+2 este mes"
          changeType="positive"
          icon={Users}
          href="/dashboard/children"
          color="blue"
          loading={isLoading}
        />
        
        <StatCard
          title="Registros Totales"
          value={stats.total_logs}
          change={`+${stats.logs_this_week} esta semana`}
          changeType="positive"
          icon={BookOpen}
          href="/dashboard/logs"
          color="green"
          loading={isLoading}
        />
        
        <StatCard
          title="Progreso Mensual"
          value={`${Math.round(calculatedStats.totalProgress)}%`}
          change="↗ Mejorando"
          changeType="positive"
          icon={TrendingUp}
          href="/dashboard/reports"
          color="purple"
          loading={isLoading}
        />
        
        <StatCard
          title="Tareas Pendientes"
          value={calculatedStats.pendingTasks}
          change={calculatedStats.pendingTasks > 0 ? "Requiere atención" : "Al día"}
          changeType={calculatedStats.pendingTasks > 0 ? "negative" : "positive"}
          icon={calculatedStats.pendingTasks > 0 ? AlertCircle : CheckCircle}
          color={calculatedStats.pendingTasks > 0 ? "red" : "green"}
          loading={isLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Acciones Rápidas</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <QuickAction
            title="Agregar Niño"
            description="Registra un nuevo niño en el sistema de seguimiento"
            icon={Users}
            href="/dashboard/children?action=new"
            color="blue"
          />
          
          <QuickAction
            title="Nuevo Registro"
            description="Crear un nuevo registro diario de observaciones"
            icon={Plus}
            href="/dashboard/logs?action=new"
            color="green"
          />
          
          <QuickAction
            title="Ver Calendario"
            description="Gestiona citas y programar seguimientos"
            icon={Calendar}
            href="/dashboard/calendar"
            color="purple"
          />
        </div>
      </div>

      {/* Recent Activity & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="card-responsive h-full">
            <CardHeader className="pb-3 sm:pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">Actividad Reciente</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/logs">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver todos
                  </Link>
                </Button>
              </div>
              <CardDescription className="text-sm">
                Últimos registros y observaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentLogs.length > 0 ? (
                <div className="space-y-2">
                  {recentLogs.map((log) => (
                    <RecentActivityItem key={log.id} log={log} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-gray-600">
                    No hay actividad reciente
                  </p>
                  <Button size="sm" className="mt-4" asChild>
                    <Link href="/dashboard/logs?action=new">
                      Crear primer registro
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Overview */}
        <div className="space-y-4 sm:space-y-6">
          
          {/* Progress Overview */}
          <Card className="card-responsive">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-base sm:text-lg">Progreso General</CardTitle>
              <CardDescription className="text-sm">
                Este mes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Registros completados</span>
                  <span className="font-medium">{stats.logs_this_month}</span>
                </div>
                <Progress value={calculatedStats.totalProgress} className="h-2" />
                <p className="text-xs text-gray-600">
                  {Math.round(calculatedStats.totalProgress)}% del objetivo mensual
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.logs_this_week}</p>
                  <p className="text-xs text-gray-600">Esta semana</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-lg sm:text-xl font-bold text-blue-700">{stats.active_categories}</p>
                  <p className="text-xs text-blue-600">Categorías activas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          {calculatedStats.pendingTasks > 0 && (
            <Card className="card-responsive">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center">
                  <Bell className="h-4 w-4 mr-2 text-orange-600" />
                  Tareas Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.pending_reviews > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-900">
                        Revisiones pendientes
                      </span>
                    </div>
                    <Badge variant="destructive" className="text-xs">
                      {stats.pending_reviews}
                    </Badge>
                  </div>
                )}
                
                {stats.follow_ups_due > 0 && (
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-900">
                        Seguimientos vencidos
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
                      {stats.follow_ups_due}
                    </Badge>
                  </div>
                )}
                
                <Button size="sm" className="w-full" asChild>
                  <Link href="/dashboard/logs?filter=pending">
                    Ver todas las tareas
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}