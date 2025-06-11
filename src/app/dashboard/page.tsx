// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/auth-provider'
import { Users, BookOpen, TrendingUp, Calendar } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface DashboardStats {
  totalChildren: number
  totalLogs: number
  logsThisWeek: number
  lastLogDate: string | null
}

interface RecentLog {
  id: string
  title: string
  created_at: string
  child_name: string
  category_name: string
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalChildren: 0,
    totalLogs: 0,
    logsThisWeek: 0,
    lastLogDate: null
  })
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile) return

      try {
        // Obtener niños del usuario
        const { data: children } = await supabase
          .from('user_child_relations')
          .select(`
            child_id,
            children!inner (
              id,
              name
            )
          `)
          .eq('user_id', profile.id)

        const childrenIds = children?.map(rel => rel.child_id) || []

        // Obtener estadísticas de logs
        const { data: logs } = await supabase
          .from('daily_logs')
          .select('id, created_at')
          .in('child_id', childrenIds)

        // Calcular estadísticas
        const today = new Date()
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        
        const logsThisWeek = logs?.filter(log => 
          new Date(log.created_at) >= oneWeekAgo
        ).length || 0

        const lastLog = logs?.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]

        setStats({
          totalChildren: children?.length || 0,
          totalLogs: logs?.length || 0,
          logsThisWeek,
          lastLogDate: lastLog?.created_at || null
        })

        // Obtener logs recientes
        const { data: recentLogsData } = await supabase
          .from('daily_logs')
          .select(`
            id,
            title,
            created_at,
            children!inner (name),
            categories (name)
          `)
          .in('child_id', childrenIds)
          .order('created_at', { ascending: false })
          .limit(5)

        setRecentLogs(recentLogsData?.map(log => ({
          id: log.id,
          title: log.title,
          created_at: log.created_at,
          child_name: log.children.name,
          category_name: log.categories?.name || 'Sin categoría'
        })) || [])

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [profile, supabase])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
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
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          ¡Bienvenido, {profile?.full_name?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 mt-2">
          Aquí tienes un resumen de la actividad reciente
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Niños registrados
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChildren}</div>
            <p className="text-xs text-muted-foreground">
              Total de niños bajo su cuidado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de registros
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLogs}</div>
            <p className="text-xs text-muted-foreground">
              Registros históricos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Esta semana
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.logsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              Nuevos registros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Último registro
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastLogDate ? (
                format(new Date(stats.lastLogDate), 'dd/MM', { locale: es })
              ) : (
                'N/A'
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Fecha del último registro
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Acciones rápidas</CardTitle>
            <CardDescription>
              Tareas comunes que puedes realizar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/dashboard/logs/new">
                Nuevo registro
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard/children">
                Ver niños
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/dashboard/reports">
                Ver reportes
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Registros recientes</CardTitle>
            <CardDescription>
              Últimos registros realizados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentLogs.length > 0 ? (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{log.title}</p>
                      <p className="text-xs text-gray-500">
                        {log.child_name} • {log.category_name}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">
                      {format(new Date(log.created_at), 'dd/MM HH:mm', { locale: es })}
                    </p>
                  </div>
                ))}
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/dashboard/logs">
                    Ver todos los registros
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Aún no hay registros</p>
                <Button asChild>
                  <Link href="/dashboard/logs/new">
                    Crear primer registro
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
