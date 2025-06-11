// src/hooks/__tests__/useChildren.integration.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChildren } from '../useChildren'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')
const mockSupabase = supabase as jest.Mocked<typeof supabase>

const mockChildren = [
  {
    id: 'child-1',
    name: 'Ana García',
    birth_date: '2015-03-15',
    diagnosis: 'TEA',
    notes: 'Necesita apoyo en comunicación',
    is_active: true,
    created_by: 'user-123',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    user_child_relations: [{
      relationship_type: 'parent',
      can_edit: true,
      can_view: true,
      can_export: true,
    }],
  },
  {
    id: 'child-2',
    name: 'Carlos López',
    birth_date: '2016-07-22',
    diagnosis: 'TDAH',
    notes: 'Dificultades de atención',
    is_active: true,
    created_by: 'user-456',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    user_child_relations: [{
      relationship_type: 'teacher',
      can_edit: false,
      can_view: true,
      can_export: false,
    }],
  },
]

describe('useChildren Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch children with correct permissions', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValueOnce({
              data: mockChildren,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useChildren('user-123'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.children).toHaveLength(2)
      expect(result.current.children[0]).toMatchObject({
        id: 'child-1',
        name: 'Ana García',
        relationship_type: 'parent',
        can_edit: true,
        can_view: true,
        can_export: true,
      })
      expect(result.current.children[1]).toMatchObject({
        id: 'child-2',
        name: 'Carlos López',
        relationship_type: 'teacher',
        can_edit: false,
        can_view: true,
        can_export: false,
      })
    })
  })

  it('should create child and refresh list', async () => {
    const newChild = {
      id: 'child-new',
      name: 'María Rodríguez',
      birth_date: '2017-01-10',
      diagnosis: 'Síndrome de Down',
      notes: 'Necesita apoyo académico',
      is_active: true,
      created_by: 'user-123',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    // Mock initial fetch
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValueOnce({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    // Mock create child
    mockSupabase.from.mockReturnValueOnce({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValueOnce({
            data: newChild,
            error: null,
          }),
        }),
      }),
    } as any)

    // Mock refresh fetch after creation
    mockSupabase.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValueOnce({
              data: [{ ...newChild, user_child_relations: [{ relationship_type: 'parent', can_edit: true, can_view: true, can_export: true }] }],
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useChildren('user-123'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      const createdChild = await result.current.createChild({
        name: 'María Rodríguez',
        birth_date: '2017-01-10',
        diagnosis: 'Síndrome de Down',
        notes: 'Necesita apoyo académico',
        is_active: true,
      })
      expect(createdChild).toEqual(newChild)
    })

    await waitFor(() => {
      expect(result.current.children).toHaveLength(1)
      expect(result.current.children[0].name).toBe('María Rodríguez')
    })
  })

  it('should handle permission-based operations correctly', async () => {
    // Mock fetch children
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValueOnce({
              data: mockChildren,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useChildren('user-123'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Test grant access
    mockSupabase.from.mockReturnValueOnce({
      upsert: jest.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      }),
    } as any)

    await act(async () => {
      await result.current.grantAccess(
        'child-1',
        'user-789',
        'teacher',
        { canEdit: false, canView: true, canExport: false }
      )
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('user_child_relations')

    // Test revoke access
    mockSupabase.from.mockReturnValueOnce({
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValueOnce({
            data: null,
            error: null,
          }),
        }),
      }),
    } as any)

    await act(async () => {
      await result.current.revokeAccess('child-1', 'user-789')
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('user_child_relations')
  })
})