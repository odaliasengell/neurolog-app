// src/app/dashboard/children/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/components/providers/auth-provider'
import { useToast } from '@/components/ui/use-toast'
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  Trash2,
  Clock,
  TrendingUp,
  BarChart3
} from 'lucide-react'
import { format, differenceInYears } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface Child {
  id: string
  name: string
  birth_date: string | null
  diagnosis: string | null
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

interface ChildRelation {
  relationship_type: string
  can_edit: boolean
  can_view: boolean
}

interface RecentLog {
  id: string
  title: string
  content: string
  category_name: string | null
  category_color: string
  mood_score: number | null
  log_date: string
  created_at: string
}

interface ChildStats {
  totalLogs: number
  logsThisWeek: number
  averageMood: number
  lastLogDate: string | null
}

export default function ChildDetailPage() {
  const params = useParams()
  const router = useRouter()
  const childId = params.id as string
  
  const [child, setChild] = useState<Child | null>(null)
  const [relation, setRelation] = useState<ChildRelation | null>(null)
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([])
  const [stats, setStats] = useState<ChildStats>({
    totalLogs: 0,
    logsThisWeek: 0,
    averageMood: 0,
    lastLogDate: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { profile } = useAuth()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (childId && profile) {
      fetchChildData()
    }
  }, [childId, profile])

  const fetchChildData = async () => {
    try {
      setLoading(true)

      // Verificar relación del usuario con el niño
      const { data: relationData, error: relationError } = await supabase
        .from('user_child_relations')
        .select('*')
        .eq('user_id', profile!.id)
        .eq('child_id', childId)
        .single()

      if (relationError) {
        setError('No tienes permisos para ver este niño')
        return
      }

      setRelation(relationData)

      // Obtener datos del niño
      const { data: childData, error: childError } = await supabase
        .from('children')
        .select('*')
        .eq('id', childId)
        .single()

      if (childError) throw childError
      setChild(childData)

      // Obtener registros recientes
      const { data: logsData, error: logsError } = await supabase
        .from('daily_logs')
        .select(`
          id,
          title,
          content,
          mood_score,
          log_date,
          created_at,
          categories!daily_logs_category_id_fkey (name, color)
        `)
        .eq('child_id', childId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (logsError) throw logsError

      const formattedLogs: RecentLog[] = logsData?.map(log => {
        // FIX: Manejar categories como array o null
        const category = Array.isArray(log.categories) ? log.categories[0] : log.categories
        return {
          id: log.id,
          title: log.title,
          content: log.content,
          category_name: category?.name || null,
          category_color: category?.color || '#6B7280',
          mood_score: log.mood_score,
          log_date: log.log_date,
          created_at: log.created_at
        }
      }) || []

      setRecentLogs(formattedLogs)

      // Calcular estadísticas
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      
      const logsThisWeek = formattedLogs.filter(log => 
        new Date(log.created_at) >= oneWeekAgo
      ).length

      const moodLogs = formattedLogs.filter(log => log.mood_score !== null)
      const averageMood = moodLogs.length > 0 
        ? moodLogs.reduce((sum, log) => sum + (log.mood_score || 0), 0) / moodLogs.length
        : 0

      setStats({
        totalLogs: formattedLogs.length,
        logsThisWeek,
        averageMood: Math.round(averageMood * 10) / 10,
        lastLogDate: formattedLogs[0]?.created_at || null
      })

    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching child data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!child || !relation?.can_edit) return

    const confirmed = window.confirm(
      `¿Estás seguro de que quieres eliminar a ${child.name}? Esta acción no se puede deshacer.`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId)

      if (error) throw error

      toast({
        title: "Niño eliminado",
        description: `${child.name} ha sido eliminado correctamente.`,
      })

      router.push('/dashboard/children')
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el niño",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Error</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!child || !relation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Niño no encontrado</h1>
        </div>
      </div>
    )
  }

  const age = child.birth_date 
    ? differenceInYears(new Date(), new Date(child.birth_date))
    : null

  const relationshipLabels = {
    parent: 'Padre/Madre',
    teacher: 'Docente',
    specialist: 'Especialista',
    observer: 'Observador'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="text-lg">
                {child.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{child.name}</h1>
              <div className="flex items-center gap-2 text-gray-500">
                {age !== null && (
                  <>
                    <Calendar className="h-4 w-4" />
                    <span>{age} años</span>
                  </>
                )}
                <Badge variant="secondary">
                  {relationshipLabels[relation.relationship_type as keyof typeof relationshipLabels]}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/logs?child=${child.id}`}>
              <FileText className="h-4 w-4 mr-2" />
              Ver todos los registros
            </Link>
          </Button>
          
          {relation.can_edit && (
            <>
              <Button asChild variant="outline">
                <Link href={`/dashboard/logs/new?child=${child.id}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Nuevo registro
                </Link>
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de registros</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLogs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta semana</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.logsThisWeek}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado promedio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageMood > 0 ? `${stats.averageMood}/5` : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último registro</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastLogDate 
                ? format(new Date(stats.lastLogDate), 'dd/MM', { locale: es })
                : 'N/A'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información del niño */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Nombre completo</label>
              <p className="text-gray-900">{child.name}</p>
            </div>
            
            {child.birth_date && (
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha de nacimiento</label>
                <p className="text-gray-900">
                  {format(new Date(child.birth_date), 'dd/MM/yyyy', { locale: es })}
                  {age !== null && ` (${age} años)`}
                </p>
              </div>
            )}

            {child.diagnosis && (
              <div>
                <label className="text-sm font-medium text-gray-700">Diagnóstico</label>
                <p className="text-gray-900">{child.diagnosis}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">Registrado el</label>
              <p className="text-gray-900">
                {format(new Date(child.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
              </p>
            </div>
          </CardContent>
        </Card>

        {child.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notas Adicionales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-900 whitespace-pre-wrap">{child.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Registros recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Registros Recientes</CardTitle>
          <CardDescription>
            Los últimos 10 registros de {child.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {log.category_color && (
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: log.category_color }}
                        />
                      )}
                      <h4 className="font-medium text-sm">{log.title}</h4>
                      {log.category_name && (
                        <Badge variant="secondary" className="text-xs">
                          {log.category_name}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{log.content}</p>
                  </div>
                  <div className="text-right ml-4">
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
              
              <div className="pt-4 text-center">
                <Button asChild variant="outline">
                  <Link href={`/dashboard/logs?child=${child.id}`}>
                    Ver todos los registros
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay registros aún
              </h3>
              <p className="text-gray-600 mb-6">
                Comienza creando el primer registro para {child.name}
              </p>
              {relation.can_edit && (
                <Button asChild>
                  <Link href={`/dashboard/logs/new?child=${child.id}`}>
                    <FileText className="h-4 w-4 mr-2" />
                    Crear primer registro
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}