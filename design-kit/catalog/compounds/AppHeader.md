# AppHeader

Two variants:
- `dashboard` — eyebrow + optional badge + title on the left, bell + avatar on the right. Used on `HomeScreen`.
- `detail` — back IconButton, centered title, overflow IconButton. Used on `RatingScreen` and `ReportScreen`.

## Dashboard props
`{ variant: 'dashboard', eyebrow, eyebrowBadge?, title, onBell?, avatarName }`

## Detail props
`{ variant: 'detail', title, onBack?, onMenu? }`

## Do
- Always pass a user's name (even a placeholder) for the dashboard avatar — the primitive needs it for initials.

## Don't
- Don't layer custom padding — the header owns its own edge gutters.

## Example
```tsx
<AppHeader variant="detail" title="Employee report" onBack={back} />
```
