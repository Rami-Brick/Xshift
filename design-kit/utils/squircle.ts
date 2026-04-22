/**
 * Superellipse path generator (squircle).
 * Used for the signature heatmap tile in report.png — n≈5 gives a softer,
 * more "pillowy" silhouette than the iOS-standard n=4.
 *
 * Formula: |x/a|^n + |y/b|^n = 1
 * Parametric: x = a · sign(cos t) · |cos t|^(2/n), y = b · sign(sin t) · |sin t|^(2/n)
 */
export function squirclePath(size: number, n: number = 5, steps: number = 64): string {
  const a = size / 2;
  const b = size / 2;
  const cx = size / 2;
  const cy = size / 2;
  const exp = 2 / n;

  const points: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    const x = cx + a * Math.sign(cosT) * Math.pow(Math.abs(cosT), exp);
    const y = cy + b * Math.sign(sinT) * Math.pow(Math.abs(sinT), exp);
    points.push(`${x.toFixed(3)},${y.toFixed(3)}`);
  }

  return `M${points[0]} L${points.slice(1).join(' L')} Z`;
}
