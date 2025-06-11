// src/hooks/__tests__/useAuth.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from '../useAuth'
import { supabase } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase')
const mockSupabase = supabase as jest.Mocked<typeof supabase>

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'parent' as const,
  avatar_url: null,
  phone: null,
  is_active: true,
  last_login: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBe(null)
    expect(result.current.error).toBe(null)
  })

  it('should sign in successfully', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: 'user-123' },
        session: null,
      },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValueOnce({
            data: mockUser,
            error: null,
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signIn('test@example.com', 'password123')
    })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })

  it('should handle sign in error', async () => {
    const errorMessage = 'Invalid credentials'
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: new Error(errorMessage),
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      try {
        await result.current.signIn('test@example.com', 'wrongpassword')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage)
      expect(result.current.user).toBe(null)
      expect(result.current.loading).toBe(false)
    })
  })

  it('should sign up successfully', async () => {
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: {
        user: { id: 'user-123' },
        session: null,
      },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValueOnce({
            data: mockUser,
            error: null,
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.signUp(
        'test@example.com',
        'password123',
        'Test User',
        'parent'
      )
    })

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })

  it('should sign out successfully', async () => {
    mockSupabase.auth.signOut.mockResolvedValueOnce({ error: null })

    const { result } = renderHook(() => useAuth())

    // Simular usuario autenticado
    act(() => {
      result.current.user = mockUser
    })

    await act(async () => {
      await result.current.signOut()
    })

    await waitFor(() => {
      expect(result.current.user).toBe(null)
      expect(result.current.loading).toBe(false)
    })
  })

  it('should update profile successfully', async () => {
    const updatedUser = { ...mockUser, full_name: 'Updated Name' }

    mockSupabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValueOnce({
              data: updatedUser,
              error: null,
            }),
          }),
        }),
      }),
    } as any)

    const { result } = renderHook(() => useAuth())

    // Simular usuario autenticado
    act(() => {
      result.current.user = mockUser
    })

    await act(async () => {
      await result.current.updateProfile({ full_name: 'Updated Name' })
    })

    await waitFor(() => {
      expect(result.current.user?.full_name).toBe('Updated Name')
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBe(null)
    })
  })
})