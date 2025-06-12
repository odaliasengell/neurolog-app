// ================================================================
// src/app/dashboard/reports/page.tsx
// Página principal de reportes y análisis - CORREGIDA
// ================================================================

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { useAuth } from '@/components/providers/AuthProvider';
import { useChildren } from '@/hooks/use-children';
import { useLogs } from '@/hooks/use-logs';
import { ProgressChart } from '@/components/reports/ProgressChart';
import { CategoryDistribution } from '@/components/reports/CategoryDistribution';
import { MoodTrendChart } from '@/components/reports/MoodTrendChart';
import { ExportReportDialog } from '@/components/reports/ExportReportDialog';
import { TimePatterns, CorrelationAnalysis, AdvancedInsights } from '@/components/reports/TimePatterns';
import type { DateRange } from 'react-day-picker';
import { 
  BarChart3,
  TrendingUp,
  Calendar,
  Download,
  FileText,
  PieChart,
  LineChart,
  Users,
  Activity,
  Heart,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// ================================================================
// FUNCIÓN HELPER PARA CALCULAR TENDENCIA DE MEJORA
// ================================================================
function calculateImprovementTrend(logs: any[]): number {
  if (logs.length < 2) return 0;
  
  const moodLogs = logs.filter(log => log.mood_score).sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  
  if (moodLogs.length < 2) return 0;
  
  const midpoint = Math.floor(moodLogs.length / 2);
  const firstHalf = moodLogs.slice(0, midpoint);
  const secondHalf = moodLogs.slice(midpoint);
  
  const firstAvg = firstHalf.reduce((sum, log) => sum + log.mood_score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, log) => sum + log.mood_score, 0) / secondHalf.length;
  
  return secondAvg - firstAvg;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const { children, loading: childrenLoading } = useChildren();
  const { logs, stats, loading: logsLoading } = useLogs();
  
  const [selectedChild, setSelectedChild] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 3),
    to: new Date()
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Filtrar logs según selecciones
  const filteredLogs = logs.filter(log => {
    if (selectedChild !== 'all' && log.child_id !== selectedChild) {
      return false;
    }
    
    if (dateRange?.from && new Date(log.created_at) < dateRange.from) {
      return false;
    }
    
    if (dateRange?.to && new Date(log.created_at) > dateRange.to) {
      return false;
    }
    
    return true;
  });

  // Métricas calculadas
  const metrics = {
    totalLogs: filteredLogs.length,
    avgMoodScore: filteredLogs
      .filter(log => log.mood_score)
      .reduce((sum, log) => sum + (log.mood_score || 0), 0) / 
      filteredLogs.filter(log => log.mood_score).length || 0,
    categoriesUsed: new Set(filteredLogs.map(log => log.category_id)).size,
    followUpsCompleted: filteredLogs.filter(log => 
      log.follow_up_required && log.follow_up_date && new Date(log.follow_up_date) <= new Date()
    ).length,
    pendingReviews: filteredLogs.filter(log => !log.reviewed_by).length,
    improvementTrend: calculateImprovementTrend(filteredLogs)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h1>
          <p className="text-gray-600">
            Análisis detallado del progreso y patrones de desarrollo
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Generar Reporte
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Niño
              </label>
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los niños</SelectItem>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Período
              </label>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Registros"
          value={metrics.totalLogs}
          icon={Activity}
          color="blue"
          subtitle="registros analizados"
        />
        <MetricCard
          title="Estado de Ánimo"
          value={`${metrics.avgMoodScore.toFixed(1)}/5`}
          icon={Heart}
          color="purple"
          subtitle="promedio general"
        />
        <MetricCard
          title="Categorías Activas"
          value={metrics.categoriesUsed}
          icon={Target}
          color="green"
          subtitle="áreas de seguimiento"
        />
        <MetricCard
          title="Tendencia"
          value={`${metrics.improvementTrend > 0 ? '+' : ''}${metrics.improvementTrend.toFixed(1)}`}
          suffix={metrics.improvementTrend > 0 ? '↗' : metrics.improvementTrend < 0 ? '↘' : '→'}
          icon={TrendingUp}
          color={metrics.improvementTrend > 0 ? 'green' : metrics.improvementTrend < 0 ? 'red' : 'gray'}
          subtitle={metrics.improvementTrend > 0 ? 'Mejorando' : metrics.improvementTrend < 0 ? 'Declinando' : 'Estable'}
        />
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="progress">Progreso</TabsTrigger>
          <TabsTrigger value="patterns">Patrones</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Tab: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Distribución por Categorías
                </CardTitle>
                <CardDescription>
                  Frecuencia de registros por tipo de actividad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryDistribution data={filteredLogs} />
              </CardContent>
            </Card>

            {/* Mood Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 mr-2" />
                  Tendencia del Estado de Ánimo
                </CardTitle>
                <CardDescription>
                  Evolución del bienestar emocional
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MoodTrendChart data={filteredLogs} />
              </CardContent>
            </Card>
          </div>

          {/* Recent Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Actividad</CardTitle>
              <CardDescription>
                Estadísticas generales del período seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{metrics.totalLogs}</p>
                  <p className="text-sm text-gray-600">Registros totales</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{metrics.followUpsCompleted}</p>
                  <p className="text-sm text-gray-600">Seguimientos completados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{metrics.pendingReviews}</p>
                  <p className="text-sm text-gray-600">Pendientes de revisión</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{metrics.categoriesUsed}</p>
                  <p className="text-sm text-gray-600">Categorías utilizadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Progress */}
        <TabsContent value="progress" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Progreso del Estado de Ánimo</CardTitle>
                <CardDescription>
                  Evolución del bienestar emocional en el tiempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProgressChart data={filteredLogs} metric="mood_score" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Frecuencia de Registros</CardTitle>
                <CardDescription>
                  Consistencia en el seguimiento diario
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProgressChart data={filteredLogs} metric="frequency" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Intensidad Promedio</CardTitle>
              <CardDescription>
                Nivel de intensidad de los eventos registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressChart data={filteredLogs} metric="intensity" timeframe="quarter" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Patterns */}
        <TabsContent value="patterns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Patrones Temporales</CardTitle>
                <CardDescription>
                  Identificación de comportamientos recurrentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimePatterns logs={filteredLogs} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Correlaciones</CardTitle>
                <CardDescription>
                  Relaciones entre diferentes variables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CorrelationAnalysis logs={filteredLogs} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Insights */}
        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Avanzado</CardTitle>
              <CardDescription>
                Insights generados por inteligencia artificial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdvancedInsights logs={filteredLogs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <ExportReportDialog 
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        data={filteredLogs}
        metrics={metrics}
      />
    </div>
  );
}

// ================================================================
// COMPONENTES AUXILIARES
// ================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'red' | 'purple' | 'green' | 'orange' | 'gray';
  subtitle: string;
  suffix?: string;
}

function MetricCard({ title, value, icon: Icon, color, subtitle, suffix }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    gray: 'bg-gray-100 text-gray-600'
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-center space-x-1">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {suffix && <span className="text-lg text-gray-500">{suffix}</span>}
            </div>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}