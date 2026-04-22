import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'surface' | 'canvas';
  padding?: 'sm' | 'md' | 'lg';
  withChevron?: boolean;
  chevronLabel?: string;
  onChevronClick?: () => void;
  header?: ReactNode;
}

const paddingMap = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
} as const;

const toneMap = {
  surface: 'bg-surface',
  canvas: 'bg-cardCanvas',
} as const;

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { tone = 'surface', padding = 'md', withChevron, chevronLabel = 'Open', onChevronClick, header, className, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative rounded-xl shadow-soft',
        toneMap[tone],
        paddingMap[padding],
        className
      )}
      {...rest}
    >
      {withChevron && (
        <button
          type="button"
          aria-label={chevronLabel}
          onClick={onChevronClick}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-soft text-ink hover:bg-subtle"
        >
          <ChevronRight size={16} />
        </button>
      )}
      {header && <div className="mb-3">{header}</div>}
      {children}
    </div>
  );
});
