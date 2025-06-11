// src/lib/permissions.ts
import type { UserRole, RelationshipType } from '@/types'

export interface Permission {
  action: string
  resource: string
  condition?: (context: PermissionContext) => boolean
}

export interface PermissionContext {
  userRole: UserRole
  userId: string
  resourceOwnerId?: string
  relationshipType?: RelationshipType
  canEdit?: boolean
  canView?: boolean
  canExport?: boolean
}

// Definición de permisos base por rol
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  parent: [
    'children.create',
    'children.read.own',
    'children.update.own',
    'children.delete.own',
    'children.share.own',
    'logs.create.editable',
    'logs.read.accessible',
    'logs.update.own',
    'logs.export.exportable',
    'profile.read.own',
    'profile.update.own',
  ],
  teacher: [
    'children.create',
    'children.read.accessible',
    'children.update.editable',
    'logs.create.editable',
    'logs.read.accessible',
    'logs.update.own',
    'logs.export.exportable',
    'profile.read.own',
    'profile.update.own',
  ],
  specialist: [
    'children.read.accessible',
    'children.update.editable',
    'logs.create.editable',
    'logs.read.accessible',
    'logs.update.own',
    'logs.export.exportable',
    'profile.read.own',
    'profile.update.own',
  ],
}

// Funciones de verificación de permisos
export class PermissionService {
  static hasPermission(
    permission: string,
    context: PermissionContext
  ): boolean {
    const { userRole, userId, resourceOwnerId, relationshipType } = context

    // Verificar si el rol tiene el permiso base
    const rolePermissions = ROLE_PERMISSIONS[userRole] || []
    if (!rolePermissions.includes(permission)) {
      return false
    }

    // Aplicar condiciones específicas según el permiso
    switch (permission) {
      case 'children.read.own':
        return resourceOwnerId === userId

      case 'children.read.accessible':
        return context.canView === true || resourceOwnerId === userId

      case 'children.update.own':
        return resourceOwnerId === userId

      case 'children.update.editable':
        return context.canEdit === true || resourceOwnerId === userId

      case 'children.delete.own':
        return resourceOwnerId === userId && userRole === 'parent'

      case 'children.share.own':
        return resourceOwnerId === userId || relationshipType === 'parent'

      case 'logs.create.editable':
        return context.canEdit === true || resourceOwnerId === userId

      case 'logs.read.accessible':
        return context.canView === true || resourceOwnerId === userId

      case 'logs.export.exportable':
        return context.canExport === true || resourceOwnerId === userId

      case 'profile.read.own':
      case 'profile.update.own':
        return resourceOwnerId === userId

      default:
        return true
    }
  }

  static canCreateChild(userRole: UserRole): boolean {
    return this.hasPermission('children.create', { userRole, userId: '' })
  }

  static canReadChild(
    userRole: UserRole,
    userId: string,
    childOwnerId: string,
    canView: boolean = false
  ): boolean {
    return this.hasPermission('children.read.accessible', {
      userRole,
      userId,
      resourceOwnerId: childOwnerId,
      canView,
    })
  }

  static canEditChild(
    userRole: UserRole,
    userId: string,
    childOwnerId: string,
    canEdit: boolean = false
  ): boolean {
    return this.hasPermission('children.update.editable', {
      userRole,
      userId,
      resourceOwnerId: childOwnerId,
      canEdit,
    })
  }

  static canDeleteChild(
    userRole: UserRole,
    userId: string,
    childOwnerId: string
  ): boolean {
    return this.hasPermission('children.delete.own', {
      userRole,
      userId,
      resourceOwnerId: childOwnerId,
    })
  }

  static canShareChild(
    userRole: UserRole,
    userId: string,
    childOwnerId: string,
    relationshipType: RelationshipType
  ): boolean {
    return this.hasPermission('children.share.own', {
      userRole,
      userId,
      resourceOwnerId: childOwnerId,
      relationshipType,
    })
  }

  static getDefaultPermissions(
    relationshipType: RelationshipType
  ): { canEdit: boolean; canView: boolean; canExport: boolean } {
    switch (relationshipType) {
      case 'parent':
        return { canEdit: true, canView: true, canExport: true }
      case 'teacher':
        return { canEdit: true, canView: true, canExport: false }
      case 'specialist':
        return { canEdit: false, canView: true, canExport: true }
      case 'observer':
        return { canEdit: false, canView: true, canExport: false }
      default:
        return { canEdit: false, canView: false, canExport: false }
    }
  }
}