'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Clock, Users, CalendarDays, CalendarOff, BarChart2,
} from 'lucide-react';
import { SideNavRail, type SideNavItemSpec } from '@/design-kit/compounds/SideNavRail';

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
    <SideNavRail
      items={NAV_ITEMS}
      activeKey={activeKey}
      brand={
        <Image
          src="/Xshift.svg"
          alt="Xshift"
          width={40}
          height={40}
          className="h-10 w-10 rounded-xl object-contain"
        />
      }
    />
  );
}
