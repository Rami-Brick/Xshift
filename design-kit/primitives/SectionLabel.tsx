import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface SectionLabelProps {
  children: ReactNode;
  className?: string;
  tone?: 'muted' | 'ink';
}

export function SectionLabel({ children, className, tone = 'muted' }: SectionLabelProps) {
  return (
    <p
      className={cn(
        'text-small font-medium leading-none',
        tone === 'muted' ? 'text-muted' : 'text-ink',
        className
      )}
    >
      {children}
    </p>
  );
}
