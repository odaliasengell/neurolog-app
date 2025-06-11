// src/lib/__tests__/permissions.test.ts
import { PermissionService } from '../permissions'
import type { UserRole, RelationshipType } from '@/types'

describe('PermissionService', () => {
  describe('hasPermission', () => {
    it('should allow parents to create children', () => {
      const result = PermissionService.hasPermission('children.create', {
        userRole: 'parent',
        userId: 'user-123',
      })
      expect(result).toBe(true)
    })

    it('should allow teachers to create children', () => {
      const result = PermissionService.hasPermission('children.create', {
        userRole: 'teacher',
        userId: 'user-123',
      })
      expect(result).toBe(true)
    })

    it('should not allow specialists to create children', () => {
      const result = PermissionService.hasPermission('children.create', {
        userRole: 'specialist',
        userId: 'user-123',
      })
      expect(result).toBe(false)
    })

    it('should allow owner to read own children', () => {
      const result = PermissionService.hasPermission('children.read.own', {
        userRole: 'parent',
        userId: 'user-123',
        resourceOwnerId: 'user-123',
      })
      expect(result).toBe(true)
    })

    it('should not allow non-owner to read own children', () => {
      const result = PermissionService.hasPermission('children.read.own', {
        userRole: 'parent',
        userId: 'user-123',
        resourceOwnerId: 'user-456',
      })
      expect(result).toBe(false)
    })

    it('should allow reading accessible children with view permission', () => {
      const result = PermissionService.hasPermission('children.read.accessible', {
        userRole: 'teacher',
        userId: 'user-123',
        resourceOwnerId: 'user-456',
        canView: true,
      })
      expect(result).toBe(true)
    })

    it('should not allow reading accessible children without view permission', () => {
      const result = PermissionService.hasPermission('children.read.accessible', {
        userRole: 'teacher',
        userId: 'user-123',
        resourceOwnerId: 'user-456',
        canView: false,
      })
      expect(result).toBe(false)
    })

    it('should allow owner to delete children if parent', () => {
      const result = PermissionService.hasPermission('children.delete.own', {
        userRole: 'parent',
        userId: 'user-123',
        resourceOwnerId: 'user-123',
      })
      expect(result).toBe(true)
    })

    it('should not allow teacher to delete children even if owner', () => {
      const result = PermissionService.hasPermission('children.delete.own', {
        userRole: 'teacher',
        userId: 'user-123',
        resourceOwnerId: 'user-123',
      })
      expect(result).toBe(false)
    })
  })

  describe('convenience methods', () => {
    it('should correctly check canCreateChild', () => {
      expect(PermissionService.canCreateChild('parent')).toBe(true)
      expect(PermissionService.canCreateChild('teacher')).toBe(true)
      expect(PermissionService.canCreateChild('specialist')).toBe(false)
    })

    it('should correctly check canReadChild', () => {
      expect(PermissionService.canReadChild('parent', 'user-123', 'user-123', false)).toBe(true)
      expect(PermissionService.canReadChild('teacher', 'user-123', 'user-456', true)).toBe(true)
      expect(PermissionService.canReadChild('teacher', 'user-123', 'user-456', false)).toBe(false)
    })

    it('should correctly check canEditChild', () => {
      expect(PermissionService.canEditChild('parent', 'user-123', 'user-123', false)).toBe(true)
      expect(PermissionService.canEditChild('teacher', 'user-123', 'user-456', true)).toBe(true)
      expect(PermissionService.canEditChild('specialist', 'user-123', 'user-456', false)).toBe(false)
    })

    it('should correctly check canDeleteChild', () => {
      expect(PermissionService.canDeleteChild('parent', 'user-123', 'user-123')).toBe(true)
      expect(PermissionService.canDeleteChild('teacher', 'user-123', 'user-123')).toBe(false)
      expect(PermissionService.canDeleteChild('parent', 'user-123', 'user-456')).toBe(false)
    })
  })

  describe('getDefaultPermissions', () => {
    it('should return correct permissions for parent', () => {
      const permissions = PermissionService.getDefaultPermissions('parent')
      expect(permissions).toEqual({
        canEdit: true,
        canView: true,
        canExport: true,
      })
    })

    it('should return correct permissions for teacher', () => {
      const permissions = PermissionService.getDefaultPermissions('teacher')
      expect(permissions).toEqual({
        canEdit: true,
        canView: true,
        canExport: false,
      })
    })

    it('should return correct permissions for specialist', () => {
      const permissions = PermissionService.getDefaultPermissions('specialist')
      expect(permissions).toEqual({
        canEdit: false,
        canView: true,
        canExport: true,
      })
    })

    it('should return correct permissions for observer', () => {
      const permissions = PermissionService.getDefaultPermissions('observer')
      expect(permissions).toEqual({
        canEdit: false,
        canView: true,
        canExport: false,
      })
    })
  })
})