export interface CanvasContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function isValidContentBounds(bounds: CanvasContentBounds | null | undefined): bounds is CanvasContentBounds {
  return Boolean(bounds && bounds.width > 0 && bounds.height > 0);
}

export function hasMeaningfulBoundsChange(
  previous: CanvasContentBounds | null | undefined,
  next: CanvasContentBounds,
  epsilon = 0.5,
): boolean {
  if (!previous) {
    return true;
  }

  return (
    Math.abs(previous.x - next.x) > epsilon ||
    Math.abs(previous.y - next.y) > epsilon ||
    Math.abs(previous.width - next.width) > epsilon ||
    Math.abs(previous.height - next.height) > epsilon
  );
}
