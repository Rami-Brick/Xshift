'use client';

import Link from 'next/link';
import { useState } from 'react';
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
  footer?: React.ReactNode;
  className?: string;
}

export function SideNavRail<K extends string = string>({
  items,
  activeKey,
  onChange,
  brand,
  footer,
  className,
}: SideNavRailProps<K>) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      className={cn(
        'flex shrink-0 flex-col items-center gap-3 rounded-[32px] bg-navDark px-3 py-5 shadow-nav transition-all duration-300 ease-in-out overflow-hidden',
        expanded ? 'w-52' : 'w-20',
        className
      )}
    >
      {brand && <div className="mb-2 flex h-10 w-10 items-center justify-center text-white">{brand}</div>}
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.key === activeKey;

        const content = (
          <span className={cn(
            'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors',
            active ? 'bg-surface text-brand' : 'bg-navSlate text-white hover:bg-navSlateHover'
          )}>
            <Icon size={20} strokeWidth={active ? 2.25 : 2} />
          </span>
        );

        const label = (
          <span className={cn(
            'text-sm font-medium text-white whitespace-nowrap overflow-hidden transition-all duration-200',
            expanded ? 'max-w-[120px] opacity-100 ml-3' : 'max-w-0 opacity-0 ml-0'
          )}>
            {item.label}
          </span>
        );

        const rowClass = cn(
          'flex items-center',
          expanded ? 'w-full' : 'justify-center'
        );

        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={rowClass}
            >
              {content}
              {label}
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
            className={rowClass}
          >
            {content}
            {label}
          </button>
        );
      })}
      {footer && (
        <div className="mt-3 pt-3 border-t border-navSlate w-full flex justify-center">
          {footer}
        </div>
      )}
    </aside>
  );
}
