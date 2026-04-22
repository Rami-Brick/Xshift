# IconButton

Round white icon button with a soft drop shadow — used for header actions (back, bell, overflow) and floating controls.

## Props
- `icon: LucideIcon` (required)
- `label: string` (required — used for `aria-label`)
- `size?: 'sm' | 'md' | 'lg'` — default `'md'`.
- `tone?: 'surface' | 'soft' | 'ghost'` — default `'surface'` (white pill w/ shadow).

## Do
- Always provide a human-readable `label`.
- Use `surface` tone in headers over the light canvas.
- Use `soft` tone when stacked inside a card (e.g. the chevron affordance).

## Don't
- Don't nest text inside — this is icon-only by design.
- Don't remove the shadow on the `surface` tone; it's a signature cue.

## Example
```tsx
<IconButton icon={ArrowLeft} label="Back" onClick={back} />
```
