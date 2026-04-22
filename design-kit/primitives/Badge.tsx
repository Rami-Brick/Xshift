import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

type Tone = 'lime' | 'muted' | 'brand' | 'dark';

export interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

const toneClasses: Record<Tone, string> = {
  lime: 'bg-data-lime text-ink',
  muted: 'bg-soft text-muted',
  brand: 'bg-brand text-white',
  dark: 'bg-navDark text-white',
};

export function Badge({ tone = 'lime', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
