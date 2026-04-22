export const fontFamily = {
  sans: ['"DM Sans"', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
};

export const fontSize = {
  caption: ['11px', { lineHeight: '14px', letterSpacing: '-0.005em' }],
  small: ['12px', { lineHeight: '16px', letterSpacing: '-0.005em' }],
  body: ['14px', { lineHeight: '20px', letterSpacing: '-0.005em' }],
  cardTitle: ['18px', { lineHeight: '22px', letterSpacing: '-0.01em' }],
  section: ['20px', { lineHeight: '24px', letterSpacing: '-0.015em' }],
  display: ['32px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
  displayLg: ['40px', { lineHeight: '44px', letterSpacing: '-0.025em' }],
  displayXl: ['48px', { lineHeight: '52px', letterSpacing: '-0.03em' }],
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;
