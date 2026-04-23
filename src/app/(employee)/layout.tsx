import { redirect } from 'next/navigation';
import { requireUserCached } from '@/lib/auth/guards';
import { isStaffRole } from '@/lib/auth/roles';
import { EmployeeNav } from '@/components/shell/EmployeeNav';
import type { ReactNode } from 'react';

export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireUserCached();

  if (isStaffRole(profile.role)) {
    redirect('/admin/dashboard');
  }

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* Fixed bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pointer-events-none" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
        <div className="pointer-events-auto">
          <EmployeeNav />
        </div>
      </div>
    </div>
  );
}
