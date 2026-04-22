# CLAUDE.md — Workforce HR Design Kit

Rules for future agents editing this kit.

## Architecture

- **Tokens are the source of truth.** Don't hardcode hex colors, font sizes, or radii in components — pull from `./tokens/*` (or the semantic Tailwind classes the preset exposes: `bg-canvas`, `text-ink`, `rounded-xl`, `rounded-squircle`, `bg-data-blue`, etc.).
- **Primitives** own foundational shapes and have no compound-level logic.
- **Compounds** assemble primitives into reusable patterns (`KpiCard`, `ChartCard`, `DonutGauge`...). They should not inline styling that belongs in a primitive — if you find yourself writing the same rounded-pill + shadow in two compounds, extract a primitive.
- **Examples** (`examples/*Screen.tsx`) are the only place that composes compounds into page layouts. Page-level padding, grids, and conditional routing live there, not inside compounds.

## When adding a new component

1. Start with a **catalog doc** at `catalog/primitives/<Name>.md` or `catalog/compounds/<Name>.md` following the existing template (Purpose / Props / Do / Don't / Example).
2. Implement using tokens + existing primitives. Reach for raw Tailwind utilities last.
3. Re-export from `design-kit/index.ts`.
4. If it has a type-level signature worth showing, export the props type too.
5. Run `npm run typecheck` and `npm run build` from `playground/`.

## Charts

- `DonutGauge` is **pure SVG** — don't re-implement in Recharts. The current implementation keeps rounded caps + gaps consistent across Chromium/Firefox/WebKit.
- `StackedBarChart` is Recharts-based but hides axes by default. If you need axes or tooltips, add them behind props — don't change the default silhouette.
- The color scheme for charts is always `data.blue / data.lime / data.black`. Never invent a fourth primary data color; extend the `data.grid` ramp instead.

## Visual invariants

- Card radius is **20px** (`rounded-xl`). Don't use `rounded-2xl` or `rounded-lg` on cards.
- Heatmap tiles are **squircles with n=5**, size ~34px, gap 6px. Don't replace with `rounded-md` tiles — the superellipse is part of the brand.
- Bottom nav is always a **floating dark pill** (`variant="floating"`) inside a relative parent (`MobileFrame`). Don't pin to the bottom of the viewport directly.
- Trend chips always use `−` (U+2212) for negative values via the `formatDelta` util — never a hyphen.

## Accessibility

- Icon-only buttons must have an `aria-label` (the `IconButton` primitive requires `label`).
- The lime role text in `AvatarRatingRow` is intentionally low-contrast for close-clone fidelity. Expose higher-contrast tones behind props rather than changing the default.

## Don'ts

- Don't add a new font without updating `tokens/typography.ts` and the `@import` in `playground/src/index.css`.
- Don't export helpers from random files — everything is re-exported through `design-kit/index.ts`.
- Don't introduce image URLs into `InitialAvatar`. It is by design URL-free.
- Don't wrap `DonutGauge`'s `centerValue` inside the SVG — the center is an absolutely-positioned div so we get crisp font rendering.
