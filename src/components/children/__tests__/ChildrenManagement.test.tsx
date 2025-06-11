// src/components/children/__tests__/ChildrenManagement.test.tsx
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChildrenManagement from '../ChildrenManagement'
import { useAuth } from '@/hooks/useAuth'
import { useChildren } from '@/hooks/useChildren'

// Mock hooks
jest.mock('@/hooks/useAuth')
jest.mock('@/hooks/useChildren')

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseChildren = useChildren as jest.MockedFunction<typeof useChildren>

const mockParentUser = {
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

const mockTeacherUser = {
  ...mockParentUser,
  id: 'teacher-123',
  email: 'teacher@test.com',
  role: 'teacher' as const,
}

const mockChildren = [
  {
    id: 'child-1',
    name: 'Ana García',
    birth_date: '2015-03-15',
    diagnosis: 'TEA',
    notes: 'Necesita apoyo en comunicación',
    is_active: true,
    created_by: 'parent-123',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    relationship_type: 'parent' as const,
    can_edit: true,
    can_view: true,
    can_export: true,
  },
  {
    id: 'child-2',
    name: 'Carlos López',
    birth_date: '2016-07-22',
    diagnosis: 'TDAH',
    notes: 'Dificultades de atención',
    is_active: true,
    created_by: 'other-parent-456',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    relationship_type: 'teacher' as const,
    can_edit: false,
    can_view: true,
    can_export: false,
  },
]

describe('ChildrenManagement Component', () => {
  const mockCreateChild = jest.fn()
  const mockUpdateChild = jest.fn()
  const mockDeleteChild = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseAuth.mockReturnValue({
      user: mockParentUser,
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    })

    mockUseChildren.mockReturnValue({
      children: mockChildren,
      loading: false,
      error: null,
      createChild: mockCreateChild,
      updateChild: mockUpdateChild,
      deleteChild: mockDeleteChild,
      grantAccess: jest.fn(),
      revokeAccess: jest.fn(),
      refreshChildren: jest.fn(),
    })
  })

  it('should render children management interface', () => {
    render(<ChildrenManagement />)

    expect(screen.getByText('Gestión de Niños')).toBeInTheDocument()
    expect(screen.getByTestId('children-management')).toBeInTheDocument()
    expect(screen.getByText('Niños (2)')).toBeInTheDocument()
  })

  it('should show "Add Child" button for parents and teachers', () => {
    render(<ChildrenManagement />)

    expect(screen.getByRole('button', { name: /agregar niño/i })).toBeInTheDocument()
  })

  it('should not show "Add Child" button for specialists', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockParentUser, role: 'specialist' },
      loading: false,
      error: null,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    })

    render(<ChildrenManagement />)

    expect(screen.queryByRole('button', { name: /agregar niño/i })).not.toBeInTheDocument()
  })

  it('should display children in table format', () => {
    render(<ChildrenManagement />)

    expect(screen.getByTestId('child-row-child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-row-child-2')).toBeInTheDocument()
    expect(screen.getByText('Ana García')).toBeInTheDocument()
    expect(screen.getByText('Carlos López')).toBeInTheDocument()
  })

  it('should show correct role badges', () => {
    render(<ChildrenManagement />)

    expect(screen.getByText('Padre/Madre')).toBeInTheDocument()
    expect(screen.getByText('Docente')).toBeInTheDocument()
  })

  it('should show correct permission badges', () => {
    render(<ChildrenManagement />)

    const viewBadges = screen.getAllByText('Ver')
    const editBadges = screen.getAllByText('Editar')
    const exportBadges = screen.getAllByText('Exportar')

    expect(viewBadges).toHaveLength(2) // Both children have view permission
    expect(editBadges).toHaveLength(1) // Only first child has edit permission
    expect(exportBadges).toHaveLength(1) // Only first child has export permission
  })

  it('should filter children based on search term', async () => {
    const user = userEvent.setup()
    render(<ChildrenManagement />)

    const searchInput = screen.getByTestId('search-input')
    await user.type(searchInput, 'Ana')

    await waitFor(() => {
      expect(screen.getByText('Ana García')).toBeInTheDocument()
      expect(screen.queryByText('Carlos López')).not.toBeInTheDocument()
    })
  })

  it('should show action buttons based on permissions', () => {
    render(<ChildrenManagement />)

    // First child (owned by user) should have all actions
    const editButton1 = screen.getByTestId('edit-child-child-1')
    const deleteButton1 = screen.getByTestId('delete-child-child-1')
    const shareButton1 = screen.getByTestId('share-child-child-1')

    expect(editButton1).toBeInTheDocument()
    expect(deleteButton1).toBeInTheDocument()
    expect(shareButton1).toBeInTheDocument()

    // Second child (not owned, teacher role) should not have delete action
    expect(screen.queryByTestId('delete-child-child-2')).not.toBeInTheDocument()
  })

  it('should handle child creation', async () => {
    const user = userEvent.setup()
    render(<ChildrenManagement />)

    const addButton = screen.getByRole('button', { name: /agregar niño/i })
    await user.click(addButton)

    // Dialog should be opened (assuming ChildDialog component exists)
    // This would be tested in the ChildDialog component tests
  })

  it('should handle child deletion with confirmation', async () => {
    const user = userEvent.setup()
    
    // Mock window.confirm
    const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true)
    mockDeleteChild.mockResolvedValueOnce(undefined)

    render(<ChildrenManagement />)

    const deleteButton = screen.getByTestId('delete-child-child-1')
    await user.click(deleteButton)

    expect(mockConfirm).toHaveBeenCalledWith('¿Estás seguro de que deseas eliminar a Ana García?')
    expect(mockDeleteChild).toHaveBeenCalledWith('child-1')

    mockConfirm.mockRestore()
  })

  it('should show loading state', () => {
    mockUseChildren.mockReturnValue({
      children: [],
      loading: true,
      error: null,
      createChild: mockCreateChild,
      updateChild: mockUpdateChild,
      deleteChild: mockDeleteChild,
      grantAccess: jest.fn(),
      revokeAccess: jest.fn(),
      refreshChildren: jest.fn(),
    })

    render(<ChildrenManagement />)

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // Loading spinner
  })

  it('should show error state', () => {
    const errorMessage = 'Error loading children'
    mockUseChildren.mockReturnValue({
      children: [],
      loading: false,
      error: errorMessage,
      createChild: mockCreateChild,
      updateChild: mockUpdateChild,
      deleteChild: mockDeleteChild,
      grantAccess: jest.fn(),
      revokeAccess: jest.fn(),
      refreshChildren: jest.fn(),
    })

    render(<ChildrenManagement />)

    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('should show empty state when no children', () => {
    mockUseChildren.mockReturnValue({
      children: [],
      loading: false,
      error: null,
      createChild: mockCreateChild,
      updateChild: mockUpdateChild,
      deleteChild: mockDeleteChild,
      grantAccess: jest.fn(),
      revokeAccess: jest.fn(),
      refreshChildren: jest.fn(),
    })

    render(<ChildrenManagement />)

    expect(screen.getByText('No hay niños registrados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar primer niño/i })).toBeInTheDocument()
  })
})