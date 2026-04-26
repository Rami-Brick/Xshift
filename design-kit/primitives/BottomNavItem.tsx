import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export interface BottomNavItemProps {
  icon: LucideIcon;
  label: string;
  href?: string;
  active?: boolean;
  prefetch?: boolean;
  onClick?: () => void;
}

export function BottomNavItem({
  icon: Icon,
  label,
  href,
  active,
  prefetch = false,
  onClick,
}: BottomNavItemProps) {
  const className = cn(
    'inline-flex h-11 w-11 items-center justify-center rounded-full transition',
    active ? 'bg-surface text-brand' : 'bg-navSlate text-white hover:bg-navSlateHover'
  );
  const icon = <Icon size={20} strokeWidth={active ? 2.25 : 2} />;

  if (href) {
    return (
      <Link
        href={href}
        prefetch={prefetch}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={className}
      >
        {icon}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={className}
    >
      {icon}
    </button>
  );
}
