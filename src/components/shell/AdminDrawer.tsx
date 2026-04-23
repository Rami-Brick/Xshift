'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, LayoutDashboard, Users, Clock,
  CalendarDays, CalendarOff, BarChart2, Settings, ScrollText, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { logout } from '@/lib/auth/actions';
import { canAccessLogs, canAccessSettings, staffRoleLabel } from '@/lib/auth/roles';
import type { Role } from '@/types';

type NavKey =
  | 'dashboard'
  | 'employees'
  | 'attendance'
  | 'leave'
  | 'day-off'
  | 'reports'
  | 'settings'
  | 'logs';

const NAV_ITEMS: { key: NavKey; icon: React.ElementType; label: string }[] = [
  { key: 'dashboard',  icon: LayoutDashboard, label: 'Tableau de bord' },
  { key: 'employees',  icon: Users,           label: 'Employés' },
  { key: 'attendance', icon: Clock,           label: 'Présences' },
  { key: 'leave',      icon: CalendarDays,    label: 'Congés' },
  { key: 'day-off',    icon: CalendarOff,     label: 'Jours de repos' },
  { key: 'reports',    icon: BarChart2,        label: 'Rapports' },
  { key: 'settings',   icon: Settings,         label: 'Paramètres' },
  { key: 'logs',       icon: ScrollText,       label: 'Journal' },
];

const KEY_TO_PATH: Record<NavKey, string> = {
  dashboard:  '/admin/dashboard',
  employees:  '/admin/employees',
  attendance: '/admin/attendance',
  leave:      '/admin/leave',
  'day-off':  '/admin/day-off',
  reports:    '/admin/reports',
  settings:   '/admin/settings',
  logs:       '/admin/logs',
};

interface AdminMobileHeaderProps {
  role: Role;
}

export function AdminMobileHeader({ role }: AdminMobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const navItems = NAV_ITEMS.filter(({ key }) => {
    if (key === 'settings') return canAccessSettings(role);
    if (key === 'logs') return canAccessLogs(role);
    return true;
  });

  return (
    <>
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-3 bg-navDark text-white shadow-nav">
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
        <button
          type="button"
          aria-label="Ouvrir le menu"
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-navSlate transition"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72 bg-navDark shadow-nav transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-navSlate">
          <div className="flex items-center gap-3">
            <Image
              src="/Xshift.svg"
              alt="Xshift"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-contain"
            />
            <span className="font-bold text-white text-lg">Xshift {staffRoleLabel(role)}</span>
          </div>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg text-white hover:bg-navSlate transition"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3 flex-1">
          {navItems.map(({ key, icon: Icon, label }) => {
            const active = pathname.startsWith(KEY_TO_PATH[key]);
            return (
              <Link
                key={key}
                href={KEY_TO_PATH[key]}
                prefetch
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition',
                  active
                    ? 'bg-surface text-brand'
                    : 'text-white/80 hover:bg-navSlate hover:text-white',
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.25 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-navSlate">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-navSlate hover:text-white transition"
            >
              <LogOut size={18} />
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
