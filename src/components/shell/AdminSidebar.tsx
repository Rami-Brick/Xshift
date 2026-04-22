'use client';

import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Clock, CalendarDays,
  BarChart2, Settings, ScrollText, LogOut,
} from 'lucide-react';
import { SideNavRail, type SideNavItemSpec } from '@/design-kit/compounds/SideNavRail';
import { logout } from '@/lib/auth/actions';

type NavKey = 'dashboard' | 'employees' | 'attendance' | 'leave' | 'reports' | 'settings' | 'logs';

const NAV_ITEMS: SideNavItemSpec<NavKey>[] = [
  { key: 'dashboard',  icon: LayoutDashboard, label: 'Tableau de bord', href: '/admin/dashboard' },
  { key: 'employees',  icon: Users,           label: 'Employés', href: '/admin/employees' },
  { key: 'attendance', icon: Clock,           label: 'Présences', href: '/admin/attendance' },
  { key: 'leave',      icon: CalendarDays,    label: 'Congés', href: '/admin/leave' },
  { key: 'reports',    icon: BarChart2,        label: 'Rapports', href: '/admin/reports' },
  { key: 'settings',   icon: Settings,         label: 'Paramètres', href: '/admin/settings' },
  { key: 'logs',       icon: ScrollText,       label: 'Journal', href: '/admin/logs' },
];

const KEY_TO_PATH: Record<NavKey, string> = {
  dashboard:  '/admin/dashboard',
  employees:  '/admin/employees',
  attendance: '/admin/attendance',
  leave:      '/admin/leave',
  reports:    '/admin/reports',
  settings:   '/admin/settings',
  logs:       '/admin/logs',
};

function pathToKey(pathname: string): NavKey {
  for (const [key, path] of Object.entries(KEY_TO_PATH)) {
    if (pathname.startsWith(path)) return key as NavKey;
  }
  return 'dashboard';
}

export function AdminSidebar() {
  const pathname = usePathname();
  const activeKey = pathToKey(pathname);

  return (
    <div className="flex flex-col h-full">
      <SideNavRail
        items={NAV_ITEMS}
        activeKey={activeKey}
        brand={
          <span className="font-bold text-lg" style={{ fontFamily: 'DM Sans, sans-serif' }}>X</span>
        }
      />
      {/* Logout pinned at bottom */}
      <form action={logout} className="mt-auto pt-3 pb-5 flex justify-center">
        <button
          type="submit"
          aria-label="Déconnexion"
          className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-navSlate text-white hover:bg-navSlateHover transition"
        >
          <LogOut size={18} />
        </button>
      </form>
    </div>
  );
}
