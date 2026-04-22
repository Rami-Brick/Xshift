import { AvatarRatingRow, type AvatarRatingRowProps } from './AvatarRatingRow';
import { cn } from '../utils/cn';

export interface AvatarRatingListProps {
  rows: AvatarRatingRowProps[];
  className?: string;
  divider?: boolean;
}

export function AvatarRatingList({ rows, className, divider = false }: AvatarRatingListProps) {
  return (
    <ul className={cn('flex flex-col', className)}>
      {rows.map((row, i) => (
        <li
          key={`${row.name}-${i}`}
          className={cn(divider && i > 0 && 'border-t border-soft')}
        >
          <AvatarRatingRow {...row} />
        </li>
      ))}
    </ul>
  );
}
