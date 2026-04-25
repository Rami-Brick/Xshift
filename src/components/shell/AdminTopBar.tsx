'use client';

import { useState, useRef, useEffect } from 'react';
import { Settings, ScrollText, LogOut } from 'lucide-react';
import Link from 'next/link';
import { logout } from '@/lib/auth/actions';
import { canAccessLogs, canAccessSettings, isStaffRole, staffRoleLabel } from '@/lib/auth/roles';
import { NotificationPermissionButton } from '@/components/notifications/NotificationPermissionButton';
import type { Role } from '@/types';

interface AdminTopBarProps {
  fullName: string;
  role: Role;
}

export function AdminTopBar({ fullName, role }: AdminTopBarProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initials = fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="flex justify-end px-6 py-4">
      <div ref={ref} className="relative">
        <button
          type="button"
          aria-label="Menu compte"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-navDark text-white text-sm font-semibold hover:opacity-80 transition"
        >
          {initials}
        </button>

        {open && (
          <div className="absolute right-0 top-11 z-50 w-48 rounded-2xl bg-white shadow-nav border border-soft overflow-hidden">
            <div className="px-4 py-3 border-b border-soft">
              <p className="text-sm font-semibold text-ink truncate">{fullName}</p>
              <p className="text-xs text-muted">{staffRoleLabel(role)}</p>
            </div>
            <div className="py-1">
              {canAccessSettings(role) && (
                <Link
                  href="/admin/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-soft transition"
                >
                  <Settings size={15} className="text-muted" />
                  Paramètres
                </Link>
              )}
              {canAccessLogs(role) && (
                <Link
                  href="/admin/logs"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-soft transition"
                >
                  <ScrollText size={15} className="text-muted" />
                  Journal
                </Link>
              )}
              {isStaffRole(role) && <NotificationPermissionButton />}
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
    </div>
  );
}
