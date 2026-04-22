# Button

Round-pill button used for primary actions, ghost links, and dark "confirm" actions on light surfaces.

## Props
- `variant?: 'primary' | 'ghost' | 'dark'` — default `'primary'`.
- `size?: 'sm' | 'md' | 'lg'` — default `'md'`.
- `leftIcon?`, `rightIcon?` — optional Lucide icon nodes.
- All native `<button>` attrs.

## Do
- Use `primary` on light card surfaces for the main call-to-action.
- Use `ghost` inside headers or on dense rows where the button should not visually compete with data.
- Keep labels short (verb-first): "Save", "Apply".

## Don't
- Don't use `Button` for icon-only controls — use `IconButton`.
- Don't mix multiple primary buttons in the same card.

## Example
```tsx
<Button leftIcon={<Plus size={16} />}>Add employee</Button>
```
