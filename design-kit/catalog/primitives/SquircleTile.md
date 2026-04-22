# SquircleTile

The signature tile of the kit — an SVG superellipse. Used inside `Heatmap` and available for any grid-of-colored-tiles layout.

## Props
- `size?: number` — default `42`.
- `fill: string` — the tile color.
- `n?: number` — superellipse exponent. Default `5` (softer than iOS n=4).
- `title?: string` — optional accessibility label.

## Do
- Use this primitive instead of `rounded-md` whenever a large color tile is the main visual element. The superellipse reads smoother than CSS border-radius at these sizes.

## Don't
- Don't scale `n` below 2 (the shape collapses to a plus) or above 8 (becomes visually a square). 4–6 is the safe range.

## Example
```tsx
<SquircleTile size={34} fill={semantic.data.grid[1]} n={5} />
```
