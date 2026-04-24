'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Clock,
  CalendarDays, CalendarOff, BarChart2, Settings, ScrollText, LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BottomNavBar } from '@/design-kit/compounds/BottomNavBar';
import { logout } from '@/lib/auth/actions';
import { canAccessLogs, canAccessSettings, staffRoleLabel } from '@/lib/auth/roles';
import type { Role } from '@/types';

type NavKey = 'dashboard' | 'employees' | 'attendance' | 'leave' | 'day-off' | 'reports';

const NAV_ITEMS: { key: NavKey; icon: LucideIcon; label: string; href: string }[] = [
  { key: 'dashboard',  icon: LayoutDashboard, label: 'Tableau de bord', href: '/admin/dashboard' },
  { key: 'attendance', icon: Clock,           label: 'Présences',       href: '/admin/attendance' },
  { key: 'employees',  icon: Users,           label: 'Employés',        href: '/admin/employees' },
  { key: 'leave',      icon: CalendarDays,    label: 'Congés',          href: '/admin/leave' },
  { key: 'day-off',    icon: CalendarOff,     label: 'Repos',           href: '/admin/day-off' },
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

interface AdminMobileHeaderProps {
  role: Role;
  fullName: string;
}

export function AdminMobileHeader({ role, fullName }: AdminMobileHeaderProps) {
  const pathname = usePathname();
  const activeKey = pathToKey(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <>
      {/* Fixed top bar */}
      <header className="fixed top-0 inset-x-0 z-40 bg-navDark h-14 flex items-center justify-between px-4 shadow-nav">
        <div className="flex items-center gap-2">
          <Image
            src="/Xshift.svg"
            alt="Xshift"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-contain"
          />
          <span className="font-semibold text-sm text-white/80">Xshift {staffRoleLabel(role)}</span>
        </div>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Menu compte"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-navSlate text-white text-sm font-semibold hover:bg-navSlateHover transition"
          >
            {initials}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 z-50 w-48 rounded-2xl bg-white shadow-nav border border-soft overflow-hidden">
              <div className="px-4 py-3 border-b border-soft">
                <p className="text-sm font-semibold text-ink truncate">{fullName}</p>
                <p className="text-xs text-muted">{staffRoleLabel(role)}</p>
              </div>
              <div className="py-1">
                {canAccessSettings(role) && (
                  <Link
                    href="/admin/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-soft transition"
                  >
                    <Settings size={15} className="text-muted" />
                    Paramètres
                  </Link>
                )}
                {canAccessLogs(role) && (
                  <Link
                    href="/admin/logs"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-soft transition"
                  >
                    <ScrollText size={15} className="text-muted" />
                    Journal
                  </Link>
                )}
              </div>
              <div className="py-1 border-t border-soft">
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-soft transition"
                  >
                    <LogOut size={15} />
                    Déconnexion
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Fixed bottom tab bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 flex justify-center pb-4 pointer-events-none">
        <div className="pointer-events-auto">
          <BottomNavBar
            items={NAV_ITEMS}
            activeKey={activeKey}
            variant="static"
          />
        </div>
      </div>
    </>
  );
}
