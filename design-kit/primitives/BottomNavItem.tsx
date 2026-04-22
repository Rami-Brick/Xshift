import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export interface BottomNavItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function BottomNavItem({ icon: Icon, label, active, onClick }: BottomNavItemProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-full transition',
        active ? 'bg-surface text-brand' : 'bg-navSlate text-white hover:bg-[#3a3f47]'
      )}
    >
      <Icon size={20} strokeWidth={active ? 2.25 : 2} />
    </button>
  );
}
