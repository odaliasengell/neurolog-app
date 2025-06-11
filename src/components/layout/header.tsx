// ================================================================
// src/components/layout/Header.tsx
// Header del dashboard con notificaciones
// ================================================================

'use client';

import { useState } from 'react';
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
import { Bell, Settings, User, LogOut, Shield } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const { user, signOut, isAdmin } = useAuth();
  const { stats } = useLogs({ pageSize: 1 });
  const [showNotifications, setShowNotifications] = useState(false);

  const totalNotifications = (stats.pending_reviews || 0) + (stats.follow_ups_due || 0);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - could add breadcrumbs here */}
        <div className="flex-1">
          {/* Breadcrumbs or page title could go here */}
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
              
              {stats.pending_reviews > 0 && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/logs?filter=pending_review" className="w-full">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Revisiones Pendientes</p>
                        <p className="text-xs text-gray-600">
                          {stats.pending_reviews} registros esperando revisión
                        </p>
                      </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              )}
              
              {stats.follow_ups_due > 0 && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/logs?filter=follow_up_due" className="w-full">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Seguimientos Vencidos</p>
                        <p className="text-xs text-gray-600">
                          {stats.follow_ups_due} seguimientos requieren atención
                        </p>
                      </div>
                    </div>
                  </Link>
                </DropdownMenuItem>
              )}
              
              {totalNotifications === 0 && (
                <div className="p-4 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No hay notificaciones nuevas</p>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url} alt={user.full_name} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                      {user.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user.full_name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {user.role === 'parent' && 'Padre/Madre'}
                      {user.role === 'teacher' && 'Docente'}
                      {user.role === 'specialist' && 'Especialista'}
                      {user.role === 'admin' && 'Administrador'}
                    </p>
                  </div>
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
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/admin">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Administración</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
