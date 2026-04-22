'use client';

import { usePathname } from 'next/navigation';
import { LayoutDashboard, Clock, CalendarDays } from 'lucide-react';
import { BottomNavBar, type BottomNavItemSpec } from '@/design-kit/compounds/BottomNavBar';

type NavKey = 'dashboard' | 'history' | 'leave';

const NAV_ITEMS: BottomNavItemSpec<NavKey>[] = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord', href: '/dashboard' },
  { key: 'history',   icon: Clock,           label: 'Historique', href: '/history' },
  { key: 'leave',     icon: CalendarDays,    label: 'Congés', href: '/leave' },
];

const PATH_TO_KEY: Record<string, NavKey> = {
  '/dashboard': 'dashboard',
  '/history':   'history',
  '/leave':     'leave',
};

export function EmployeeNav() {
  const pathname = usePathname();
  const activeKey: NavKey = PATH_TO_KEY[pathname] ?? 'dashboard';

  return (
    <BottomNavBar
      items={NAV_ITEMS}
      activeKey={activeKey}
      variant="static"
      className="w-full justify-center"
    />
  );
}
