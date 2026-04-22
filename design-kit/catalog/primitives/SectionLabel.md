# SectionLabel

Small muted eyebrow that sits above a card title (e.g. "Performance Evaluation Results" above "Metrics Rating").

## Props
- `tone?: 'muted' | 'ink'` — default `'muted'`.
- `children: ReactNode`

## Do
- Keep to a single line.
- Pair 1:1 with a following section title.

## Don't
- Don't use for body copy.

## Example
```tsx
<SectionLabel>Top Satisfaction Score</SectionLabel>
<h3 className="text-section font-bold">Top 5 Rating</h3>
```
