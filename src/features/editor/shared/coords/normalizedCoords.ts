export interface OverlayBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function isValidOverlayBounds(bounds: OverlayBounds | null | undefined): bounds is OverlayBounds {
  return Boolean(bounds && bounds.width > 0 && bounds.height > 0);
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function toPercent(value: number, size: number): number {
  if (size <= 0) {
    return 0;
  }

  return clampPercent((value / size) * 100);
}

export function toSignedPercent(value: number, size: number): number {
  if (size <= 0) {
    return 0;
  }

  return (value / size) * 100;
}

export function fromPercent(value: number, size: number): number {
  return (value / 100) * size;
}

export function isPointInBounds(point: { x: number; y: number }, bounds: OverlayBounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function clampPointToBounds(point: { x: number; y: number }, bounds: OverlayBounds) {
  return {
    x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, point.x)),
    y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, point.y)),
  };
}

export function toAbsolutePoint(bounds: OverlayBounds, normalizedX: number, normalizedY: number) {
  return {
    x: bounds.x + fromPercent(normalizedX, bounds.width),
    y: bounds.y + fromPercent(normalizedY, bounds.height),
  };
}

export function toNormalizedPoint(bounds: OverlayBounds, point: { x: number; y: number }) {
  return {
    x: toPercent(point.x - bounds.x, bounds.width),
    y: toPercent(point.y - bounds.y, bounds.height),
  };
}
