'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  CalendarOff,
  MoreHorizontal,
} from 'lucide-react';
import { BottomNavBar, type BottomNavItemSpec } from '@/design-kit/compounds/BottomNavBar';
import { MobileNavMoreSheet } from './MobileNavMoreSheet';
import type { Role } from '@/types';

type NavKey = 'dashboard' | 'attendance' | 'leave' | 'day-off' | 'more';

const PRIMARY_ITEMS: BottomNavItemSpec<NavKey>[] = [
  { key: 'dashboard',  icon: LayoutDashboard, label: 'Tableau de bord', href: '/admin/dashboard' },
  { key: 'attendance', icon: Clock,           label: 'Présences',       href: '/admin/attendance' },
  { key: 'leave',      icon: CalendarDays,    label: 'Congés',          href: '/admin/leave' },
  { key: 'day-off',    icon: CalendarOff,     label: 'Jours de repos',  href: '/admin/day-off' },
];

const MORE_ITEM: BottomNavItemSpec<NavKey> = {
  key: 'more',
  icon: MoreHorizontal,
  label: 'Plus',
};

const OVERFLOW_PATHS = ['/admin/employees', '/admin/reports', '/admin/settings', '/admin/logs'];

interface AdminBottomNavProps {
  role: Role;
}

export function AdminBottomNav({ role }: AdminBottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  let activeKey: NavKey = 'dashboard';
  if (OVERFLOW_PATHS.some((p) => pathname.startsWith(p))) {
    activeKey = 'more';
  } else {
    const match = PRIMARY_ITEMS.find((item) => item.href && pathname.startsWith(item.href));
    if (match) activeKey = match.key;
    else activeKey = 'dashboard';
  }

  const items = [...PRIMARY_ITEMS, MORE_ITEM];

  return (
    <>
      <div
        className="fixed left-1/2 -translate-x-1/2 z-40 md:hidden"
        style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <BottomNavBar
          items={items}
          activeKey={activeKey}
          variant="static"
          onChange={(key) => {
            if (key === 'more') setMoreOpen(true);
          }}
        />
      </div>
      <MobileNavMoreSheet role={role} open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
