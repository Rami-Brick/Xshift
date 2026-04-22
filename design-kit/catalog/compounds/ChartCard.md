# ChartCard

`Card` + header region (eyebrow + title + chevron affordance) + body slot. The canonical wrapper for every chart in the kit.

## Props
- `eyebrow?: string`
- `title: string`
- `affordance?: boolean`, `onAffordanceClick?: () => void`
- `headerRight?: ReactNode` — optional action slot when you don't want the chevron.
- `tone?: 'surface' | 'canvas'`, `padding?: 'sm' | 'md' | 'lg'`

## Do
- Use for every chart-bearing card so spacing + header rhythm stays consistent.

## Don't
- Don't pass raw `<Card>` siblings into a layout and then re-implement the header — use this.

## Example
```tsx
<ChartCard eyebrow="Performance Evaluation Results" title="Metrics Rating" affordance>
  {/* chart */}
</ChartCard>
```
