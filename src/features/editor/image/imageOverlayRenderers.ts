import type { NormalizedAnnotation } from "@/features/editor/shared/types/annotation";
import { fromPercent, toAbsolutePoint, type OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";

export function getPinGeometry(annotation: NormalizedAnnotation, bounds: OverlayBounds) {
  const center = toAbsolutePoint(bounds, annotation.x, annotation.y);
  return {
    cx: center.x,
    cy: center.y,
    label: annotation.pinNumber ? String(annotation.pinNumber) : "",
  };
}

export function getArrowGeometry(annotation: NormalizedAnnotation, bounds: OverlayBounds) {
  const start = toAbsolutePoint(bounds, annotation.x, annotation.y);
  const width = fromPercent(annotation.width ?? 0, bounds.width);
  const height = fromPercent(annotation.height ?? 0, bounds.height);

  return {
    x1: start.x,
    y1: start.y,
    x2: start.x + width,
    y2: start.y + height,
  };
}

export function getRectGeometry(annotation: NormalizedAnnotation, bounds: OverlayBounds) {
  const center = toAbsolutePoint(bounds, annotation.x, annotation.y);
  const widthPercent = Math.max(annotation.width ?? 1, 1);
  const heightPercent = Math.max(annotation.height ?? 1, 1);
  const width = fromPercent(widthPercent, bounds.width);
  const height = fromPercent(heightPercent, bounds.height);

  return {
    x: center.x - width / 2,
    y: center.y - height / 2,
    width,
    height,
  };
}
