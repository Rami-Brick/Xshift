import { redirect } from 'next/navigation';
import { requireUserCached } from '@/lib/auth/guards';
import { logout } from '@/lib/auth/actions';
import { EmployeeNav } from '@/components/shell/EmployeeNav';
import { LogOut } from 'lucide-react';
import type { ReactNode } from 'react';

export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireUserCached();

  if (profile.role === 'admin') {
    redirect('/admin/dashboard');
  }

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      {/* Top header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-canvas/80 backdrop-blur-sm border-b border-soft">
        <span className="text-sm font-semibold text-ink truncate">{profile.full_name}</span>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Déconnexion"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-muted hover:text-ink hover:bg-soft transition"
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </form>
      </header>

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
