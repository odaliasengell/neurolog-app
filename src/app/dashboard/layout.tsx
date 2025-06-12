// src/app/dashboard/layout.tsx
// Layout principal del dashboard

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Toaster } from '@/components/ui/toaster';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50/30">
        <div className="flex h-screen">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden lg:ml-72">
            {/* Header */}
            <Header />
            
            {/* Page Content */}
            <main className="flex-1 overflow-auto">
              <div className="container mx-auto px-4 py-6 max-w-7xl">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
      
      {/* Toast notifications */}
      <Toaster />
    </AuthProvider>
  );
}