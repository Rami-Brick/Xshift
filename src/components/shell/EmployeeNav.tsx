'use client';

import { usePathname } from 'next/navigation';
import { Home, Clock, CalendarDays, CalendarOff } from 'lucide-react';
import { BottomNavBar, type BottomNavItemSpec } from '@/design-kit/compounds/BottomNavBar';

type NavKey = 'dashboard' | 'history' | 'leave' | 'day-off';

const NAV_ITEMS: BottomNavItemSpec<NavKey>[] = [
  { key: 'dashboard', icon: Home,            label: 'Home', href: '/dashboard' },
  { key: 'history',   icon: Clock,           label: 'Historique', href: '/history' },
  { key: 'leave',     icon: CalendarDays,    label: 'Congés', href: '/leave' },
  { key: 'day-off',   icon: CalendarOff,     label: 'Repos', href: '/day-off' },
];

const PATH_TO_KEY: Record<string, NavKey> = {
  '/dashboard': 'dashboard',
  '/history':   'history',
  '/leave':     'leave',
  '/day-off':   'day-off',
};

export function EmployeeNav() {
  const pathname = usePathname();
  const activeKey: NavKey = PATH_TO_KEY[pathname] ?? 'dashboard';

  return (
    <BottomNavBar
      items={NAV_ITEMS}
      activeKey={activeKey}
      variant="static"
      className="justify-center opacity-120"
    />
  );
}
