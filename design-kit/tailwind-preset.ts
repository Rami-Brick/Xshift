import type { Config } from 'tailwindcss';
import { semantic, raw } from './tokens/colors';
import { fontFamily, fontSize, fontWeight } from './tokens/typography';
import { spacing } from './tokens/spacing';
import { radius } from './tokens/radius';
import { shadow } from './tokens/shadow';

const preset: Partial<Config> = {
  theme: {
    extend: {
      fontFamily: {
        sans: fontFamily.sans,
      },
      fontSize: fontSize as unknown as Record<string, [string, { lineHeight: string; letterSpacing?: string }]>,
      fontWeight,
      spacing,
      colors: {
        canvas: semantic.bg.canvas,
        surface: semantic.bg.surface,
        cardCanvas: semantic.bg.cardCanvas,
        navDark: semantic.bg.navDark,
        navSlate: semantic.bg.navSlate,
        ink: semantic.text.ink,
        muted: semantic.text.muted,
        mutedSoft: raw.mutedSoft,
        brand: semantic.text.brand,
        roleLime: semantic.text.roleLime,
        subtle: semantic.border.subtle,
        soft: semantic.border.soft,
        data: {
          blue: semantic.data.blue,
          lime: semantic.data.lime,
          black: semantic.data.black,
        },
        grid: {
          0: semantic.data.grid[0],
          1: semantic.data.grid[1],
          2: semantic.data.grid[2],
          3: semantic.data.grid[3],
          4: semantic.data.grid[4],
          5: semantic.data.grid[5],
          6: semantic.data.grid[6],
        },
        trend: {
          up: semantic.trend.up,
          down: semantic.trend.down,
        },
        accent: {
          star: semantic.accent.star,
        },
      },
      borderRadius: {
        xs: radius.xs,
        sm: radius.sm,
        md: radius.md,
        lg: radius.lg,
        xl: radius.xl,
        '2xl': radius['2xl'],
        '3xl': radius['3xl'],
        squircle: radius.squircle,
        pill: radius.pill,
      },
      boxShadow: {
        soft: shadow.soft,
        softer: shadow.softer,
        iconBtn: shadow.iconBtn,
        nav: shadow.nav,
      },
    },
  },
};

export default preset;
