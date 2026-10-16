export function gradeThrow(points, target, ringRadius) {
  if (points.length < 2) return { hit: false, grade: "miss", curve: false };
  const a = points[0],
    b = points.at(-1),
    dy = a.y - b.y,
    dx = b.x - a.x;
  if (dy < 45) return { hit: false, grade: "miss", curve: false };
  const projectedX = a.x + dx * ((a.y - target.y) / dy);
  const error = Math.abs(projectedX - target.x);
  const hit = error < target.radius;
  const ratio = ringRadius / target.radius;
  return {
    hit,
    grade: !hit
      ? "miss"
      : error < ringRadius * 0.65
        ? ratio < 0.36
          ? "excellent"
          : ratio < 0.6
            ? "great"
            : "nice"
        : "normal",
    curve: points.some((p) => Math.abs(p.x - a.x) > 80) && Math.abs(dx) < 40,
  };
}
