'use client';

import { useEffect, useState, type ElementType } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart2,
  CalendarDays,
  CalendarOff,
  Clock,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  ScrollText,
  Settings,
  Users,
  X,
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

const PRIMARY_NAV_ITEMS: { key: NavKey; icon: ElementType; label: string }[] = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Accueil' },
  { key: 'attendance', icon: Clock, label: 'Présences' },
  { key: 'leave', icon: CalendarDays, label: 'Congés' },
  { key: 'day-off', icon: CalendarOff, label: 'Repos' },
];

const MORE_NAV_ITEMS: { key: NavKey; icon: ElementType; label: string }[] = [
  { key: 'employees', icon: Users, label: 'Employés' },
  { key: 'reports', icon: BarChart2, label: 'Rapports' },
  { key: 'settings', icon: Settings, label: 'Paramètres' },
  { key: 'logs', icon: ScrollText, label: 'Journal' },
];

const KEY_TO_PATH: Record<NavKey, string> = {
  dashboard: '/admin/dashboard',
  employees: '/admin/employees',
  attendance: '/admin/attendance',
  leave: '/admin/leave',
  'day-off': '/admin/day-off',
  reports: '/admin/reports',
  settings: '/admin/settings',
  logs: '/admin/logs',
};

interface AdminMobileHeaderProps {
  role: Role;
}

export function AdminMobileHeader({ role }: AdminMobileHeaderProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  const moreItems = MORE_NAV_ITEMS.filter(({ key }) => {
    if (key === 'settings') return canAccessSettings(role);
    if (key === 'logs') return canAccessLogs(role);
    return true;
  });
  const primaryActive = PRIMARY_NAV_ITEMS.some(({ key }) => pathname.startsWith(KEY_TO_PATH[key]));
  const moreActive = !primaryActive && moreItems.some(({ key }) => pathname.startsWith(KEY_TO_PATH[key]));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between bg-navDark px-4 py-3 text-white shadow-nav">
        <div className="flex min-w-0 items-center gap-2">
          <Image
            src="/Xshift.svg"
            alt="Xshift"
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-lg object-contain"
          />
          <span className="min-w-0 truncate text-sm font-semibold text-white/80">Xshift</span>
        </div>
        <span className="rounded-pill bg-navSlate px-3 py-1 text-caption font-semibold text-white/80">
          {staffRoleLabel(role)}
        </span>
      </header>

      {moreOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {moreOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-mobile-more-title"
          className="fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl bg-surface p-4 shadow-nav"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 id="admin-mobile-more-title" className="text-base font-semibold text-ink">
                Plus
              </h2>
              <p className="text-caption text-muted">Navigation et compte</p>
            </div>
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={() => setMoreOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-soft hover:text-ink focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <nav
            aria-label="Navigation secondaire"
            className="max-h-[55dvh] space-y-2 overflow-y-auto overscroll-contain"
          >
            {moreItems.map(({ key, icon: Icon, label }) => {
              const active = pathname.startsWith(KEY_TO_PATH[key]);
              return (
                <Link
                  key={key}
                  href={KEY_TO_PATH[key]}
                  prefetch
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-brand/40',
                    active ? 'bg-brand text-white' : 'bg-canvas text-ink hover:bg-soft',
                  )}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                </Link>
              );
            })}
          </nav>

          <form action={logout} className="mt-3 border-t border-soft pt-3">
            <button
              type="submit"
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-trend-down transition hover:bg-trend-down/10 focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <LogOut size={18} aria-hidden="true" />
              Déconnexion
            </button>
          </form>
        </div>
      ) : null}

      <nav
        aria-label="Navigation principale"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="pointer-events-auto grid w-full max-w-md grid-cols-5 gap-1 rounded-pill bg-navDark p-1.5 shadow-nav">
          {PRIMARY_NAV_ITEMS.map(({ key, icon: Icon, label }) => {
            const active = pathname.startsWith(KEY_TO_PATH[key]);
            return (
              <Link
                key={key}
                href={KEY_TO_PATH[key]}
                prefetch
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-pill px-1 text-[10px] font-semibold transition focus-visible:ring-2 focus-visible:ring-brand/40',
                  active
                    ? 'bg-surface text-brand'
                    : 'text-white/75 hover:bg-navSlate hover:text-white',
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.25 : 2} aria-hidden="true" />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            aria-label="Ouvrir le menu Plus"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((value) => !value)}
            className={cn(
              'flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-pill px-1 text-[10px] font-semibold transition focus-visible:ring-2 focus-visible:ring-brand/40',
              moreActive || moreOpen
                ? 'bg-surface text-brand'
                : 'text-white/75 hover:bg-navSlate hover:text-white',
            )}
          >
            <MoreHorizontal size={18} aria-hidden="true" />
            <span>Plus</span>
          </button>
        </div>
      </nav>
    </>
  );
}
