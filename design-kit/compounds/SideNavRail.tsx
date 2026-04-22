import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SideNavItemSpec<K extends string = string> {
  key: K;
  icon: LucideIcon;
  label: string;
  href?: string;
}

export interface SideNavRailProps<K extends string = string> {
  items: SideNavItemSpec<K>[];
  activeKey: K;
  onChange?: (key: K) => void;
  brand?: React.ReactNode;
  className?: string;
}

/**
 * Vertical sidebar rail for desktop. Mirrors the BottomNavBar's visual
 * language: dark pill surface, white circle + brand-blue icon for active,
 * slate pill for inactive. Intended to replace BottomNavBar at >= md.
 */
export function SideNavRail<K extends string = string>({
  items,
  activeKey,
  onChange,
  brand,
  className,
}: SideNavRailProps<K>) {
  return (
    <aside
      className={cn(
        'flex h-full w-20 shrink-0 flex-col items-center gap-3 rounded-[32px] bg-navDark px-3 py-5 shadow-nav',
        className
      )}
    >
      {brand && <div className="mb-2 flex h-10 w-10 items-center justify-center text-white">{brand}</div>}
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.key === activeKey;
        const itemClassName = cn(
          'inline-flex h-12 w-12 items-center justify-center rounded-full transition',
          active ? 'bg-surface text-brand' : 'bg-navSlate text-white hover:bg-navSlateHover'
        );

        const icon = <Icon size={20} strokeWidth={active ? 2.25 : 2} />;

        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={itemClassName}
            >
              {icon}
            </Link>
          );
        }

        return (
          <button
            key={item.key}
            type="button"
            aria-label={item.label}
            aria-pressed={active}
            onClick={() => onChange?.(item.key)}
            className={itemClassName}
          >
            {icon}
          </button>
        );
      })}
    </aside>
  );
}
