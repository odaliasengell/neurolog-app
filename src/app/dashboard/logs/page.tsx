// src/app/dashboard/logs/page.tsx
'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LogCard } from '@/components/logs/log-card'
import { AddLogDialog } from '@/components/logs/add-log-dialog'
import { useLogs } from '@/hooks/use-logs'
import { useChildren } from '@/hooks/use-children'
import { useCategories } from '@/hooks/use-categories'
import { Plus, Search, Filter, FileText, Calendar } from 'lucide-react'

export default function LogsPage() {
  const searchParams = useSearchParams()
  const childParam = searchParams.get('child')
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedChild, setSelectedChild] = useState(childParam || 'all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const { logs, loading: logsLoading, stats } = useLogs({
    childId: selectedChild !== 'all' ? selectedChild : undefined,
    categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
    searchTerm: searchTerm.trim() || undefined
  })

  const { children, loading: childrenLoading } = useChildren()
  const { categories } = useCategories()

  const filteredLogs = logs.filter(log =>
    searchTerm === '' || 
    log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedChildData = children.find(child => child.id === selectedChild)

  if (logsLoading && childrenLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Registros</h1>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
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
          <h1 className="text-3xl font-bold text-gray-900">Registros diarios</h1>
          <p className="text-gray-600 mt-1">
            {selectedChildData 
              ? `Registros de ${selectedChildData.name}`
              : 'Todos los registros disponibles'
            }
          </p>
        </div>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          disabled={children.filter(child => child.can_edit).length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo registro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total registros</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta semana</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeek}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio semanal</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.weeklyAverage)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último registro</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.daysSinceLastLog !== null ? `${stats.daysSinceLastLog}d` : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar en título o contenido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

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
              <label className="text-sm font-medium">Categoría</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {filteredLogs.length > 0 ? (
        <div className="space-y-4">
          {filteredLogs.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay registros
              </h3>
              <p className="text-gray-600 mb-6">
                Comienza creando el primer registro diario
              </p>
              <Button 
                onClick={() => setIsAddDialogOpen(true)}
                disabled={children.filter(child => child.can_edit).length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear primer registro
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron resultados
              </h3>
              <p className="text-gray-600">
                Intenta con otros filtros de búsqueda
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Log Dialog */}
      <AddLogDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        preselectedChildId={selectedChild !== 'all' ? selectedChild : undefined}
      />
    </div>
  )
}