'use client'

import { AuthProvider } from '@/context/AuthContext'
import { DataProvider } from '@/context/DataContext'
import { NotificationProvider } from '@/context/NotificationContext'

export function Providers({ children }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <DataProvider>
          {children}
        </DataProvider>
      </NotificationProvider>
    </AuthProvider>
  )
}
