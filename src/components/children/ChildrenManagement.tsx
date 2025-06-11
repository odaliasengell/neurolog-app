// src/components/children/ChildrenManagement.tsx
'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, UserPlus, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useChildren } from '@/hooks/useChildren'
import { useAuth } from '@/hooks/useAuth'
import { formatDate, calculateAge } from '@/lib/utils'
import type { ChildWithRelation, UserRole } from '@/types'
import { ChildDialog } from './ChildDialog'
import { ShareChildDialog } from './ShareChildDialog'

interface ChildrenManagementProps {
  className?: string
}

const ChildrenManagement: React.FC<ChildrenManagementProps> = ({ className }) => {
  const { user } = useAuth()
  const { children, loading, error, createChild, updateChild, deleteChild } = useChildren(user?.id || '')
  
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedChild, setSelectedChild] = useState<ChildWithRelation | null>(null)
  const [isChildDialogOpen, setIsChildDialogOpen] = useState<boolean>(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState<boolean>(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')

  // Filtros aplicados a los niños
  const filteredChildren = useMemo(() => {
    if (!searchTerm) return children

    return children.filter(child =>
      child.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      child.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      child.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [children, searchTerm])

  // Verificar permisos basados en rol del usuario
  const canCreateChildren = useMemo(() => {
    return user?.role === 'parent' || user?.role === 'teacher'
  }, [user?.role])

  const canEditChild = useCallback((child: ChildWithRelation): boolean => {
    if (!user) return false
    return child.can_edit || child.created_by === user.id
  }, [user])

  const canDeleteChild = useCallback((child: ChildWithRelation): boolean => {
    if (!user) return false
    return child.created_by === user.id && user.role === 'parent'
  }, [user])

  const canShareChild = useCallback((child: ChildWithRelation): boolean => {
    if (!user) return false
    return child.created_by === user.id || child.relationship_type === 'parent'
  }, [user])

  // Handlers
  const handleCreateChild = useCallback(() => {
    setSelectedChild(null)
    setDialogMode('create')
    setIsChildDialogOpen(true)
  }, [])

  const handleEditChild = useCallback((child: ChildWithRelation) => {
    setSelectedChild(child)
    setDialogMode('edit')
    setIsChildDialogOpen(true)
  }, [])

  const handleShareChild = useCallback((child: ChildWithRelation) => {
    setSelectedChild(child)
    setIsShareDialogOpen(true)
  }, [])

  const handleDeleteChild = useCallback(async (child: ChildWithRelation) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar a ${child.name}?`)) {
      return
    }

    try {
      await deleteChild(child.id)
    } catch (error) {
      console.error('Error deleting child:', error)
    }
  }, [deleteChild])

  const handleChildSaved = useCallback(() => {
    setIsChildDialogOpen(false)
    setSelectedChild(null)
  }, [])

  const handleShareCompleted = useCallback(() => {
    setIsShareDialogOpen(false)
    setSelectedChild(null)
  }, [])

  // Función para obtener el color del badge según el rol
  const getRoleBadgeVariant = (relationshipType: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (relationshipType) {
      case 'parent': return 'default'
      case 'teacher': return 'secondary'
      case 'specialist': return 'outline'
      default: return 'outline'
    }
  }

  if (loading && children.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`} data-testid="children-management">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Niños</h1>
          <p className="text-gray-600">
            Administra la información de los niños bajo tu cuidado
          </p>
        </div>
        
        {canCreateChildren && (
          <Button onClick={handleCreateChild} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Agregar Niño
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar niños por nombre, diagnóstico o notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Children Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Niños ({filteredChildren.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredChildren.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 mb-4">
                {searchTerm ? 'No se encontraron niños que coincidan con la búsqueda' : 'No hay niños registrados'}
              </div>
              {canCreateChildren && !searchTerm && (
                <Button onClick={handleCreateChild} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar primer niño
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Diagnóstico</TableHead>
                    <TableHead>Tu Rol</TableHead>
                    <TableHead>Permisos</TableHead>
                    <TableHead>Fecha de Registro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChildren.map((child) => (
                    <TableRow key={child.id} data-testid={`child-row-${child.id}`}>
                      <TableCell className="font-medium">
                        {child.name}
                      </TableCell>
                      <TableCell>
                        {child.birth_date ? `${calculateAge(child.birth_date)} años` : 'No especificada'}
                      </TableCell>
                      <TableCell>
                        {child.diagnosis || 'Sin diagnóstico'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(child.relationship_type)}>
                          {child.relationship_type === 'parent' && 'Padre/Madre'}
                          {child.relationship_type === 'teacher' && 'Docente'}
                          {child.relationship_type === 'specialist' && 'Especialista'}
                          {child.relationship_type === 'observer' && 'Observador'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {child.can_view && (
                            <Badge variant="outline" className="text-xs">Ver</Badge>
                          )}
                          {child.can_edit && (
                            <Badge variant="outline" className="text-xs">Editar</Badge>
                          )}
                          {child.can_export && (
                            <Badge variant="outline" className="text-xs">Exportar</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(child.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditChild(child)}
                              disabled={!canEditChild(child)}
                              data-testid={`edit-child-${child.id}`}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            
                            {canShareChild(child) && (
                              <DropdownMenuItem
                                onClick={() => handleShareChild(child)}
                                data-testid={`share-child-${child.id}`}
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Compartir Acceso
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuItem
                              onClick={() => {/* Navegar a logs */}}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Registros
                            </DropdownMenuItem>
                            
                            {canDeleteChild(child) && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteChild(child)}
                                className="text-red-600"
                                data-testid={`delete-child-${child.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ChildDialog
        isOpen={isChildDialogOpen}
        onClose={() => setIsChildDialogOpen(false)}
        onSave={handleChildSaved}
        child={selectedChild}
        mode={dialogMode}
      />

      <ShareChildDialog
        isOpen={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        onComplete={handleShareCompleted}
        child={selectedChild}
      />
    </div>
  )
}

export default ChildrenManagement