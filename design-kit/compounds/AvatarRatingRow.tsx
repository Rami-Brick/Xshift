import { Star } from 'lucide-react';
import { InitialAvatar } from '../primitives/InitialAvatar';
import { cn } from '../utils/cn';

export type RatingTag = 'Excellent' | 'Good' | 'Fair' | 'Improved';

export interface AvatarRatingRowProps {
  name: string;
  role: string;
  roleTone?: 'lime' | 'brand' | 'muted';
  score: number;
  tag?: RatingTag;
  avatarTone?: 'auto' | 'lime' | 'blue' | 'dark' | 'muted';
  className?: string;
}

const roleToneMap = {
  lime: 'text-roleLime',
  brand: 'text-brand',
  muted: 'text-muted',
} as const;

const tagToneMap: Record<RatingTag, string> = {
  Excellent: 'text-data-blue',
  Good: 'text-muted',
  Fair: 'text-ink',
  Improved: 'text-mutedSoft',
};

export function AvatarRatingRow({
  name,
  role,
  roleTone = 'lime',
  score,
  tag,
  avatarTone = 'auto',
  className,
}: AvatarRatingRowProps) {
  return (
    <div className={cn('flex items-center gap-3 py-2', className)}>
      <InitialAvatar name={name} size={44} tone={avatarTone} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-ink truncate leading-tight">{name}</p>
        <p className={cn('text-caption font-medium leading-tight mt-0.5', roleToneMap[roleTone])}>
          {role}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Star size={14} className="fill-accent-star text-accent-star" />
        <span className="text-body font-semibold text-ink tabular-nums">{score.toFixed(1)}</span>
        {tag && <span className={cn('text-small font-medium', tagToneMap[tag])}>{tag}</span>}
      </div>
    </div>
  );
}
