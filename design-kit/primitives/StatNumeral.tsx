import type { ReactNode } from 'react';
import { cn } from '../utils/cn';

type Size = 'md' | 'lg' | 'xl';

export interface StatNumeralProps {
  children: ReactNode;
  size?: Size;
  className?: string;
}

const sizeClasses: Record<Size, string> = {
  md: 'text-display font-bold',
  lg: 'text-displayLg font-bold',
  xl: 'text-displayXl font-bold',
};

export function StatNumeral({ children, size = 'md', className }: StatNumeralProps) {
  return (
    <p
      className={cn(
        'text-ink tabular-nums tracking-tight',
        sizeClasses[size],
        className
      )}
    >
      {children}
    </p>
  );
}
