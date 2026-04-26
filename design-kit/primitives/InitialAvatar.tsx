import { cn } from '../utils/cn';
import { initialsFromName, hashString } from '../utils/formatters';

type Tone = 'auto' | 'gradient' | 'lime' | 'blue' | 'dark' | 'muted';
type Size = 32 | 36 | 40 | 44 | 48 | 56 | 64;

export interface InitialAvatarProps {
  name: string;
  size?: Size;
  tone?: Tone;
  className?: string;
  /**
   * When true (default) the component paints decorative face shapes behind the
   * initials so rows visually approach photo avatars without external URLs.
   * Ignored for `gradient` tone (which uses its own surface treatment).
   */
  decorate?: boolean;
}

const flatToneClasses: Record<Exclude<Tone, 'auto' | 'gradient'>, string> = {
  lime: 'bg-data-lime text-ink',
  blue: 'bg-data-blue text-white',
  dark: 'bg-navDark text-white',
  muted: 'bg-soft text-ink',
};

// Saturated gradient pairs spanning the hue wheel. Initials sit on top in dark ink for AA contrast.
const GRADIENTS: ReadonlyArray<{ from: string; to: string }> = [
  { from: '#FF8C52', to: '#F25A2E' }, // coral
  { from: '#FFB347', to: '#FF7A00' }, // amber
  { from: '#FFD24A', to: '#E89A00' }, // gold
  { from: '#A8D85B', to: '#5DA02E' }, // lime
  { from: '#4FCC95', to: '#1AA86A' }, // emerald
  { from: '#5DD4C2', to: '#1FA89A' }, // teal
  { from: '#62C3F0', to: '#1E8FD9' }, // cyan
  { from: '#5C9AF0', to: '#2A6FD9' }, // azure
  { from: '#7E8FE8', to: '#4F62D6' }, // indigo
  { from: '#9682F0', to: '#6A4FD9' }, // violet
  { from: '#C26FE0', to: '#9933C2' }, // orchid
  { from: '#FF6F9E', to: '#E83A78' }, // pink
  { from: '#FF7A6F', to: '#E04848' }, // red
  { from: '#D9A87A', to: '#A87440' }, // bronze
  { from: '#7DB89E', to: '#3E8068' }, // sage
  { from: '#A89AB8', to: '#6F5E85' }, // mauve
];

function autoTone(name: string): Exclude<Tone, 'auto' | 'gradient'> {
  const tones: Array<Exclude<Tone, 'auto' | 'gradient'>> = ['lime', 'blue', 'dark', 'muted'];
  return tones[hashString(name) % tones.length];
}

function gradientForName(name: string): { from: string; to: string } {
  return GRADIENTS[hashString(name) % GRADIENTS.length];
}

function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
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
  const initials = initialsFromName(name);

  if (tone === 'gradient') {
    const { from, to } = gradientForName(name);
    const h = hashString(name);
    // Independent hash dimensions drive each visual axis so even when two names land
    // on the same gradient pair, the orientation + arc placement stays distinct.
    const gradientAngle = (h % 8) * 45; // 0,45,90,...,315
    const arcRotation = ((h >> 4) % 360);
    const sweep = 90 + ((h >> 8) % 8) * 15; // 90°–195°
    const offset = 0.10 + ((h >> 12) % 5) * 0.05; // 0.10–0.30 inset
    const arcStyle = (h >> 16) % 3; // single | double | dotted
    const radius = 50 - offset * 50;
    const start = polar(50, 50, radius, -sweep / 2);
    const end = polar(50, 50, radius, sweep / 2);
    const arcPath = `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;

    return (
      <span
        role="img"
        aria-label={name}
        style={{
          width: size,
          height: size,
          backgroundImage: `linear-gradient(${gradientAngle}deg, ${from} 0%, ${to} 100%)`,
        }}
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-ink ring-1 ring-white/60 shadow-softer',
          sizeToText[size],
          className,
        )}
      >
        {/* Subtle top-left highlight */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            backgroundImage:
              'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0 35%, transparent 55%)',
          }}
        />
        {/* Per-name decorative arc */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full"
          style={{ transform: `rotate(${arcRotation}deg)` }}
        >
          {arcStyle === 0 && (
            <path
              d={arcPath}
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          )}
          {arcStyle === 1 && (
            <>
              <path
                d={arcPath}
                fill="none"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <path
                d={arcPath}
                fill="none"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={2}
                strokeLinecap="round"
                transform="translate(0, 6)"
              />
            </>
          )}
          {arcStyle === 2 && (
            <path
              d={arcPath}
              fill="none"
              stroke="rgba(255,255,255,0.75)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray="1 5"
            />
          )}
        </svg>
        <span className="relative">{initials}</span>
      </span>
    );
  }

  const resolved: Exclude<Tone, 'auto' | 'gradient'> = tone === 'auto' ? autoTone(name) : tone;
  return (
    <span
      role="img"
      aria-label={name}
      style={{ width: size, height: size }}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold',
        flatToneClasses[resolved],
        sizeToText[size],
        className,
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
