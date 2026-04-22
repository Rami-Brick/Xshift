# Card

The kit's base container — rounded 20-px surface with a soft shadow. Most compounds (`KpiCard`, `ChartCard`) are thin wrappers over this.

## Props
- `tone?: 'surface' | 'canvas'` — `'surface'` (pure white) or `'canvas'` (faint grey).
- `padding?: 'sm' | 'md' | 'lg'` — `p-3 / p-4 / p-5`.
- `withChevron?: boolean` — renders a top-right circular chevron affordance.
- `chevronLabel?: string`, `onChevronClick?: () => void`
- `header?: ReactNode` — optional header slot.

## Do
- Prefer `Card` over ad-hoc `<div>` wrappers so spacing + shadow stay consistent.
- Use the `withChevron` affordance when the card is tappable into a detail view.

## Don't
- Don't stack shadows: nested cards should use `tone="canvas"` and no extra shadow.

## Example
```tsx
<Card withChevron onChevronClick={openDetail}>
  <p className="text-small text-muted">Employee</p>
  <p className="text-cardTitle font-semibold">Tracker</p>
</Card>
```
