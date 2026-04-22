'use client';

import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Clock, CalendarDays } from 'lucide-react';
import { BottomNavBar, type BottomNavItemSpec } from '@/design-kit/compounds/BottomNavBar';

type NavKey = 'dashboard' | 'history' | 'leave';

const NAV_ITEMS: BottomNavItemSpec<NavKey>[] = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { key: 'history',   icon: Clock,           label: 'Historique' },
  { key: 'leave',     icon: CalendarDays,    label: 'Congés' },
];

const KEY_TO_PATH: Record<NavKey, string> = {
  dashboard: '/dashboard',
  history:   '/history',
  leave:     '/leave',
};

const PATH_TO_KEY: Record<string, NavKey> = {
  '/dashboard': 'dashboard',
  '/history':   'history',
  '/leave':     'leave',
};

export function EmployeeNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeKey: NavKey = PATH_TO_KEY[pathname] ?? 'dashboard';

  return (
    <BottomNavBar
      items={NAV_ITEMS}
      activeKey={activeKey}
      onChange={(key) => router.push(KEY_TO_PATH[key])}
      variant="static"
      className="w-full justify-center"
    />
  );
}
