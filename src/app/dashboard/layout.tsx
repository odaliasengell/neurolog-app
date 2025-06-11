// ================================================================
// src/app/dashboard/layout.tsx
// Layout principal del dashboard con sidebar mejorado
// ================================================================

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { Toaster } from '@/components/ui/toaster';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50/30">
          <div className="flex h-screen">
            {/* Sidebar */}
            <Sidebar />
            
            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden lg:ml-72">
              {/* Header */}
              <Header />
              
              {/* Page Content */}
              <main className="flex-1 overflow-auto">
                <div className="container mx-auto px-4 py-6 max-w-7xl">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </div>
        
        {/* Toast notifications */}
        <Toaster />
      </ToastProvider>
    </AuthProvider>
  );
}

// ================================================================
// src/components/layout/Sidebar.tsx
// Sidebar mejorado con navegación completa
// ================================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
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
  HelpCircle,
  ChevronRight,
  Zap
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  adminOnly?: boolean;
  description?: string;
  isNew?: boolean;
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
      description: 'Análisis y reportes de progreso',
      isNew: true
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
  ];

  const secondaryNavigation: NavigationItem[] = [
    { 
      name: 'Configuración', 
      href: '/dashboard/settings', 
      icon: Settings,
      description: 'Configuración personal'
    },
    { 
      name: 'Ayuda', 
      href: '/dashboard/help', 
      icon: HelpCircle,
      description: 'Centro de ayuda y documentación'
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

  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || (item.adminOnly && isAdmin)
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 bg-white shadow-md hover:shadow-lg"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col shadow-xl lg:shadow-none',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">NeuroLog</h1>
              <p className="text-xs text-gray-500">Registro NEE</p>
            </div>
          </div>
          
          {/* Close button (mobile only) */}
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
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar_url} alt={user?.full_name || ''} />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.role === 'parent' && 'Padre/Madre'}
                {user?.role === 'teacher' && 'Docente'}
                {user?.role === 'specialist' && 'Especialista'}
                {user?.role === 'admin' && 'Administrador'}
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
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Primary Navigation */}
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = isActiveLink(item.href);
              return (
                <Link key={item.name} href={item.href}>
                  <div 
                    className={cn(
                      'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                    )} />
                    <span className="flex-1">{item.name}</span>
                    
                    {/* Badges and indicators */}
                    <div className="flex items-center space-x-1">
                      {item.badge && item.badge > 0 && (
                        <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                          {item.badge}
                        </Badge>
                      )}
                      {item.isNew && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-green-100 text-green-700">
                          Nuevo
                        </Badge>
                      )}
                      {isActive && (
                        <ChevronRight className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Separator */}
          <Separator className="my-4" />

          {/* Secondary Navigation */}
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Configuración
            </p>
            {secondaryNavigation.map((item) => {
              const isActive = isActiveLink(item.href);
              return (
                <Link key={item.name} href={item.href}>
                  <div 
                    className={cn(
                      'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-gray-700' : 'text-gray-400 group-hover:text-gray-600'
                    )} />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>
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

// ================================================================
// src/components/layout/Header.tsx
// Header mejorado del dashboard
// ================================================================

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/providers/AuthProvider';
import { 
  Search, 
  Bell, 
  Settings,
  ChevronDown,
  Plus,
  Filter
} from 'lucide-react';

export function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications] = useState(3); // TODO: Conectar con sistema real
  const pathname = usePathname();
  const { user } = useAuth();

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

  const showQuickActions = () => {
    return ['/dashboard', '/dashboard/children', '/dashboard/logs'].includes(pathname);
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        {/* Page Title & Breadcrumb */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {getPageTitle()}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Bienvenido de vuelta, {user?.full_name?.split(' ')[0] || 'Usuario'}
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="hidden md:block relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar niños, registros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>

          {/* Quick Actions */}
          {showQuickActions() && (
            <div className="hidden sm:flex items-center space-x-2">
              <Button size="sm" variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Registro
              </Button>
            </div>
          )}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {notifications}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Registro pendiente de revisión</p>
                  <p className="text-xs text-gray-500">María González - hace 2 horas</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Seguimiento programado</p>
                  <p className="text-xs text-gray-500">Carlos Ruiz - mañana 10:00</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center text-sm text-blue-600">
                Ver todas las notificaciones
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings */}
          <Button variant="ghost" size="sm">
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}