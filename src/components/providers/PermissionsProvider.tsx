// src/components/providers/PermissionsProvider.tsx
'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import type { ChildWithRelation } from '@/types'

interface PermissionsContextType {
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

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined)

interface PermissionsProviderProps {
  children: ReactNode
}

export function PermissionsProvider({ children }: PermissionsProviderProps): JSX.Element {
  const permissions = usePermissions()

  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  )
}

export function usePermissionsContext(): PermissionsContextType {
  const context = useContext(PermissionsContext)
  if (context === undefined) {
    throw new Error('usePermissionsContext must be used within a PermissionsProvider')
  }
  return context
}