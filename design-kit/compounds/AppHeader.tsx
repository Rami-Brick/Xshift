import { ArrowLeft, Bell, MoreHorizontal } from 'lucide-react';
import { IconButton } from '../primitives/IconButton';
import { InitialAvatar } from '../primitives/InitialAvatar';
import { Badge } from '../primitives/Badge';
import { cn } from '../utils/cn';

type DashboardProps = {
  variant: 'dashboard';
  eyebrow: string;
  eyebrowBadge?: string;
  title: string;
  onBell?: () => void;
  avatarName: string;
};

type DetailProps = {
  variant: 'detail';
  title: string;
  onBack?: () => void;
  onMenu?: () => void;
};

export type AppHeaderProps = (DashboardProps | DetailProps) & { className?: string };

export function AppHeader(props: AppHeaderProps) {
  if (props.variant === 'dashboard') {
    const { eyebrow, eyebrowBadge, title, onBell, avatarName, className } = props;
    return (
      <header className={cn('flex items-start justify-between gap-3 px-5 pt-4', className)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-small text-muted">{eyebrow}</span>
            {eyebrowBadge && <Badge tone="lime">{eyebrowBadge}</Badge>}
          </div>
          <h1 className="mt-1 text-section font-bold text-ink tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <IconButton icon={Bell} label="Notifications" size="md" onClick={onBell} />
          <InitialAvatar name={avatarName} size={40} />
        </div>
      </header>
    );
  }
  const { title, onBack, onMenu, className } = props;
  return (
    <header className={cn('grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 pt-4', className)}>
      <IconButton icon={ArrowLeft} label="Back" size="md" onClick={onBack} />
      <h1 className="text-center text-cardTitle font-semibold text-ink">{title}</h1>
      <IconButton icon={MoreHorizontal} label="More options" size="md" onClick={onMenu} />
    </header>
  );
}
