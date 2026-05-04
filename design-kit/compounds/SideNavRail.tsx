'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

export interface SideNavItemSpec<K extends string = string> {
  key: K;
  icon: LucideIcon;
  label: string;
  href?: string;
  prefetch?: boolean;
}

export interface SideNavRailProps<K extends string = string> {
  items: SideNavItemSpec<K>[];
  activeKey: K | null;
  onChange?: (key: K) => void;
  brand?: ReactNode | ((state: { expanded: boolean }) => ReactNode);
  footer?: ReactNode;
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
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const expanded = hovered || focusWithin;
  const brandContent = typeof brand === 'function' ? brand({ expanded }) : brand;

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setFocusWithin(false);
        }
      }}
      className={cn(
        'flex shrink-0 flex-col items-center gap-3 rounded-[32px] bg-navDark px-3 py-5 shadow-nav transition-all duration-300 ease-in-out overflow-hidden',
        expanded ? 'w-52' : 'w-20',
        className
      )}
    >
      {brandContent && (
        <div
          className={cn(
            'mb-2 flex h-12 items-center overflow-hidden text-white transition-all duration-300 ease-in-out',
            expanded ? 'w-full justify-start px-1' : 'w-12 justify-center px-0',
          )}
        >
          {brandContent}
        </div>
      )}
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
            'text-sm font-medium text-white whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out',
            expanded ? 'max-w-[120px] opacity-100 ml-3' : 'max-w-0 opacity-0 ml-0'
          )}>
            {item.label}
          </span>
        );

        const rowClass = 'flex items-center w-full';

        if (item.href) {
          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch={item.prefetch ?? false}
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
