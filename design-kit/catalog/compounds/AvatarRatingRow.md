# AvatarRatingRow

A single list row: avatar + name + role + star rating + optional status tag.

## Props
- `name: string`
- `role: string`
- `roleTone?: 'lime' | 'brand' | 'muted'` — use `lime` or `brand` to match the reference's alternating colors.
- `score: number`
- `tag?: 'Excellent' | 'Good' | 'Fair' | 'Improved'`
- `avatarTone?` — passed through to `InitialAvatar`.

## Accessibility note
The `lime` role tone (used for contrast with the brand blue) fails WCAG AA against white. This is intentional to match the close-clone reference; production apps should switch `roleTone` to `'muted'` for readability-critical contexts.

## Example
```tsx
<AvatarRatingRow name="Elisabeth Kim Tjow" role="HR Generalist"
                 roleTone="lime" score={7.8} tag="Good" avatarTone="lime" />
```
