# GaugeLegend

Horizontal legend row under a `DonutGauge`: color dot, label, value underneath.

## Props
- `items: { color, label, value? }[]`

## Do
- Mirror the order of `DonutGauge` segments.

## Example
```tsx
<GaugeLegend items={[
  { color: semantic.data.blue, label: 'Permanent', value: '80%' },
  { color: semantic.data.lime, label: 'Contract',  value: '11.5%' },
  { color: semantic.data.black, label: 'Part-Time', value: '8.5%' },
]} />
```
