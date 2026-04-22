import { requireAdmin } from '@/lib/auth/guards';
import { AdminSidebar } from '@/components/shell/AdminSidebar';
import { AdminMobileHeader } from '@/components/shell/AdminDrawer';
import type { ReactNode } from 'react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop: sidebar + content */}
      <div className="hidden md:flex h-screen">
        {/* Sidebar column */}
        <div className="flex-shrink-0 p-3 flex">
          <AdminSidebar />
        </div>
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Mobile: top bar + drawer + content */}
      <div className="md:hidden flex flex-col min-h-screen">
        <AdminMobileHeader />
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
