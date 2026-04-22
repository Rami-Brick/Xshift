# Badge

Tiny uppercase pill for status/segment tags like `PRO`.

## Props
- `tone?: 'lime' | 'muted' | 'brand' | 'dark'` — default `'lime'`.
- `children: ReactNode`

## Do
- Keep to one or two words.
- Pair with `text-muted` eyebrow text rather than a second heading.

## Don't
- Don't use for trend deltas — that's `Chip`.

## Example
```tsx
<Badge tone="lime">PRO</Badge>
```
