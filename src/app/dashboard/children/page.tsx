// src/app/dashboard/children/page.tsx
// Página principal de niños actualizada con el nuevo modelo

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/providers/AuthProvider';
import { useChildren } from '@/hooks/use-children';
import type { ChildWithRelation, ChildFilters, RelationshipType } from '@/types';
import { 
  PlusIcon, 
  SearchIcon, 
  FilterIcon,
  MoreVerticalIcon,
  EditIcon,
  EyeIcon,
  UserPlusIcon,
  CalendarIcon,
  MapPinIcon,
  HeartIcon,
  TrendingUpIcon,
  DownloadIcon,
  UsersIcon,
  BookOpenIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ================================================================
// COMPONENTES AUXILIARES
// ================================================================

interface ChildCardProps {
  child: ChildWithRelation;
  onEdit: (child: ChildWithRelation) => void;
  onViewDetails: (child: ChildWithRelation) => void;
  onManageUsers: (child: ChildWithRelation) => void;
}

function ChildCard({ child, onEdit, onViewDetails, onManageUsers }: ChildCardProps) {
  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  const getRelationshipColor = (type: RelationshipType) => {
    switch (type) {
      case 'parent': return 'bg-blue-100 text-blue-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'specialist': return 'bg-purple-100 text-purple-800';
      case 'observer': return 'bg-gray-100 text-gray-800';
      case 'family': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPermissionIcons = (child: ChildWithRelation) => {
    const permissions = [];
    if (child.can_edit) permissions.push({ icon: EditIcon, label: 'Editar', color: 'text-green-600' });
    if (child.can_export) permissions.push({ icon: DownloadIcon, label: 'Exportar', color: 'text-blue-600' });
    if (child.can_invite_others) permissions.push({ icon: UserPlusIcon, label: 'Invitar', color: 'text-purple-600' });
    return permissions;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* Child Info */}
          <div className="flex items-start space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage 
                src={child.avatar_url} 
                alt={child.name}
              />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xl font-semibold">
                {child.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {child.name}
              </h3>
              
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={`text-xs ${getRelationshipColor(child.relationship_type)}`}>
                  {child.relationship_type}
                </Badge>
                {child.birth_date && (
                  <span className="text-sm text-gray-600 flex items-center">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {calculateAge(child.birth_date)} años
                  </span>
                )}
              </div>
              
              {child.diagnosis && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                  <HeartIcon className="h-3 w-3 inline mr-1" />
                  {child.diagnosis}
                </p>
              )}
              
              {child.notes && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                  {child.notes}
                </p>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onViewDetails(child)}>
                <EyeIcon className="mr-2 h-4 w-4" />
                Ver Detalles
              </DropdownMenuItem>
              {child.can_edit && (
                <DropdownMenuItem onClick={() => onEdit(child)}>
                  <EditIcon className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onManageUsers(child)}
                disabled={!child.can_invite_others}
              >
                <UsersIcon className="mr-2 h-4 w-4" />
                Gestionar Usuarios
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/logs?child_id=${child.id}`}>
                  <BookOpenIcon className="mr-2 h-4 w-4" />
                  Ver Registros
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Permissions and Metadata */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getPermissionIcons(child).map((permission, index) => (
                <div 
                  key={index}
                  className="flex items-center text-xs text-gray-600"
                  title={permission.label}
                >
                  <permission.icon className={`h-3 w-3 ${permission.color}`} />
                </div>
              ))}
            </div>
            
            <div className="text-xs text-gray-500">
              <div>Creado: {format(new Date(child.created_at), 'dd MMM yyyy', { locale: es })}</div>
              {child.expires_at && (
                <div className="text-orange-600">
                  Expira: {format(new Date(child.expires_at), 'dd MMM yyyy', { locale: es })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-4 flex space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            asChild
          >
            <Link href={`/dashboard/children/${child.id}`}>
              <EyeIcon className="mr-2 h-4 w-4" />
              Ver Perfil
            </Link>
          </Button>
          <Button 
            size="sm" 
            className="flex-1"
            asChild
          >
            <Link href={`/dashboard/logs/new?child_id=${child.id}`}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Nuevo Registro
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface FiltersBarProps {
  filters: ChildFilters;
  onFiltersChange: (filters: ChildFilters) => void;
  totalCount: number;
  filteredCount: number;
}

function FiltersBar({ filters, onFiltersChange, totalCount, filteredCount }: FiltersBarProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <FilterIcon className="mr-2 h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>
              Mostrando {filteredCount} de {totalCount} niños
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onFiltersChange({})}
          >
            Limpiar Filtros
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar por nombre..."
              value={filters.search_term || ''}
              onChange={(e) => onFiltersChange({ ...filters, search_term: e.target.value })}
              className="pl-10"
            />
          </div>

          {/* Relationship Type */}
          <Select 
            value={filters.relationship_type || 'all'} 
            onValueChange={(value) => onFiltersChange({ 
              ...filters, 
              relationship_type: value === 'all' ? undefined : value as RelationshipType 
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tipo de relación" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las relaciones</SelectItem>
              <SelectItem value="parent">Padre/Madre</SelectItem>
              <SelectItem value="teacher">Docente</SelectItem>
              <SelectItem value="specialist">Especialista</SelectItem>
              <SelectItem value="observer">Observador</SelectItem>
              <SelectItem value="family">Familia</SelectItem>
            </SelectContent>
          </Select>

          {/* Age Range */}
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Edad mín"
              min="0"
              max="25"
              value={filters.age_min || ''}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                age_min: e.target.value ? parseInt(e.target.value) : undefined 
              })}
            />
            <Input
              type="number"
              placeholder="Edad máx"
              min="0"
              max="25"
              value={filters.age_max || ''}
              onChange={(e) => onFiltersChange({ 
                ...filters, 
                age_max: e.target.value ? parseInt(e.target.value) : undefined 
              })}
            />
          </div>

          {/* Has Diagnosis */}
          <Select 
            value={filters.has_diagnosis === undefined ? 'all' : filters.has_diagnosis.toString()} 
            onValueChange={(value) => onFiltersChange({ 
              ...filters, 
              has_diagnosis: value === 'all' ? undefined : value === 'true' 
            })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Diagnóstico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Con diagnóstico</SelectItem>
              <SelectItem value="false">Sin diagnóstico</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

// ================================================================
// COMPONENTE PRINCIPAL
// ================================================================

export default function ChildrenPage() {
  const { user } = useAuth();
  const { children, loading, error, filterChildren } = useChildren({ 
    includeInactive: false,
    realtime: true 
  });
  
  const [filters, setFilters] = useState<ChildFilters>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Aplicar filtros
  const filteredChildren = useMemo(() => {
    return filterChildren(filters);
  }, [children, filters, filterChildren]);

  // Handlers
  const handleEdit = (child: ChildWithRelation) => {
    // Navigate to edit page
    window.location.href = `/dashboard/children/${child.id}/edit`;
  };

  const handleViewDetails = (child: ChildWithRelation) => {
    // Navigate to details page
    window.location.href = `/dashboard/children/${child.id}`;
  };

  const handleManageUsers = (child: ChildWithRelation) => {
    // Navigate to manage users page
    window.location.href = `/dashboard/children/${child.id}/users`;
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error al cargar niños</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Niños en Seguimiento
          </h1>
          <p className="text-gray-600 mt-1">
            Gestiona la información de todos los niños a los que tienes acceso
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" asChild>
            <Link href="/dashboard/children/import">
              <DownloadIcon className="mr-2 h-4 w-4" />
              Importar
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/children/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              Agregar Niño
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <FiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={children.length}
        filteredCount={filteredChildren.length}
      />

      {/* Results */}
      {filteredChildren.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            {children.length === 0 ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay niños registrados
                </h3>
                <p className="text-gray-600 mb-6">
                  Comienza agregando el primer niño para empezar el seguimiento
                </p>
                <Button asChild>
                  <Link href="/dashboard/children/new">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Agregar Primer Niño
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No se encontraron niños
                </h3>
                <p className="text-gray-600 mb-6">
                  No hay niños que coincidan con los filtros seleccionados
                </p>
                <Button 
                  variant="outline"
                  onClick={() => setFilters({})}
                >
                  Limpiar Filtros
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* View Mode Toggle */}
          <div className="flex justify-end">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Vista:</span>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Tarjetas
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                Lista
              </Button>
            </div>
          </div>

          {/* Children Grid/List */}
          <div className={
            viewMode === 'grid' 
              ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3'
              : 'space-y-4'
          }>
            {filteredChildren.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                onEdit={handleEdit}
                onViewDetails={handleViewDetails}
                onManageUsers={handleManageUsers}
              />
            ))}
          </div>
        </>
      )}

      {/* Summary Stats */}
      {filteredChildren.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {filteredChildren.length}
                </div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {filteredChildren.filter(c => c.can_edit).length}
                </div>
                <div className="text-sm text-gray-600">Editables</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {filteredChildren.filter(c => c.relationship_type === 'parent').length}
                </div>
                <div className="text-sm text-gray-600">Como Padre</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {filteredChildren.filter(c => c.expires_at && new Date(c.expires_at) <= new Date()).length}
                </div>
                <div className="text-sm text-gray-600">Por Expirar</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}