export const raw = {
  blue600: '#1E53FF',
  lime400: '#C6F24A',
  black: '#000000',
  red500: '#EF4444',
  green500: '#22C55E',
  amber500: '#F59E0B',
  ink: '#0A0A0A',
  muted: '#6B7280',
  mutedSoft: '#9CA3AF',
  border: '#E5E7EB',
  borderSoft: '#F3F4F6',
  surface: '#FFFFFF',
  canvas: '#F7F8FA',
  cardCanvas: '#F4F5F7',
  navDark: '#111111',
  navSlate: '#2B2F36',
  onDark: '#FFFFFF',
  roleLime: '#6BAE10',
  gridScale: [
    '#1E3A8A',
    '#1E53FF',
    '#3B82F6',
    '#60A5FA',
    '#93C5FD',
    '#DBEAFE',
    '#EEF2F7',
  ] as const,
} as const;

export const semantic = {
  bg: {
    canvas: raw.canvas,
    surface: raw.surface,
    cardCanvas: raw.cardCanvas,
    navDark: raw.navDark,
    navSlate: raw.navSlate,
    chipLime: raw.lime400,
    chipDown: raw.red500,
    chipUp: raw.green500,
  },
  text: {
    ink: raw.ink,
    muted: raw.muted,
    mutedSoft: raw.mutedSoft,
    onDark: raw.onDark,
    onLime: raw.ink,
    brand: raw.blue600,
    roleLime: raw.roleLime,
    success: raw.green500,
    danger: raw.red500,
  },
  border: {
    subtle: raw.border,
    soft: raw.borderSoft,
  },
  data: {
    blue: raw.blue600,
    lime: raw.lime400,
    black: raw.black,
    grid: raw.gridScale,
  },
  trend: {
    up: raw.green500,
    down: raw.red500,
  },
  accent: {
    star: raw.amber500,
  },
} as const;

export type ColorTokens = typeof semantic;
