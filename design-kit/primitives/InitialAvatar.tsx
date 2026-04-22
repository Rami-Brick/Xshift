import { cn } from '../utils/cn';
import { initialsFromName, hashString } from '../utils/formatters';

type Tone = 'auto' | 'lime' | 'blue' | 'dark' | 'muted';
type Size = 32 | 36 | 40 | 44 | 48 | 56 | 64;

export interface InitialAvatarProps {
  name: string;
  size?: Size;
  tone?: Tone;
  className?: string;
  /**
   * When true (default) the component paints decorative face shapes behind the
   * initials so rows visually approach photo avatars without external URLs.
   */
  decorate?: boolean;
}

const toneClasses: Record<Exclude<Tone, 'auto'>, string> = {
  lime: 'bg-data-lime text-ink',
  blue: 'bg-data-blue text-white',
  dark: 'bg-navDark text-white',
  muted: 'bg-soft text-ink',
};

function autoTone(name: string): Exclude<Tone, 'auto'> {
  const tones: Array<Exclude<Tone, 'auto'>> = ['lime', 'blue', 'dark', 'muted'];
  return tones[hashString(name) % tones.length];
}

const sizeToText: Record<Size, string> = {
  32: 'text-[11px]',
  36: 'text-[12px]',
  40: 'text-[13px]',
  44: 'text-[14px]',
  48: 'text-[15px]',
  56: 'text-[17px]',
  64: 'text-[19px]',
};

export function InitialAvatar({ name, size = 40, tone = 'auto', className, decorate = true }: InitialAvatarProps) {
  const resolved: Exclude<Tone, 'auto'> = tone === 'auto' ? autoTone(name) : tone;
  const initials = initialsFromName(name);
  return (
    <span
      role="img"
      aria-label={name}
      style={{ width: size, height: size }}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold',
        toneClasses[resolved],
        sizeToText[size],
        className
      )}
    >
      {decorate && (
        <span
          aria-hidden
          className="absolute inset-0 opacity-25 mix-blend-multiply"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 115%, rgba(0,0,0,0.25) 0 35%, transparent 36%), radial-gradient(circle at 50% 38%, rgba(0,0,0,0.15) 0 20%, transparent 21%)',
          }}
        />
      )}
      <span className="relative">{initials}</span>
    </span>
  );
}
