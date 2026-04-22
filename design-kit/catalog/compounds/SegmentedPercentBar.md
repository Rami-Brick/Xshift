# SegmentedPercentBar

Butted multi-segment bar with only the outer left/right corners rounded. Percentages float above each segment.

## Props
- `segments: { pct, color, label? }[]`
- `height?: number` — default `10`.
- `showLabels?: boolean` — default `true`.

## Do
- Use 3–4 segments. The 4-segment pattern (Excellent / Good / Fair / Improved) is the kit's canonical use.
- Use `semantic.border.subtle` for the "Improved" / empty trailing segment so it reads as a track.

## Don't
- Don't add gaps between segments — the visual depends on the continuous pill silhouette.

## Example
```tsx
<SegmentedPercentBar segments={[
  { pct: 38, color: semantic.data.blue,  label: '38%' },
  { pct: 25, color: semantic.data.lime,  label: '25%' },
  { pct: 18, color: semantic.data.black, label: '18%' },
  { pct: 8,  color: semantic.border.subtle, label: '8%' },
]} />
```
