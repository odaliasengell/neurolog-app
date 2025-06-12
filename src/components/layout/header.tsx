// src/components/layout/header.tsx
// Header del dashboard completamente responsivo

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLogs } from '@/hooks/use-logs';
import { 
  Bell, 
  Settings, 
  User, 
  LogOut, 
  Shield, 
  ChevronDown,
  Search,
  Plus,
  MoreHorizontal
} from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const { user, signOut, isAdmin } = useAuth();
  const { stats } = useLogs({ pageSize: 1 });
  const [showNotifications, setShowNotifications] = useState(false);
  const pathname = usePathname();

  const totalNotifications = (stats.pending_reviews || 0) + (stats.follow_ups_due || 0);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/dashboard/children': 'Gestión de Niños',
      '/dashboard/logs': 'Registros Diarios',
      '/dashboard/reports': 'Reportes y Análisis',
      '/dashboard/calendar': 'Calendario',
      '/dashboard/export': 'Exportar Datos',
      '/dashboard/admin': 'Administración',
      '/dashboard/settings': 'Configuración',
    };
    
    return titles[pathname] || 'NeuroLog';
  };

  const getPageDescription = () => {
    const descriptions: Record<string, string> = {
      '/dashboard': 'Resumen general de actividades y estadísticas',
      '/dashboard/children': 'Administra los perfiles de niños en seguimiento',
      '/dashboard/logs': 'Registra y revisa observaciones diarias',
      '/dashboard/reports': 'Analiza patrones y genera reportes',
      '/dashboard/calendar': 'Programa citas y seguimientos',
      '/dashboard/export': 'Descarga datos en diferentes formatos',
      '/dashboard/admin': 'Panel de administración del sistema',
      '/dashboard/settings': 'Personaliza tu experiencia',
    };
    
    return descriptions[pathname];
  };

  const getQuickActions = () => {
    const actions: Record<string, { label: string; href: string; icon: React.ReactNode }[]> = {
      '/dashboard': [
        { label: 'Nuevo registro', href: '/dashboard/logs/new', icon: <Plus className="h-4 w-4" /> },
        { label: 'Añadir niño', href: '/dashboard/children/new', icon: <User className="h-4 w-4" /> },
      ],
      '/dashboard/children': [
        { label: 'Añadir niño', href: '/dashboard/children/new', icon: <Plus className="h-4 w-4" /> },
      ],
      '/dashboard/logs': [
        { label: 'Nuevo registro', href: '/dashboard/logs/new', icon: <Plus className="h-4 w-4" /> },
      ],
    };
    
    return actions[pathname] || [];
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Left side - Page info */}
          <div className="flex-1 min-w-0 ml-16 lg:ml-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 truncate">
                  {getPageTitle()}
                </h1>
                {getPageDescription() && (
                  <p className="hidden sm:block mt-1 text-sm text-gray-500 truncate">
                    {getPageDescription()}
                  </p>
                )}
              </div>
              
              {/* Quick Actions (Desktop) */}
              <div className="hidden lg:flex items-center space-x-2 mt-2 sm:mt-0">
                {getQuickActions().map((action, index) => (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          asChild
                          className="text-xs"
                        >
                          <Link href={action.href}>
                            {action.icon}
                            <span className="ml-1 hidden xl:inline">{action.label}</span>
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{action.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Actions and user menu */}
          <div className="flex items-center space-x-2 lg:space-x-4 ml-4">
            {/* Search Button (Mobile) */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden"
              aria-label="Buscar"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Quick Actions Menu (Mobile) */}
            {getQuickActions().length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="lg:hidden"
                    aria-label="Acciones rápidas"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Acciones rápidas</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {getQuickActions().map((action, index) => (
                    <DropdownMenuItem key={index} asChild>
                      <Link href={action.href} className="flex items-center">
                        {action.icon}
                        <span className="ml-2">{action.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Notifications */}
            <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="relative"
                  aria-label={`Notificaciones ${totalNotifications > 0 ? `(${totalNotifications})` : ''}`}
                >
                  <Bell className="h-5 w-5" />
                  {totalNotifications > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                    >
                      {totalNotifications > 9 ? '9+' : totalNotifications}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 sm:w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notificaciones</span>
                  {totalNotifications > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {totalNotifications}
                    </Badge>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {totalNotifications === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">No hay notificaciones</p>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {stats.pending_reviews > 0 && (
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/logs?filter=pending_review" className="flex flex-col items-start p-3">
                          <div className="flex items-center w-full">
                            <div className="w-2 h-2 bg-orange-500 rounded-full mr-2" />
                            <span className="font-medium">Registros pendientes</span>
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {stats.pending_reviews}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Tienes registros esperando revisión
                          </p>
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    {stats.follow_ups_due > 0 && (
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard/logs?filter=follow_up_due" className="flex flex-col items-start p-3">
                          <div className="flex items-center w-full">
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                            <span className="font-medium">Seguimientos vencidos</span>
                            <Badge variant="destructive" className="ml-auto text-xs">
                              {stats.follow_ups_due}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Hay seguimientos que requieren atención
                          </p>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-8 w-8 rounded-full lg:h-10 lg:w-auto lg:rounded-lg lg:px-3"
                >
                  <Avatar className="h-8 w-8 lg:h-8 lg:w-8">
                    <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700 font-semibold">
                      {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:block lg:ml-2 lg:text-left">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                      {user?.full_name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user?.role === 'parent' ? 'Padre/Madre' :
                       user?.role === 'teacher' ? 'Docente' :
                       user?.role === 'specialist' ? 'Especialista' : 
                       user?.role === 'admin' ? 'Admin' : 'Usuario'}
                    </p>
                  </div>
                  <ChevronDown className="hidden lg:block lg:ml-2 h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="lg:hidden">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user?.full_name || 'Usuario'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="lg:hidden" />
                
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Mi perfil</span>
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </Link>
                </DropdownMenuItem>

                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/admin" className="flex items-center">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Administración</span>
                    </Link>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}