import Image from 'next/image';
import { staffRoleLabel } from '@/lib/auth/roles';
import type { Role } from '@/types';

interface AdminMobileTopBarProps {
  role: Role;
}

export function AdminMobileTopBar({ role }: AdminMobileTopBarProps) {
  return (
    <header className="flex items-center gap-2 px-4 py-3 bg-navDark text-white shadow-nav">
      <Image
        src="/Xshift.svg"
        alt="Xshift"
        width={32}
        height={32}
        className="h-8 w-8 rounded-lg object-contain"
      />
      <span className="font-semibold text-sm text-white/80">Xshift {staffRoleLabel(role)}</span>
    </header>
  );
}
