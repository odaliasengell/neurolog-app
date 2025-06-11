// ================================================================
// src/components/layout/Sidebar.tsx
// Sidebar actualizado con navegación mejorada
// ================================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/components/providers/AuthProvider';
import { useLogs } from '@/hooks/use-logs';
import {
  Home,
  Users,
  BookOpen,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  Bell,
  Shield,
  FileText,
  Calendar,
  Download,
  HelpCircle
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  adminOnly?: boolean;
  description?: string;
}

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const pathname = usePathname();
  const { user, signOut, isAdmin } = useAuth();
  const { stats } = useLogs({ pageSize: 1 }); // Solo para obtener stats

  // Calcular notificaciones
  useEffect(() => {
    const totalNotifications = (stats.pending_reviews || 0) + (stats.follow_ups_due || 0);
    setNotifications(totalNotifications);
  }, [stats]);

  const navigation: NavigationItem[] = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: Home,
      description: 'Resumen general y estadísticas'
    },
    { 
      name: 'Niños', 
      href: '/dashboard/children', 
      icon: Users,
      description: 'Gestionar niños en seguimiento'
    },
    { 
      name: 'Registros', 
      href: '/dashboard/logs', 
      icon: BookOpen,
      badge: notifications,
      description: 'Registros diarios y observaciones'
    },
    { 
      name: 'Reportes', 
      href: '/dashboard/reports', 
      icon: BarChart3,
      description: 'Análisis y reportes de progreso'
    },
    { 
      name: 'Calendario', 
      href: '/dashboard/calendar', 
      icon: Calendar,
      description: 'Programar eventos y seguimientos'
    },
    { 
      name: 'Exportar', 
      href: '/dashboard/export', 
      icon: Download,
      description: 'Exportar datos y reportes'
    },
    { 
      name: 'Administración', 
      href: '/dashboard/admin', 
      icon: Shield,
      adminOnly: true,
      description: 'Panel de administración'
    },
    { 
      name: 'Configuración', 
      href: '/dashboard/settings', 
      icon: Settings,
      description: 'Configuración personal'
    },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActiveLink = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 bg-white shadow-md"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-40 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">NL</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">NeuroLog</h1>
              <p className="text-xs text-gray-500">Registro NEE</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* User Profile */}
        {user && (
          <div className="p-6 border-b bg-gray-50">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar_url} alt={user.full_name} />
                <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                  {user.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.full_name}
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {user.email}
                </p>
                <Badge variant="outline" className="text-xs mt-1">
                  {user.role === 'parent' && 'Padre/Madre'}
                  {user.role === 'teacher' && 'Docente'}
                  {user.role === 'specialist' && 'Especialista'}
                  {user.role === 'admin' && 'Administrador'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            // Ocultar elementos de admin si no es admin
            if (item.adminOnly && !isAdmin) {
              return null;
            }

            const isActive = isActiveLink(item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors hover:bg-gray-100',
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700 hover:text-gray-900'
                )}
              >
                <item.icon 
                  className={cn(
                    'mr-3 h-5 w-5 flex-shrink-0',
                    isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'
                  )} 
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>{item.name}</span>
                    {item.badge && item.badge > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {item.badge > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t bg-gray-50">
          <div className="space-y-2">
            <Button 
              asChild 
              className="w-full justify-start" 
              size="sm"
            >
              <Link href="/dashboard/logs/new">
                <BookOpen className="mr-2 h-4 w-4" />
                Nuevo Registro
              </Link>
            </Button>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                asChild
              >
                <Link href="/dashboard/help">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Ayuda
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="flex-1"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Salir
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="text-center">
            <p className="text-xs text-gray-500">
              NeuroLog v2.0
            </p>
            <p className="text-xs text-gray-400">
              © 2025 - Proyecto Académico
            </p>
          </div>
        </div>
      </div>
    </>
  );
}