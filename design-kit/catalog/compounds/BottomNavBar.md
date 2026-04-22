# BottomNavBar

The floating dark pill nav. Inactive items render as dark-slate circles; active item is a white circle with a blue icon.

## Props
- `items: { key, icon, label }[]`
- `activeKey: string`
- `onChange?: (key) => void`
- `variant?: 'floating' | 'static'` — `'floating'` absolutely positions inside a relative parent (`MobileFrame`).

## Do
- Keep item count to 3–5. The pill needs room to breathe.
- Always render inside a `MobileFrame` (or a `relative` container) when `variant='floating'`.

## Don't
- Don't combine floating variant with a scrolling page — the nav is positioned absolutely and `MobileFrame` already handles overflow.

## Example
```tsx
<BottomNavBar
  items={[{ key: 'home', icon: Home, label: 'Home' }, ...]}
  activeKey={tab}
  onChange={setTab}
/>
```
