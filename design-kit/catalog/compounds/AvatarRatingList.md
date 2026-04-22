# AvatarRatingList

Vertical stack of `AvatarRatingRow` with optional dividers.

## Props
- `rows: AvatarRatingRowProps[]`
- `divider?: boolean`

## Do
- Keep lists ≤ 10 rows at mobile width — longer lists should paginate or sheet-scroll.

## Example
```tsx
<AvatarRatingList rows={[...]} />
```
