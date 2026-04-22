# SelectPill

Rounded pill dropdown used for quick scope filters (e.g. Department, Date range).

## Props
- `value: string` — displayed value (also the select value when `options` is provided).
- `options?: string[]` — when provided, renders a real `<select>`.
- `onChange?: (value: string) => void`
- `leftAdornment?: ReactNode` — optional icon.

## Do
- Keep option labels short (single word where possible).

## Don't
- Don't use for multi-select or search-within-select — escalate to a popover/sheet in those cases.

## Example
```tsx
<SelectPill value={dept} options={['All', 'Engineering', 'HR']} onChange={setDept} />
```
