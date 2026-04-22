# StackedBarChart

Recharts `BarChart` with three stacked series (`annual / personal / other`) — axes hidden, thin bars, top cap rounded.

## Props
- `data: { label, annual, personal, other }[]`
- `height?: number` (default 180)
- `barSize?: number` (default 10)
- `colors?: { annual, personal, other }`

## Do
- Keep the three-series shape — it maps 1:1 to the `blue / lime / black` legend pattern used across the kit.

## Don't
- Don't add a tooltip or axis labels at mobile scale — the chart reads as a rhythm, not a precise-value plot.

## Example
```tsx
<StackedBarChart data={days} />
```
