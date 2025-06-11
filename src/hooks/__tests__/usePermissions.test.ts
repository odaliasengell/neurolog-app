// src/hooks/__tests__/usePermissions.test.ts
import { renderHook } from '@testing-library/react'
import { usePermissions } from '../usePermissions'
import { useAuth } from '../useAuth'

jest.mock('../useAuth')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

const mockChild = {
  id: 'child-123',
  name: 'Test Child',
  birth_date: '2015-01-01',
  diagnosis: 'TEA',
  notes: 'Test notes',
  is_active: true,
  created_by: 'parent-123',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  relationship_type: 'teacher' as const,
  can_edit: true,
  can_view: true,
  can_export: false,
}

describe('usePermissions Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return false for all permissions when no user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    })

    const { result } = renderHook(() => usePermissions())

    expect(result.current.canCreateChild).toBe(false)
    expect(result.current.canReadChild(mockChild)).toBe(false)
    expect(result.current.canEditChild(mockChild)).toBe(false)
    expect(result.current.canDeleteChild(mockChild)).toBe(false)
    expect(result.current.hasRole('parent')).toBe(false)
  })

  it('should return correct permissions for parent user', () => {
    const parentUser = {
      id: 'parent-123',
      email: 'parent@test.com',
      full_name: 'Parent User',
      role: 'parent' as const,
      avatar_url: null,
      phone: null,
      is_active: true,
      last_login: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    mockUseAuth.mockReturnValue({
      user: parentUser,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    })

    const { result } = renderHook(() => usePermissions())

    expect(result.current.canCreateChild).toBe(true)
    expect(result.current.canReadChild(mockChild)).toBe(true) // Has view permission
    expect(result.current.canEditChild(mockChild)).toBe(true) // Has edit permission
    expect(result.current.canDeleteChild(mockChild)).toBe(true) // Is owner and parent
    expect(result.current.hasRole('parent')).toBe(true)
  })

  it('should return correct permissions for teacher user', () => {
    const teacherUser = {
      id: 'teacher-123',
      email: 'teacher@test.com',
      full_name: 'Teacher User',
      role: 'teacher' as const,
      avatar_url: null,
      phone: null,
      is_active: true,
      last_login: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    mockUseAuth.mockReturnValue({
      user: teacherUser,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    })

    const { result } = renderHook(() => usePermissions())

    expect(result.current.canCreateChild).toBe(true)
    expect(result.current.canReadChild(mockChild)).toBe(true) // Has view permission
    expect(result.current.canEditChild(mockChild)).toBe(true) // Has edit permission
    expect(result.current.canDeleteChild(mockChild)).toBe(false) // Not owner or not parent role
    expect(result.current.hasRole('teacher')).toBe(true)
  })

  it('should return correct permission levels', () => {
    const parentUser = {
      id: 'parent-123',
      email: 'parent@test.com',
      full_name: 'Parent User',
      role: 'parent' as const,
      avatar_url: null,
      phone: null,
      is_active: true,
      last_login: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    mockUseAuth.mockReturnValue({
      user: parentUser,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    })

    const { result } = renderHook(() => usePermissions())

    // Owner should have full permissions
    const ownedChild = { ...mockChild, created_by: 'parent-123' }
    expect(result.current.getPermissionLevel(ownedChild)).toBe('full')

    // Child with edit permission
    const editableChild = { ...mockChild, can_edit: true, can_view: true }
    expect(result.current.getPermissionLevel(editableChild)).toBe('edit')

    // Child with only view permission
    const viewableChild = { ...mockChild, can_edit: false, can_view: true }
    expect(result.current.getPermissionLevel(viewableChild)).toBe('view')

    // Child with no permissions
    const noAccessChild = { ...mockChild, can_edit: false, can_view: false }
    expect(result.current.getPermissionLevel(noAccessChild)).toBe('none')
  })
})