# Chip

Small rounded pill used for trend deltas and inline tags.

## Props
- `variant?: 'trendUp' | 'trendDown' | 'neutral' | 'lime' | 'dark' | 'brand'`
- `delta?: number` — when provided, formats as `+4.7%` or `−1.2%` automatically. Combine with `trendUp`/`trendDown`.
- `children?: ReactNode` — free content for non-trend variants.

## Do
- Use the `delta` prop for trend chips — never hand-prepend `+` / `-`; the formatter uses the `−` minus glyph for typographic parity.

## Don't
- Don't use chips as buttons. They are display-only; wrap in a `Button` if tappable.

## Example
```tsx
<Chip variant="trendUp" delta={4.7} />
<Chip variant="trendDown" delta={-1.2} />
<Chip variant="lime">PRO</Chip>
```
