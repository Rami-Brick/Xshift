# InitialAvatar

Local, URL-free avatar — renders two-letter initials on a tone-mapped background with optional decorative shapes so rows visually approach photo avatars without the dependency.

## Props
- `name: string` — used for initials + deterministic auto-tone.
- `size?: 32 | 36 | 40 | 44 | 48 | 56 | 64` — default `40`.
- `tone?: 'auto' | 'lime' | 'blue' | 'dark' | 'muted'` — default `'auto'` (hashed from `name`).
- `decorate?: boolean` — default `true`; paints a subtle radial detail behind the initials.

## Do
- Let `tone="auto"` keep lists visually varied.
- Use a fixed `tone` when you need to signal status (e.g. lime for "Good").

## Don't
- Don't embed photos here — by project rule this primitive never takes a URL. If you need real photos, build a separate `PhotoAvatar`.

## Example
```tsx
<InitialAvatar name="Elisabeth Kim Tjow" size={44} tone="lime" />
```
