# KpiCard

The Head Count / HR to employee card: title, big numeral, round icon badge, trend chip.

## Props
- `title: string`
- `value: string | number`
- `icon: LucideIcon`
- `iconBg?: 'blue' | 'black' | 'dark'` — default `'blue'`.
- `trend?: { dir: 'up' | 'down'; pct: number }`
- `subLabel?: string`

## Do
- Pair KpiCards in a 2-column grid for density; single-column only when space is tight.

## Don't
- Don't overload the subLabel — keep it ≤ 3 words.

## Example
```tsx
<KpiCard title="Head Count" value={327} icon={User} iconBg="blue"
         trend={{ dir: 'up', pct: 4.7 }} subLabel="New Hires" />
```
