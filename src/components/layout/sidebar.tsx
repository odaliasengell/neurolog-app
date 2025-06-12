// src/components/layout/sidebar.tsx
// Sidebar actualizado con navegación mejorada

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
  const { stats, loading: statsLoading } = useLogs({ pageSize: 1 });

  // Calcular notificaciones
  useEffect(() => {
    if (!statsLoading) {
      const totalNotifications = (stats.pending_reviews || 0) + (stats.follow_ups_due || 0);
      setNotifications(totalNotifications);
    }
  }, [stats, statsLoading]);

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
      badge: notifications > 0 ? notifications : undefined,
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
        {/* Close button (mobile) */}
        <div className="flex items-center justify-between p-4 lg:hidden">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">NL</span>
            </div>
            <span className="text-lg font-bold text-gray-900">NeuroLog</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        {/* Logo */}
        <div className="hidden lg:flex items-center space-x-3 p-6 border-b border-gray-200">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">NL</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">NeuroLog</h1>
            <p className="text-xs text-gray-500">Seguimiento NEE</p>
          </div>
        </div>

        {/* User Info */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar_url} alt={user?.full_name} />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role === 'parent' ? 'Padre/Madre' :
                 user?.role === 'teacher' ? 'Docente' :
                 user?.role === 'specialist' ? 'Especialista' : 
                 user?.role === 'admin' ? 'Administrador' : 'Usuario'}
              </p>
            </div>
            {isAdmin && (
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => {
            const isActive = isActiveLink(item.href);
            
            // Filtrar elementos solo para admin
            if (item.adminOnly && !isAdmin) {
              return null;
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className="group"
                onClick={() => setIsOpen(false)}
              >
                <div className={cn(
                  'flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg group-hover:bg-gray-50 transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                )}>
                  <div className="flex items-center">
                    <item.icon className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                    )} />
                    <span>{item.name}</span>
                  </div>
                  
                  {item.badge && item.badge > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="h-5 w-5 text-xs p-0 flex items-center justify-center"
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="p-4 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </>
  );
}