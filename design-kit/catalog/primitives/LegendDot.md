# LegendDot

Color dot + label + optional value — used under charts.

## Props
- `color: string` — hex or semantic token value.
- `label: string`
- `value?: string` — optional secondary value beneath (e.g. `80%`).

## Do
- Keep legends horizontal with equal spacing for the 3-color `blue/lime/black` system.

## Don't
- Don't use tokens directly as arbitrary color classes — pass the resolved value from `semantic.data.*` so charts and legends stay in sync.

## Example
```tsx
<LegendDot color={semantic.data.blue} label="Permanent" value="80%" />
```
