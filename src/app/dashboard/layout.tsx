// src/app/dashboard/layout.tsx
// Layout del dashboard actualizado con el nuevo modelo

import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { ToastProvider } from '@/components/providers/ToastProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="min-h-screen bg-gray-50">
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-auto">
                {children}
              </main>
            </div>
          </div>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}