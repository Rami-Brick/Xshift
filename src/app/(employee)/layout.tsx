import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guards';
import { EmployeeNav } from '@/components/shell/EmployeeNav';
import type { ReactNode } from 'react';

export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireUser();

  if (profile.role === 'admin') {
    redirect('/admin/dashboard');
  }

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      {/* Scrollable content */}
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* Fixed bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-safe px-4 pb-4 bg-canvas/80 backdrop-blur-sm border-t border-subtle">
        <EmployeeNav />
      </div>
    </div>
  );
}
