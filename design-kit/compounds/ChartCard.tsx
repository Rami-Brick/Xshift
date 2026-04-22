import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { Card } from '../primitives/Card';
import { cn } from '../utils/cn';

export interface ChartCardProps {
  eyebrow?: string;
  title: string;
  affordance?: boolean;
  onAffordanceClick?: () => void;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: 'surface' | 'canvas';
  padding?: 'sm' | 'md' | 'lg';
}

export function ChartCard({
  eyebrow,
  title,
  affordance = false,
  onAffordanceClick,
  headerRight,
  children,
  className,
  tone = 'surface',
  padding = 'lg',
}: ChartCardProps) {
  return (
    <Card tone={tone} padding={padding} className={cn('relative', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-small text-muted leading-none">{eyebrow}</p>}
          <h3 className="mt-1 text-section font-bold text-ink tracking-tight">{title}</h3>
        </div>
        {headerRight}
        {affordance && (
          <button
            type="button"
            aria-label="Open"
            onClick={onAffordanceClick}
            className="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full bg-soft text-ink hover:bg-subtle"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}
