import type { LucideIcon } from 'lucide-react';
import { Card } from '../primitives/Card';
import { Chip } from '../primitives/Chip';
import { StatNumeral } from '../primitives/StatNumeral';
import { cn } from '../utils/cn';

export interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBg?: 'blue' | 'black' | 'dark';
  trend?: { dir: 'up' | 'down'; pct: number };
  subLabel?: string;
  className?: string;
}

const iconBgClasses = {
  blue: 'bg-data-blue text-white',
  black: 'bg-navDark text-white',
  dark: 'bg-navSlate text-white',
} as const;

export function KpiCard({ title, value, icon: Icon, iconBg = 'blue', trend, subLabel, className }: KpiCardProps) {
  return (
    <Card tone="surface" padding="md" className={cn('min-w-0', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-small font-medium text-muted leading-tight">{title}</p>
        <span
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-full shrink-0',
            iconBgClasses[iconBg]
          )}
        >
          <Icon size={16} strokeWidth={2.25} />
        </span>
      </div>
      <StatNumeral size="md" className="mt-3 leading-none">
        {value}
      </StatNumeral>
      <div className="mt-2 flex items-center justify-between gap-2">
        {subLabel && <span className="text-caption text-muted">{subLabel}</span>}
        {trend && (
          <Chip
            variant={trend.dir === 'up' ? 'trendUp' : 'trendDown'}
            delta={trend.dir === 'up' ? trend.pct : -trend.pct}
          />
        )}
      </div>
    </Card>
  );
}
