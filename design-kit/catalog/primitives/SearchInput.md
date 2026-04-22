# SearchInput

Pill-shaped search input (icon variant available).

## Props
- `variant?: 'pill' | 'icon'` — `'icon'` renders a round white button-size control for compact toolbars.
- All native `<input>` props.

## Do
- Use the `icon` variant in the home toolbar row where real text entry is secondary.
- Use the `pill` variant on a dedicated search page where typing is primary.

## Example
```tsx
<SearchInput variant="icon" placeholder="Search employees" />
```
