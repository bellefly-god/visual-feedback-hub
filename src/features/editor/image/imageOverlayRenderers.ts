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

export function getArrowHeadGeometry(
  arrow: { x1: number; y1: number; x2: number; y2: number },
  size = 9,
) {
  const dx = arrow.x2 - arrow.x1;
  const dy = arrow.y2 - arrow.y1;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / length;
  const uy = dy / length;

  const baseX = arrow.x2 - ux * size;
  const baseY = arrow.y2 - uy * size;
  const perpX = -uy;
  const perpY = ux;
  const wing = size * 0.55;

  return {
    points: `${arrow.x2},${arrow.y2} ${baseX + perpX * wing},${baseY + perpY * wing} ${baseX - perpX * wing},${baseY - perpY * wing}`,
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

export function getHighlightGeometry(annotation: NormalizedAnnotation, bounds: OverlayBounds) {
  return getRectGeometry(annotation, bounds);
}

export function getPenPathGeometry(annotation: NormalizedAnnotation, bounds: OverlayBounds) {
  const pointList = annotation.pathPoints ?? [];
  const absolutePoints = pointList
    .map((point) => toAbsolutePoint(bounds, point.x, point.y))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));

  if (absolutePoints.length >= 2) {
    const [first, ...rest] = absolutePoints;
    return {
      d: `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(" ")}`,
    };
  }

  const start = toAbsolutePoint(bounds, annotation.x, annotation.y);
  const width = fromPercent(annotation.width ?? 0, bounds.width);
  const height = fromPercent(annotation.height ?? 0, bounds.height);
  const fallbackDx = Math.abs(width) < 1 ? 12 : width;
  const end = {
    x: start.x + fallbackDx,
    y: start.y + height,
  };

  return {
    d: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
  };
}

export function getAnnotationAnchor(annotation: NormalizedAnnotation, bounds: OverlayBounds) {
  const shapeType = annotation.shapeType as string;

  if (shapeType === "pin") {
    const pin = getPinGeometry(annotation, bounds);
    return { x: pin.cx, y: pin.cy };
  }

  if (shapeType === "arrow") {
    const arrow = getArrowGeometry(annotation, bounds);
    return { x: arrow.x1, y: arrow.y1 };
  }

  if (shapeType === "pen") {
    const pen = getPenPathGeometry(annotation, bounds);
    const match = pen.d.match(/^M\s+([0-9.-]+)\s+([0-9.-]+)/);
    if (match) {
      return { x: Number(match[1]), y: Number(match[2]) };
    }
  }

  const rect = getRectGeometry(annotation, bounds);
  return { x: rect.x, y: rect.y };
}
