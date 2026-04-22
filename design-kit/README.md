# Workforce HR — Design Kit

A reusable React + TypeScript + Tailwind v3 design kit distilled from three mobile HR-app screenshots. Ships tokens, primitives, compounds, a Tailwind preset, and a working playground that recreates the Home, Rating, and Report screens.

## Visual language

- **Palette** — electric blue `#1E53FF`, lime `#C6F24A`, pure black used as a third data color.
- **Surface** — light canvas `#F7F8FA`, white cards with soft 20-px rounded corners and a very soft shadow.
- **Type** — DM Sans throughout, oversized display numerals with negative tracking.
- **Signature shapes** — floating dark pill nav with white active circle, squircle heatmap (superellipse `n≈5`), 3/4-arc donut with rounded caps + gaps, 4-segment butted progress bar, round icon badges.

## Install

Within this repo, the kit is consumed directly from `../design-kit`. The `playground/` Vite app is already wired up; from the repo root:

```bash
npm install
cd playground
npm run dev
```

Open http://localhost:5173 and tap the bottom pill nav to switch between the three screens.

## Using the kit in another app

1. Copy `design-kit/` into your repo (or publish it as a local workspace package).
2. Install `clsx`, `tailwind-merge`, `tailwindcss`, `lucide-react`, `recharts`.
3. In your `tailwind.config.ts`, extend the preset and include the kit paths in `content`:

```ts
import preset from './design-kit/tailwind-preset';

export default {
  presets: [preset],
  content: ['./src/**/*.{ts,tsx}', './design-kit/**/*.{ts,tsx}'],
};
```

4. Load DM Sans once in your global stylesheet (see `playground/src/index.css`).
5. Import components:

```tsx
import { KpiCard, DonutGauge, BottomNavBar, MobileFrame } from './design-kit';
```

## Structure

```
design-kit/
  tokens/            — color, type, spacing, radius, shadow
  tailwind-preset.ts — extends Tailwind with semantic tokens
  utils/             — cn (clsx + tw-merge), squircle path generator, formatters
  primitives/        — 13 base components
  compounds/         — 11 assembled components
  examples/          — MobileFrame + 3 screens + App tab router
  catalog/           — one .md per primitive/compound (purpose, props, do/don't)
```

## Tokens (semantic names)

| Token                       | Value       | Use                                 |
|-----------------------------|-------------|-------------------------------------|
| `bg.canvas`                 | `#F7F8FA`   | App background                      |
| `bg.surface`                | `#FFFFFF`   | Card background                     |
| `bg.navDark` / `.navSlate`  | `#111` / `#2B2F36` | Bottom nav pill                |
| `text.ink` / `.muted`       | `#0A0A0A` / `#6B7280` | Body / secondary            |
| `data.blue` / `.lime` / `.black` | `#1E53FF` / `#C6F24A` / `#000` | Chart primaries |
| `data.grid[0..6]`           | deep blue → near-white | Heatmap ramp               |
| `trend.up` / `.down`        | `#22C55E` / `#EF4444` | Delta chips                 |
| `accent.star`               | `#F59E0B`   | Rating star                         |

## Screens

- **HomeScreen** — header + search/filter + 2 KpiCards + DonutGauge card.
- **RatingScreen** — detail header + Metrics Rating card (star + SegmentedPercentBar + legend) + Top 5 Rating list.
- **ReportScreen** — detail header + Absenteeism card (Heatmap + stacked BarChart + legend).

## Accessibility notes

The lime role text color (e.g. "HR Generalist" in `AvatarRatingRow`) fails WCAG AA against white. This is intentional for close-clone fidelity — for production use, pass `roleTone="muted"` to the row.

## Charts

`DonutGauge` is implemented as pure SVG (not Recharts) because `cornerRadius` + `paddingAngle` combinations clip inconsistently. `StackedBarChart` uses Recharts. Both wrap their deps behind the kit's prop contracts so you can swap renderers without touching screens.

## Playground verification

```bash
cd playground
npm run typecheck   # tsc --noEmit
npm run build       # vite build + typecheck
npm run dev         # http://localhost:5173
```
