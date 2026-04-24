import { requireStaffCached } from '@/lib/auth/guards';
import { AdminSidebar } from '@/components/shell/AdminSidebar';
import { AdminMobileHeader } from '@/components/shell/AdminDrawer';
import { AdminTopBar } from '@/components/shell/AdminTopBar';
import type { ReactNode } from 'react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireStaffCached();

  return (
    <div className="min-h-screen bg-canvas">
      {/* Desktop: sidebar + content */}
      <div className="hidden md:flex h-screen">
        {/* Sidebar column */}
        <div className="flex-shrink-0 p-3 pt-12 flex items-start">
          <AdminSidebar />
        </div>
        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <AdminTopBar fullName={profile.full_name} role={profile.role} />
          <div className="px-6 pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile: top bar + drawer + content */}
      <div className="md:hidden flex flex-col min-h-screen">
        <AdminMobileHeader role={profile.role} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 pb-28">
          {children}
        </main>
      </div>
    </div>
  );
}
