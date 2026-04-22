# SideNavRail

Vertical desktop nav that mirrors the `BottomNavBar`'s visual language (dark pill surface, white circle + brand-blue icon for active). Intended as the desktop replacement for the floating pill at `md` and up.

## Props
- `items: { key, icon, label }[]`
- `activeKey: string`
- `onChange?: (key) => void`
- `brand?: ReactNode` — optional logo slot at the top.

## Do
- Render inside a `md:block` / `hidden` wrapper so mobile still shows `BottomNavBar` instead.
- Keep 3–6 items. Longer lists should push items off the rail or group them.

## Don't
- Don't mix with `BottomNavBar` on the same breakpoint — they should swap, not coexist.

## Example
```tsx
<div className="hidden md:block">
  <SideNavRail items={navItems} activeKey={tab} onChange={setTab} />
</div>
<div className="md:hidden">
  <BottomNavBar items={mobileNavItems} activeKey={tab} onChange={setTab} />
</div>
```
