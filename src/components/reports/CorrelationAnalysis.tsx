// ================================================================
// src/components/reports/CorrelationAnalysis.tsx
// ================================================================

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CorrelationAnalysisProps {
  logs: any[];
}

export function CorrelationAnalysis({ logs }: CorrelationAnalysisProps) {
  // Calcular correlación entre estado de ánimo e intensidad
  const moodIntensityCorr = calculateCorrelation(
    logs.filter(l => l.mood_score && l.intensity_level),
    'mood_score',
    log => log.intensity_level === 'low' ? 1 : log.intensity_level === 'medium' ? 2 : 3
  );

  // Calcular correlación entre categorías y estado de ánimo
  const categoryMoodCorr = logs.reduce((acc, log) => {
    if (!log.mood_score || !log.category_name) return acc;
    
    if (!acc[log.category_name]) {
      acc[log.category_name] = { total: 0, count: 0 };
    }
    
    acc[log.category_name].total += log.mood_score;
    acc[log.category_name].count += 1;
    
    return acc;
  }, {} as Record<string, { total: number; count: number }>);

  const categoryAverages = Object.entries(categoryMoodCorr).map(([category, data]) => ({
    category,
    avgMood: data.total / data.count,
    count: data.count
  })).sort((a, b) => b.avgMood - a.avgMood);

  function calculateCorrelation(data: any[], field1: string, field2Func: (item: any) => number): number {
    if (data.length < 2) return 0;
    
    const x = data.map(item => item[field1]);
    const y = data.map(field2Func);
    
    const meanX = x.reduce((a, b) => a + b) / x.length;
    const meanY = y.reduce((a, b) => a + b) / y.length;
    
    const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (y[i] - meanY), 0);
    const denomX = Math.sqrt(x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0));
    const denomY = Math.sqrt(y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0));
    
    return denomX * denomY === 0 ? 0 : numerator / (denomX * denomY);
  }

  const getCorrelationIcon = (correlation: number) => {
    if (correlation > 0.3) return TrendingUp;
    if (correlation < -0.3) return TrendingDown;
    return Minus;
  };

  const getCorrelationColor = (correlation: number) => {
    if (correlation > 0.3) return 'text-green-600';
    if (correlation < -0.3) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Estado de Ánimo vs Intensidad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            {React.createElement(getCorrelationIcon(moodIntensityCorr), {
              className: `h-5 w-5 ${getCorrelationColor(moodIntensityCorr)}`
            })}
            <span className="text-lg font-semibold">
              {(moodIntensityCorr * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-gray-600">correlación</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {Math.abs(moodIntensityCorr) > 0.3 
              ? `${moodIntensityCorr > 0 ? 'Correlación positiva' : 'Correlación negativa'} moderada`
              : 'Sin correlación significativa'
            }
          </p>
        </CardContent>
      </Card>

      <div>
        <h4 className="text-sm font-medium mb-2">Estado de ánimo por categoría</h4>
        <div className="space-y-2">
          {categoryAverages.slice(0, 5).map(({ category, avgMood, count }) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{category}</span>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {count} registros
                </Badge>
                <span className="text-sm font-medium">
                  {avgMood.toFixed(1)}/5
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}