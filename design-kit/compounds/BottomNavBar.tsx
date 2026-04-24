import type { LucideIcon } from 'lucide-react';
import { BottomNavItem } from '../primitives/BottomNavItem';
import { cn } from '../utils/cn';

export interface BottomNavItemSpec<K extends string = string> {
  key: K;
  icon: LucideIcon;
  label: string;
  href?: string;
}

export interface BottomNavBarProps<K extends string = string> {
  items: BottomNavItemSpec<K>[];
  activeKey: K | null;
  onChange?: (key: K) => void;
  /** Positioning strategy: "floating" absolutely-positions inside a relative parent (MobileFrame). */
  variant?: 'floating' | 'static';
  className?: string;
}

export function BottomNavBar<K extends string = string>({
  items,
  activeKey,
  onChange,
  variant = 'floating',
  className,
}: BottomNavBarProps<K>) {
  return (
    <nav
      className={cn(
        'flex items-center gap-2 rounded-pill bg-navDark px-1.5 py-1.5 shadow-nav',
        variant === 'floating' && 'absolute bottom-4 left-1/2 -translate-x-1/2',
        className
      )}
    >
      {items.map((item) => (
        <BottomNavItem
          key={item.key}
          icon={item.icon}
          label={item.label}
          href={item.href}
          active={item.key === activeKey}
          onClick={() => onChange?.(item.key)}
        />
      ))}
    </nav>
  );
}
