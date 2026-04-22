# Heatmap

Grid of `SquircleTile`s with row + column labels. Used for the Absenteeism view.

## Props
- `rows: number`, `cols: number`
- `cells: { row, col, bucket }[]` — `bucket` is `-1` (lime highlight) or `0..6` (grid ramp, deeper = more saturated blue).
- `xLabels?: string[]` — shown under each column.
- `yLabels?: { label, chip?, chipColor? }[]` — row labels with optional small value chip.
- `tileSize?: number` (default `34`), `n?: number` (default `5`), `gap?: number` (default `6`).

## Do
- Set one or two cells to `bucket: -1` for the lime highlight — matches the reference's single-cell accent.
- Use the blue grid ramp (`data.grid[0..6]`) as the primary scale.

## Don't
- Don't go beyond a 7×7 grid at mobile width — tiles become too small.

## Example
```tsx
<Heatmap
  rows={5} cols={5}
  cells={[{ row: 0, col: 0, bucket: 5 }, ...]}
  xLabels={['m','t','w','t','f']}
  yLabels={[{ label: '1%', chip: '1%' }, ...]}
/>
```
