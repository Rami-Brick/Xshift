'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  BarChart2,
  Settings,
  ScrollText,
  LogOut,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { BottomSheet } from '@/design-kit/primitives/BottomSheet';
import { logout } from '@/lib/auth/actions';
import { canAccessLogs, canAccessSettings } from '@/lib/auth/roles';
import { cn } from '@/lib/utils/cn';
import type { Role } from '@/types';

interface MobileNavMoreSheetProps {
  role: Role;
  open: boolean;
  onClose: () => void;
}

interface Item {
  icon: LucideIcon;
  label: string;
  href: string;
}

export function MobileNavMoreSheet({ role, open, onClose }: MobileNavMoreSheetProps) {
  const pathname = usePathname();

  const items: Item[] = [
    { icon: Users, label: 'Employés', href: '/admin/employees' },
    { icon: BarChart2, label: 'Rapports', href: '/admin/reports' },
  ];
  if (canAccessSettings(role)) {
    items.push({ icon: Settings, label: 'Paramètres', href: '/admin/settings' });
  }
  if (canAccessLogs(role)) {
    items.push({ icon: ScrollText, label: 'Journal', href: '/admin/logs' });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Plus">
      <nav className="flex flex-col gap-1 p-3">
        {items.map(({ icon: Icon, label, href }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              prefetch
              onClick={onClose}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition',
                active ? 'bg-surface text-brand shadow-softer' : 'text-ink hover:bg-soft',
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.25 : 2} />
              <span className="flex-1">{label}</span>
              <ChevronRight size={16} className="text-muted" />
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-3 pt-2 border-t border-soft">
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-trend-down hover:bg-trend-down/10 transition"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </form>
      </div>
    </BottomSheet>
  );
}
