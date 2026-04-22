import { forwardRef, type ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

type Size = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  size?: Size;
  tone?: 'surface' | 'soft' | 'ghost';
}

const sizeMap: Record<Size, { box: string; icon: number }> = {
  sm: { box: 'h-8 w-8', icon: 16 },
  md: { box: 'h-10 w-10', icon: 18 },
  lg: { box: 'h-12 w-12', icon: 22 },
};

const toneMap = {
  surface: 'bg-surface shadow-iconBtn text-ink',
  soft: 'bg-soft text-ink',
  ghost: 'bg-transparent text-ink hover:bg-soft',
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, size = 'md', tone = 'surface', className, ...rest },
  ref
) {
  const { box, icon } = sizeMap[size];
  return (
    <button
      ref={ref}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        box,
        toneMap[tone],
        className
      )}
      {...rest}
    >
      <Icon size={icon} strokeWidth={2} />
    </button>
  );
});
