// ================================================================
// src/app/dashboard/reports/page.tsx
// Página principal de reportes y análisis
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
            Generar Informe
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros de Análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Niño
              </label>
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar niño" />
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
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Período
              </label>
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Acciones rápidas
              </label>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDateRange({
                    from: subWeeks(new Date(), 1),
                    to: new Date()
                  })}
                >
                  7 días
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDateRange({
                    from: subMonths(new Date(), 1),
                    to: new Date()
                  })}
                >
                  30 días
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDateRange({
                    from: subMonths(new Date(), 3),
                    to: new Date()
                  })}
                >
                  3 meses
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricCard
          title="Registros"
          value={metrics.totalLogs}
          icon={Activity}
          color="blue"
          subtitle="En el período"
        />
        <MetricCard
          title="Estado Ánimo"
          value={metrics.avgMoodScore.toFixed(1)}
          icon={Heart}
          color="red"
          subtitle="Promedio"
          suffix="/5"
        />
        <MetricCard
          title="Categorías"
          value={metrics.categoriesUsed}
          icon={PieChart}
          color="purple"
          subtitle="Utilizadas"
        />
        <MetricCard
          title="Seguimientos"
          value={metrics.followUpsCompleted}
          icon={CheckCircle}
          color="green"
          subtitle="Completados"
        />
        <MetricCard
          title="Sin revisar"
          value={metrics.pendingReviews}
          icon={AlertTriangle}
          color="orange"
          subtitle="Pendientes"
        />
        <MetricCard
          title="Tendencia"
          value={metrics.improvementTrend > 0 ? '↗' : metrics.improvementTrend < 0 ? '↘' : '→'}
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
              <CardTitle>Insights Recientes</CardTitle>
              <CardDescription>
                Observaciones destacadas del análisis automático
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InsightsList logs={filteredLogs} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Progress */}
        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Análisis de Progreso
              </CardTitle>
              <CardDescription>
                Evolución temporal de diferentes métricas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressChart data={filteredLogs} />
            </CardContent>
          </Card>

          {/* Progress Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Objetivos Cumplidos</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressGoals logs={filteredLogs} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recomendaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressRecommendations logs={filteredLogs} />
              </CardContent>
            </Card>
          </div>
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
    blue: 'text-blue-600 bg-blue-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    gray: 'text-gray-600 bg-gray-50'
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {value}{suffix}
            </p>
            <p className="text-xs text-gray-600">{title}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InsightsList({ logs }: { logs: any[] }) {
  const insights = generateInsights(logs);
  
  return (
    <div className="space-y-3">
      {insights.map((insight, index) => (
        <div key={index} className={`p-3 rounded-lg border-l-4 ${insight.type === 'positive' ? 'border-green-500 bg-green-50' : insight.type === 'warning' ? 'border-orange-500 bg-orange-50' : 'border-blue-500 bg-blue-50'}`}>
          <div className="flex items-start space-x-3">
            {insight.type === 'positive' && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />}
            {insight.type === 'warning' && <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />}
            {insight.type === 'info' && <Activity className="h-5 w-5 text-blue-600 mt-0.5" />}
            <div>
              <p className="text-sm font-medium text-gray-900">{insight.title}</p>
              <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
            </div>
          </div>
        </div>
      ))}
      
      {insights.length === 0 && (
        <p className="text-gray-500 text-center py-4">
          No hay suficientes datos para generar insights
        </p>
      )}
    </div>
  );
}

function ProgressGoals({ logs }: { logs: any[] }) {
  const goals = [
    { name: 'Registro diario', target: 30, current: logs.length, unit: 'registros' },
    { name: 'Estado de ánimo positivo', target: 80, current: 75, unit: '%' },
    { name: 'Seguimientos completados', target: 90, current: 85, unit: '%' },
    { name: 'Categorías cubiertas', target: 6, current: 5, unit: 'tipos' }
  ];

  return (
    <div className="space-y-4">
      {goals.map((goal, index) => (
        <div key={index} className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-900">{goal.name}</span>
            <span className="text-gray-600">{goal.current}/{goal.target} {goal.unit}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${goal.current >= goal.target ? 'bg-green-600' : 'bg-blue-600'}`}
              style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressRecommendations({ logs }: { logs: any[] }) {
  const recommendations = generateRecommendations(logs);
  
  return (
    <div className="space-y-3">
      {recommendations.map((rec, index) => (
        <div key={index} className="flex items-start space-x-3">
          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
          <p className="text-sm text-gray-700">{rec}</p>
        </div>
      ))}
    </div>
  );
}

function TimePatterns({ logs }: { logs: any[] }) {
  // Análisis de patrones temporales
  const patterns = analyzeTimePatterns(logs);
  
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Horarios más frecuentes</h4>
        <div className="space-y-2">
          {patterns.timeOfDay.map((pattern, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-sm text-gray-600">{pattern.time}</span>
              <span className="text-sm font-medium text-gray-900">{pattern.count} registros</span>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-2">Días de la semana</h4>
        <div className="space-y-2">
          {patterns.dayOfWeek.map((pattern, index) => (
            <div key={index} className="flex justify-between">
              <span className="text-sm text-gray-600">{pattern.day}</span>
              <span className="text-sm font-medium text-gray-900">{pattern.count} registros</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CorrelationAnalysis({ logs }: { logs: any[] }) {
  const correlations = analyzeCorrelations(logs);
  
  return (
    <div className="space-y-4">
      {correlations.map((correlation, index) => (
        <div key={index} className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">{correlation.title}</h4>
            <Badge variant={correlation.strength > 0.7 ? 'default' : correlation.strength > 0.4 ? 'secondary' : 'outline'}>
              {correlation.strength > 0.7 ? 'Fuerte' : correlation.strength > 0.4 ? 'Moderada' : 'Débil'}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{correlation.description}</p>
        </div>
      ))}
    </div>
  );
}

function AdvancedInsights({ logs }: { logs: any[] }) {
  return (
    <div className="text-center py-8">
      <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">Análisis Avanzado</h3>
      <p className="text-gray-600 mb-4">
        Esta funcionalidad utilizará inteligencia artificial para generar insights personalizados
        sobre patrones de comportamiento y recomendaciones de intervención.
      </p>
      <Button variant="outline">
        Activar análisis IA
      </Button>
    </div>
  );
}

// ================================================================
// FUNCIONES AUXILIARES
// ================================================================

function calculateImprovementTrend(logs: any[]) {
  // Lógica simplificada para calcular tendencia
  if (logs.length < 10) return 0;
  
  const recentLogs = logs.slice(0, Math.floor(logs.length / 2));
  const olderLogs = logs.slice(Math.floor(logs.length / 2));
  
  const recentAvgMood = recentLogs
    .filter(log => log.mood_score)
    .reduce((sum, log) => sum + log.mood_score, 0) / 
    recentLogs.filter(log => log.mood_score).length || 0;
    
  const olderAvgMood = olderLogs
    .filter(log => log.mood_score)
    .reduce((sum, log) => sum + log.mood_score, 0) / 
    olderLogs.filter(log => log.mood_score).length || 0;
    
  return recentAvgMood - olderAvgMood;
}

function generateInsights(logs: any[]) {
  const insights = [];
  
  if (logs.length === 0) return insights;
  
  // Insight sobre frecuencia
  const avgLogsPerWeek = logs.length / Math.max(1, Math.ceil(logs.length / 7));
  if (avgLogsPerWeek > 5) {
    insights.push({
      type: 'positive',
      title: 'Registro consistente',
      description: `Excelente frecuencia de registro con ${avgLogsPerWeek.toFixed(1)} entradas por semana en promedio.`
    });
  }
  
  // Insight sobre estado de ánimo
  const moodLogs = logs.filter(log => log.mood_score);
  if (moodLogs.length > 0) {
    const avgMood = moodLogs.reduce((sum, log) => sum + log.mood_score, 0) / moodLogs.length;
    if (avgMood >= 4) {
      insights.push({
        type: 'positive',
        title: 'Estado de ánimo positivo',
        description: `El estado de ánimo promedio es ${avgMood.toFixed(1)}/5, indicando bienestar general.`
      });
    } else if (avgMood < 3) {
      insights.push({
        type: 'warning',
        title: 'Atención al estado de ánimo',
        description: `El estado de ánimo promedio es ${avgMood.toFixed(1)}/5, considera revisar estrategias de apoyo.`
      });
    }
  }
  
  // Insight sobre seguimientos
  const followUps = logs.filter(log => log.follow_up_required);
  if (followUps.length > logs.length * 0.3) {
    insights.push({
      type: 'info',
      title: 'Muchos seguimientos requeridos',
      description: `${followUps.length} registros requieren seguimiento, considera programar revisiones regulares.`
    });
  }
  
  return insights;
}

function generateRecommendations(logs: any[]) {
  const recommendations = [];
  
  if (logs.length < 7) {
    recommendations.push('Incrementar la frecuencia de registro para obtener mejores insights');
  }
  
  const categoriesUsed = new Set(logs.map(log => log.category_id)).size;
  if (categoriesUsed < 4) {
    recommendations.push('Explorar diferentes categorías de registro para una visión más completa');
  }
  
  const pendingReviews = logs.filter(log => !log.reviewed_by).length;
  if (pendingReviews > 5) {
    recommendations.push('Programar revisiones con especialistas para los registros pendientes');
  }
  
  const privateLogs = logs.filter(log => log.is_private).length;
  if (privateLogs > logs.length * 0.5) {
    recommendations.push('Considerar compartir más registros con el equipo para mejor colaboración');
  }
  
  recommendations.push('Continuar con el registro regular para mantener el seguimiento del progreso');
  
  return recommendations;
}

function analyzeTimePatterns(logs: any[]) {
  const timeOfDay = {};
  const dayOfWeek = {};
  
  logs.forEach(log => {
    const date = new Date(log.created_at);
    const hour = date.getHours();
    const day = date.toLocaleDateString('es', { weekday: 'long' });
    
    const timeSlot = hour < 6 ? 'Madrugada' :
                   hour < 12 ? 'Mañana' :
                   hour < 18 ? 'Tarde' : 'Noche';
    
    timeOfDay[timeSlot] = (timeOfDay[timeSlot] || 0) + 1;
    dayOfWeek[day] = (dayOfWeek[day] || 0) + 1;
  });
  
  return {
    timeOfDay: Object.entries(timeOfDay)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => b.count - a.count),
    dayOfWeek: Object.entries(dayOfWeek)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => b.count - a.count)
  };
}

function analyzeCorrelations(logs: any[]) {
  const correlations = [];
  
  // Correlación entre estado de ánimo y categoría
  const moodByCategory = {};
  logs.forEach(log => {
    if (log.mood_score && log.category_name) {
      if (!moodByCategory[log.category_name]) {
        moodByCategory[log.category_name] = [];
      }
      moodByCategory[log.category_name].push(log.mood_score);
    }
  });
  
  Object.entries(moodByCategory).forEach(([category, moods]) => {
    if (moods.length > 3) {
      const avgMood = moods.reduce((sum, mood) => sum + mood, 0) / moods.length;
      correlations.push({
        title: `Estado de ánimo en ${category}`,
        description: `Promedio de ${avgMood.toFixed(1)}/5 en registros de esta categoría`,
        strength: Math.abs(avgMood - 3) / 2 // Normalizado
      });
    }
  });
  
  return correlations;
}