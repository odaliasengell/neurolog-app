// src/components/layout/header.tsx
// Header del dashboard con notificaciones

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
import { useAuth } from '@/components/providers/AuthProvider';
import { useLogs } from '@/hooks/use-logs';
import { Bell, Settings, User, LogOut, Shield, ChevronDown } from 'lucide-react';
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
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard';
      case '/dashboard/children':
        return 'Gestión de Niños';
      case '/dashboard/logs':
        return 'Registros Diarios';
      case '/dashboard/reports':
        return 'Reportes y Análisis';
      case '/dashboard/calendar':
        return 'Calendario';
      case '/dashboard/export':
        return 'Exportar Datos';
      case '/dashboard/admin':
        return 'Administración';
      case '/dashboard/settings':
        return 'Configuración';
      default:
        return 'NeuroLog';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 lg:px-8">
      <div className="flex items-center justify-between">
        {/* Left side - Page title */}
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right side - notifications and user menu */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
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
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {totalNotifications === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm">No hay notificaciones</p>
                </div>
              ) : (
                <>
                  {stats.pending_reviews > 0 && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/logs?filter=pending_review">
                        <div className="flex items-center space-x-3 w-full">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Registros pendientes de revisión</p>
                            <p className="text-xs text-gray-500">{stats.pending_reviews} registros</p>
                          </div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  {stats.follow_ups_due > 0 && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/logs?filter=follow_up_due">
                        <div className="flex items-center space-x-3 w-full">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">Seguimientos vencidos</p>
                            <p className="text-xs text-gray-500">{stats.follow_ups_due} pendientes</p>
                          </div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 px-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.full_name || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {user?.role === 'parent' ? 'Padre/Madre' :
                     user?.role === 'teacher' ? 'Docente' :
                     user?.role === 'specialist' ? 'Especialista' : 
                     user?.role === 'admin' ? 'Administrador' : 'Usuario'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </Link>
              </DropdownMenuItem>
              
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Administración</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}