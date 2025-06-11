// src/app/dashboard/reports/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useChildren } from '@/hooks/use-children'
import { useLogs } from '@/hooks/use-logs'
import { useCategories } from '@/hooks/use-categories'
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  PieChart,
  FileText,
  Filter
} from 'lucide-react'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

interface ReportStats {
  totalLogs: number
  thisWeek: number
  lastWeek: number
  averagePerDay: number
  mostActiveCategory: string
  moodAverage: number
}

export default function ReportsPage() {
  const [selectedChild, setSelectedChild] = useState('all')
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [reportStats, setReportStats] = useState<ReportStats>({
    totalLogs: 0,
    thisWeek: 0,
    lastWeek: 0,
    averagePerDay: 0,
    mostActiveCategory: 'N/A',
    moodAverage: 0
  })

  const { children, loading: childrenLoading } = useChildren()
  const { logs, loading: logsLoading } = useLogs({
    childId: selectedChild !== 'all' ? selectedChild : undefined
  })
  const { categories } = useCategories()

  useEffect(() => {
    if (logs.length > 0) {
      calculateStats()
    }
  }, [logs])

  const calculateStats = () => {
    const now = new Date()
    const weekStart = startOfWeek(now, { locale: es })
    const weekEnd = endOfWeek(now, { locale: es })
    const lastWeekStart = subDays(weekStart, 7)
    const lastWeekEnd = subDays(weekEnd, 7)

    const thisWeekLogs = logs.filter(log => {
      const logDate = new Date(log.log_date)
      return logDate >= weekStart && logDate <= weekEnd
    })

    const lastWeekLogs = logs.filter(log => {
      const logDate = new Date(log.log_date)
      return logDate >= lastWeekStart && logDate <= lastWeekEnd
    })

    // Categoría más activa
    const categoryCount: { [key: string]: number } = {}
    logs.forEach(log => {
      const category = log.category_name || 'Sin categoría'
      categoryCount[category] = (categoryCount[category] || 0) + 1
    })
    
    const mostActiveCategory = Object.keys(categoryCount).reduce((a, b) => 
      categoryCount[a] > categoryCount[b] ? a : b, 'N/A'
    )

    // Promedio de estado de ánimo
    const moodLogs = logs.filter(log => log.mood_score !== null)
    const moodAverage = moodLogs.length > 0 
      ? moodLogs.reduce((sum, log) => sum + (log.mood_score || 0), 0) / moodLogs.length
      : 0

    setReportStats({
      totalLogs: logs.length,
      thisWeek: thisWeekLogs.length,
      lastWeek: lastWeekLogs.length,
      averagePerDay: logs.length > 0 ? Math.round((logs.length / 30) * 10) / 10 : 0,
      mostActiveCategory,
      moodAverage: Math.round(moodAverage * 10) / 10
    })
  }

  const handleExportReport = () => {
    const reportData = {
      periodo: selectedPeriod,
      nino: selectedChild === 'all' ? 'Todos' : children.find(c => c.id === selectedChild)?.name,
      fecha_generacion: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es }),
      estadisticas: reportStats,
      registros: logs.slice(0, 50) // Últimos 50 registros
    }

    const dataStr = JSON.stringify(reportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reporte_neurolog_${format(new Date(), 'yyyyMMdd_HHmm')}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (childrenLoading || logsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Reportes</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes y Análisis</h1>
          <p className="text-gray-600 mt-1">
            Estadísticas y tendencias de los registros diarios
          </p>
        </div>
        <Button onClick={handleExportReport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Reporte
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros de Reporte
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Niño</label>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mes</SelectItem>
                  <SelectItem value="quarter">Último trimestre</SelectItem>
                  <SelectItem value="all">Todo el tiempo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats.totalLogs}</div>
            <p className="text-xs text-muted-foreground">
              +{reportStats.thisWeek} esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Diario</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats.averagePerDay}</div>
            <p className="text-xs text-muted-foreground">
              registros por día
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categoría Principal</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{reportStats.mostActiveCategory}</div>
            <p className="text-xs text-muted-foreground">
              más registrada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado Promedio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportStats.moodAverage > 0 ? `${reportStats.moodAverage}/5` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              estado de ánimo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Análisis Semanal */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Comparativa Semanal</CardTitle>
            <CardDescription>
              Comparación con la semana anterior
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Esta semana</span>
                <span className="text-2xl font-bold text-blue-600">
                  {reportStats.thisWeek}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Semana anterior</span>
                <span className="text-2xl font-bold text-gray-600">
                  {reportStats.lastWeek}
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Diferencia</span>
                  <span className={`text-sm font-bold ${
                    reportStats.thisWeek >= reportStats.lastWeek 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {reportStats.thisWeek >= reportStats.lastWeek ? '+' : ''}
                    {reportStats.thisWeek - reportStats.lastWeek}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categorías</CardTitle>
            <CardDescription>
              Top 5 categorías más utilizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categories.slice(0, 5).map((category, index) => {
                const categoryLogs = logs.filter(log => log.category_name === category.name)
                const percentage = logs.length > 0 
                  ? Math.round((categoryLogs.length / logs.length) * 100)
                  : 0
                
                return (
                  <div key={category.id} className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {category.name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {categoryLogs.length} ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="h-2 rounded-full"
                          style={{ 
                            backgroundColor: category.color,
                            width: `${percentage}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registros Recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Últimos Registros</CardTitle>
          <CardDescription>
            Los 10 registros más recientes incluidos en el reporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{log.title}</p>
                    <p className="text-xs text-gray-500">
                      {log.child_name} • {log.category_name || 'Sin categoría'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {format(new Date(log.log_date), 'dd MMM', { locale: es })}
                    </p>
                    {log.mood_score && (
                      <p className="text-xs text-yellow-600">
                        ★ {log.mood_score}/5
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay registros para mostrar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}