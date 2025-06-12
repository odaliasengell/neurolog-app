// ================================================================
// src/components/reports/TimePatterns.tsx
// ================================================================

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar } from 'lucide-react';

interface TimePatternsProps {
  logs: any[];
}

export function TimePatterns({ logs }: TimePatternsProps) {
  // Analizar patrones por hora del día
  const hourlyPattern = logs.reduce((acc, log) => {
    const hour = new Date(log.created_at).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Analizar patrones por día de la semana
  const weeklyPattern = logs.reduce((acc, log) => {
    const day = new Date(log.created_at).getDay();
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const getMostActiveHour = () => {
    const max = Math.max(...Object.values(hourlyPattern));
    const hour = Object.keys(hourlyPattern).find(h => hourlyPattern[parseInt(h)] === max);
    return hour ? `${hour}:00` : 'N/A';
  };

  const getMostActiveDay = () => {
    const max = Math.max(...Object.values(weeklyPattern));
    const day = Object.keys(weeklyPattern).find(d => weeklyPattern[parseInt(d)] === max);
    return day ? dayNames[parseInt(day)] : 'N/A';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Hora más activa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{getMostActiveHour()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Día más activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{getMostActiveDay()}</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Distribución por días de la semana</h4>
        <div className="flex space-x-1">
          {dayNames.map((day, index) => {
            const count = weeklyPattern[index] || 0;
            const maxCount = Math.max(...Object.values(weeklyPattern));
            const intensity = maxCount > 0 ? (count / maxCount) * 100 : 0;
            
            return (
              <div key={day} className="flex-1 text-center">
                <div 
                  className="w-full h-8 bg-blue-100 rounded mb-1 flex items-end justify-center"
                  style={{ backgroundColor: `rgba(59, 130, 246, ${intensity / 100})` }}
                >
                  <span className="text-xs text-white font-medium">
                    {count > 0 ? count : ''}
                  </span>
                </div>
                <span className="text-xs text-gray-600">{day}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

