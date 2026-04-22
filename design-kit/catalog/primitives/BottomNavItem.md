# BottomNavItem

A single child of `BottomNavBar`. Active state paints a white circle with a blue icon on the dark pill — the floating-nav signature.

## Props
- `icon: LucideIcon`
- `label: string` (used for `aria-label`)
- `active?: boolean`
- `onClick?: () => void`

## Do
- Always render via `BottomNavBar` — the nav owns layout + active-key logic.

## Don't
- Don't use standalone outside the bar.

## Example
```tsx
<BottomNavItem icon={Home} label="Home" active />
```
