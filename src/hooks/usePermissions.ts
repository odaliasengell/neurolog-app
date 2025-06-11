// src/hooks/usePermissions.ts
import { useMemo } from 'react'
import { useAuth } from './useAuth'
import { PermissionService } from '@/lib/permissions'
import type { ChildWithRelation, RelationshipType } from '@/types'

interface UsePermissionsReturn {
  canCreateChild: boolean
  canReadChild: (child: ChildWithRelation) => boolean
  canEditChild: (child: ChildWithRelation) => boolean
  canDeleteChild: (child: ChildWithRelation) => boolean
  canShareChild: (child: ChildWithRelation) => boolean
  canCreateLog: (child: ChildWithRelation) => boolean
  canEditLog: (logOwnerId: string) => boolean
  canExportLogs: (child: ChildWithRelation) => boolean
  hasRole: (role: string) => boolean
  getPermissionLevel: (child: ChildWithRelation) => 'none' | 'view' | 'edit' | 'full'
}

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth()

  return useMemo(() => {
    if (!user) {
      return {
        canCreateChild: false,
        canReadChild: () => false,
        canEditChild: () => false,
        canDeleteChild: () => false,
        canShareChild: () => false,
        canCreateLog: () => false,
        canEditLog: () => false,
        canExportLogs: () => false,
        hasRole: () => false,
        getPermissionLevel: () => 'none' as const,
      }
    }

    return {
      canCreateChild: PermissionService.canCreateChild(user.role),

      canReadChild: (child: ChildWithRelation) =>
        PermissionService.canReadChild(
          user.role,
          user.id,
          child.created_by,
          child.can_view
        ),

      canEditChild: (child: ChildWithRelation) =>
        PermissionService.canEditChild(
          user.role,
          user.id,
          child.created_by,
          child.can_edit
        ),

      canDeleteChild: (child: ChildWithRelation) =>
        PermissionService.canDeleteChild(user.role, user.id, child.created_by),

      canShareChild: (child: ChildWithRelation) =>
        PermissionService.canShareChild(
          user.role,
          user.id,
          child.created_by,
          child.relationship_type
        ),

      canCreateLog: (child: ChildWithRelation) =>
        PermissionService.hasPermission('logs.create.editable', {
          userRole: user.role,
          userId: user.id,
          resourceOwnerId: child.created_by,
          canEdit: child.can_edit,
        }),

      canEditLog: (logOwnerId: string) =>
        PermissionService.hasPermission('logs.update.own', {
          userRole: user.role,
          userId: user.id,
          resourceOwnerId: logOwnerId,
        }),

      canExportLogs: (child: ChildWithRelation) =>
        PermissionService.hasPermission('logs.export.exportable', {
          userRole: user.role,
          userId: user.id,
          resourceOwnerId: child.created_by,
          canExport: child.can_export,
        }),

      hasRole: (role: string) => user.role === role,

      getPermissionLevel: (child: ChildWithRelation) => {
        if (child.created_by === user.id) return 'full'
        if (child.can_edit) return 'edit'
        if (child.can_view) return 'view'
        return 'none'
      },
    }
  }, [user])
}