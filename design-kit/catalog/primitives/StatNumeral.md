# StatNumeral

Display numeral used for big stats (327, 800, 7.8).

## Props
- `size?: 'md' | 'lg' | 'xl'` — 32 / 40 / 48 px.
- `children: ReactNode`

## Do
- Always wrap numeric stats so `tabular-nums` + negative tracking are applied uniformly.

## Don't
- Don't use for non-numeric display text — use a heading class instead.

## Example
```tsx
<StatNumeral size="lg">800</StatNumeral>
```
