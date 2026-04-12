import type { NormalizedAnnotation } from "@/features/editor/shared/types/annotation";
import { fromPercent, toAbsolutePoint, type OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";

export function getPdfPinGeometry(annotation: NormalizedAnnotation, bounds: OverlayBounds) {
  const center = toAbsolutePoint(bounds, annotation.x, annotation.y);
  return {
    cx: center.x,
    cy: center.y,
    label: annotation.pinNumber ? String(annotation.pinNumber) : "",
  };
}

export function getPdfArrowGeometry(annotation: NormalizedAnnotation, bounds: OverlayBounds) {
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

export function getPdfRectGeometry(annotation: NormalizedAnnotation, bounds: OverlayBounds) {
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

export function getPdfPenPathGeometry(annotation: NormalizedAnnotation, bounds: OverlayBounds) {
  if (!annotation.pathPoints || annotation.pathPoints.length === 0) {
    return "";
  }

  const absolutePoints = annotation.pathPoints.map((point) =>
    toAbsolutePoint(bounds, point.x, point.y)
  );

  if (absolutePoints.length === 1) {
    return `M ${absolutePoints[0].x} ${absolutePoints[0].y}`;
  }

  const [first, ...rest] = absolutePoints;
  return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(" ")}`;
}

export function getPdfAnnotationAnchor(annotation: NormalizedAnnotation, bounds: OverlayBounds) {
  const shapeType = annotation.shapeType as string;

  if (shapeType === "pin") {
    const pin = getPdfPinGeometry(annotation, bounds);
    return { x: pin.cx, y: pin.cy };
  }

  if (shapeType === "arrow") {
    const arrow = getPdfArrowGeometry(annotation, bounds);
    return { x: arrow.x1, y: arrow.y1 };
  }

  if (shapeType === "pen" && annotation.pathPoints && annotation.pathPoints.length > 0) {
    const firstPoint = toAbsolutePoint(bounds, annotation.pathPoints[0].x, annotation.pathPoints[0].y);
    return { x: firstPoint.x, y: firstPoint.y };
  }

  const rect = getPdfRectGeometry(annotation, bounds);
  return { x: rect.x, y: rect.y };
}
