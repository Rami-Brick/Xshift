# DonutGauge

A 3/4-arc donut chart with rounded caps and gaps. Implemented as pure SVG (not Recharts) so caps and gaps render consistently across browsers.

## Props
- `segments: { name, value, color }[]` — arbitrary count; values don't need to sum to 100.
- `centerValue: string | number`, `centerLabel?: string`
- `size?: number` (default 220), `strokeWidth?: number` (default 28)
- `startAngle?: number` (default `-210`, lower-left), `endAngle?: number` (default `30`, lower-right). Sweep is clockwise; total 240° by default.
- `gapDegrees?: number` (default 4).

## Do
- Keep segment count ≤ 4. Beyond that the cap-rounding becomes noisy.
- Use `semantic.data.*` values for segment colors so the legend can match.

## Don't
- Don't reduce `strokeWidth` below ~16 — the rounded caps start to look pinched.

## Example
```tsx
<DonutGauge
  segments={[
    { name: 'Permanent', value: 80,  color: semantic.data.blue },
    { name: 'Contract',  value: 11.5, color: semantic.data.lime },
    { name: 'Part-Time', value: 8.5,  color: semantic.data.black },
  ]}
  centerValue={800}
  centerLabel="Total Employees"
/>
```
