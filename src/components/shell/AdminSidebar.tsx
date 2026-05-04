'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Clock, Users, CalendarDays, CalendarOff, BarChart2,
} from 'lucide-react';
import { SideNavRail, type SideNavItemSpec } from '@/design-kit/compounds/SideNavRail';
import { cn } from '@/lib/utils/cn';

type NavKey = 'dashboard' | 'attendance' | 'employees' | 'leave' | 'day-off' | 'reports';

const NAV_ITEMS: SideNavItemSpec<NavKey>[] = [
  { key: 'dashboard',  icon: LayoutDashboard, label: 'Tableau de bord', href: '/admin/dashboard' },
  { key: 'attendance', icon: Clock,           label: 'Présences',       href: '/admin/attendance' },
  { key: 'employees',  icon: Users,           label: 'Employés',        href: '/admin/employees' },
  { key: 'leave',      icon: CalendarDays,    label: 'Congés',          href: '/admin/leave' },
  { key: 'day-off',    icon: CalendarOff,     label: 'Jours de repos',  href: '/admin/day-off' },
  { key: 'reports',    icon: BarChart2,       label: 'Rapports',        href: '/admin/reports' },
];

const KEY_TO_PATH: Record<NavKey, string> = {
  dashboard:  '/admin/dashboard',
  attendance: '/admin/attendance',
  employees:  '/admin/employees',
  leave:      '/admin/leave',
  'day-off':  '/admin/day-off',
  reports:    '/admin/reports',
};

function pathToKey(pathname: string): NavKey | null {
  for (const [key, path] of Object.entries(KEY_TO_PATH)) {
    if (pathname.startsWith(path)) return key as NavKey;
  }
  return null;
}

export function AdminSidebar() {
  const pathname = usePathname();
  const activeKey = pathToKey(pathname);

  return (
    <SideNavRail
      items={NAV_ITEMS}
      activeKey={activeKey}
      brand={({ expanded }) => (
        <div className="relative h-12 w-full">
          <Image
            src="/icon-sidebar.png"
            alt={expanded ? '' : 'Xshift'}
            width={48}
            height={48}
            className={cn(
              'absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 object-contain transition-all duration-300 ease-in-out',
              expanded ? 'scale-90 opacity-0' : 'scale-100 opacity-100',
            )}
          />
          <Image
            src="/logo-sidebar.png"
            alt={expanded ? 'Xshift' : ''}
            width={180}
            height={60}
            className={cn(
              'absolute left-0 top-1/2 h-12 w-[176px] -translate-y-1/2 object-contain transition-all duration-300 ease-in-out',
              expanded ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
            )}
          />
        </div>
      )}
    />
  );
}
