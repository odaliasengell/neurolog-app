// ================================================================
// src/components/reports/AdvancedInsights.tsx
// ================================================================

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, AlertTriangle, CheckCircle } from 'lucide-react';

interface AdvancedInsightsProps {
  logs: any[];
}

export function AdvancedInsights({ logs }: AdvancedInsightsProps) {
  const generateInsights = () => {
    const insights = [];
    
    // Análisis de frecuencia
    if (logs.length > 0) {
      const daysWithLogs = new Set(logs.map(log => 
        new Date(log.created_at).toDateString()
      )).size;
      
      const totalDays = 30; // últimos 30 días
      const frequency = (daysWithLogs / totalDays) * 100;
      
      insights.push({
        type: frequency > 80 ? 'success' : frequency > 50 ? 'warning' : 'info',
        icon: frequency > 80 ? CheckCircle : frequency > 50 ? Target : AlertTriangle,
        title: 'Consistencia en el registro',
        description: `Registros en ${daysWithLogs} de ${totalDays} días (${frequency.toFixed(0)}%)`,
        recommendation: frequency < 50 
          ? 'Intenta mantener registros más regulares para obtener mejores insights'
          : frequency < 80
          ? 'Buen ritmo de registro, mantén la consistencia'
          : 'Excelente consistencia en los registros'
      });
    }

    // Análisis de estado de ánimo
    const moodLogs = logs.filter(log => log.mood_score);
    if (moodLogs.length > 5) {
      const avgMood = moodLogs.reduce((sum, log) => sum + log.mood_score, 0) / moodLogs.length;
      const recent = moodLogs.slice(0, 7);
      const recentAvg = recent.reduce((sum, log) => sum + log.mood_score, 0) / recent.length;
      
      const trend = recentAvg - avgMood;
      
      insights.push({
        type: trend > 0.5 ? 'success' : trend < -0.5 ? 'warning' : 'info',
        icon: Brain,
        title: 'Tendencia del estado de ánimo',
        description: `Promedio general: ${avgMood.toFixed(1)}/5, últimos 7 días: ${recentAvg.toFixed(1)}/5`,
        recommendation: trend > 0.5 
          ? 'Tendencia positiva en el estado de ánimo reciente'
          : trend < -0.5
          ? 'Considera revisar factores que puedan estar afectando el bienestar'
          : 'Estado de ánimo estable'
      });
    }

    // Análisis de categorías
    const categoryCount = logs.reduce((acc, log) => {
      acc[log.category_name] = (acc[log.category_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedCategory = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0];

    if (mostUsedCategory) {
      insights.push({
        type: 'info',
        icon: Target,
        title: 'Área de mayor atención',
        description: `"${mostUsedCategory[0]}" representa ${((mostUsedCategory[1] / logs.length) * 100).toFixed(0)}% de los registros`,
        recommendation: 'Esta categoría requiere mayor atención y seguimiento'
      });
    }

    return insights;
  };

  const insights = generateInsights();

  if (insights.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Brain className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <p className="text-lg font-medium">Generando insights...</p>
        <p className="text-sm">Necesitas más datos para análisis avanzado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {insights.map((insight, index) => (
        <Card key={index} className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${
                insight.type === 'success' ? 'bg-green-100' :
                insight.type === 'warning' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
                <insight.icon className={`h-5 w-5 ${
                  insight.type === 'success' ? 'text-green-600' :
                  insight.type === 'warning' ? 'text-yellow-600' :
                  'text-blue-600'
                }`} />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{insight.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                <p className="text-sm text-gray-500 mt-2 italic">{insight.recommendation}</p>
              </div>
              <Badge variant={
                insight.type === 'success' ? 'default' :
                insight.type === 'warning' ? 'destructive' :
                'secondary'
              }>
                {insight.type === 'success' ? 'Positivo' :
                 insight.type === 'warning' ? 'Atención' :
                 'Info'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}