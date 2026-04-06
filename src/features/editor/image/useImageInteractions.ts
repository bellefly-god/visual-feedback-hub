import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CreateAnnotationPayload, DragToolMode, ToolMode } from "@/features/editor/shared/types/annotation";
import {
  clampPointToBounds,
  isPointInBounds,
  toNormalizedPoint,
  toPercent,
  toSignedPercent,
  type OverlayBounds,
} from "@/features/editor/shared/coords/normalizedCoords";

type DragPreview = {
  toolMode: DragToolMode;
  color: string;
  start: { x: number; y: number };
  current: { x: number; y: number };
};

interface UseImageInteractionsParams {
  mode: "editor" | "review";
  toolMode: ToolMode;
  bounds: OverlayBounds | null;
  activeColor: string;
  interactionScale?: number;
  onSelectAnnotation: (annotationId: string | null) => void;
  onCreateAnnotation?: (payload: CreateAnnotationPayload) => void;
}

function isDragToolMode(mode: ToolMode): mode is DragToolMode {
  return mode === "arrow" || mode === "rectangle" || mode === "highlight";
}

export function useImageInteractions({
  mode,
  toolMode,
  bounds,
  activeColor,
  interactionScale = 1,
  onSelectAnnotation,
  onCreateAnnotation,
}: UseImageInteractionsParams) {
  const dragRef = useRef<DragPreview | null>(null);
  const [preview, setPreview] = useState<DragPreview | null>(null);

  useEffect(() => {
    dragRef.current = null;
    setPreview(null);
  }, [activeColor, mode, toolMode, bounds?.x, bounds?.y, bounds?.width, bounds?.height]);

  const safeScale = interactionScale > 0 ? interactionScale : 1;

  const readPoint = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left) / safeScale,
        y: (event.clientY - rect.top) / safeScale,
      };
    },
    [safeScale],
  );

  const commitDragAnnotation = useCallback(
    (session: DragPreview, point: { x: number; y: number }) => {
      if (!bounds || !onCreateAnnotation) {
        return;
      }

      const clampedPoint = clampPointToBounds(point, bounds);

      if (session.toolMode === "arrow") {
        let width = toSignedPercent(clampedPoint.x - session.start.x, bounds.width);
        let height = toSignedPercent(clampedPoint.y - session.start.y, bounds.height);
        const normalizedStart = toNormalizedPoint(bounds, session.start);

        if (Math.abs(width) < 0.8 && Math.abs(height) < 0.8) {
          width = 8;
          height = -6;
        }

        onCreateAnnotation({
          shapeType: "arrow",
          x: normalizedStart.x,
          y: normalizedStart.y,
          width,
          height,
          color: session.color,
        });
        return;
      }

      const left = Math.min(session.start.x, clampedPoint.x);
      const right = Math.max(session.start.x, clampedPoint.x);
      const top = Math.min(session.start.y, clampedPoint.y);
      const bottom = Math.max(session.start.y, clampedPoint.y);

      onCreateAnnotation({
        shapeType: session.toolMode,
        x: toPercent((left + right) / 2 - bounds.x, bounds.width),
        y: toPercent((top + bottom) / 2 - bounds.y, bounds.height),
        width: Math.max(toPercent(right - left, bounds.width), 1),
        height: Math.max(toPercent(bottom - top, bounds.height), 1),
        color: session.color,
      });
    },
    [bounds, onCreateAnnotation],
  );

  const handlers = useMemo(() => {
    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      if (!bounds) {
        return;
      }

      const point = readPoint(event);

      if (!isPointInBounds(point, bounds)) {
        if (toolMode === "select" || mode === "review") {
          onSelectAnnotation(null);
        }
        return;
      }

      const clampedPoint = clampPointToBounds(point, bounds);

      if (mode === "review") {
        onSelectAnnotation(null);
        return;
      }

      if (toolMode === "select") {
        onSelectAnnotation(null);
        return;
      }

      if (toolMode === "pin") {
        const normalizedPoint = toNormalizedPoint(bounds, clampedPoint);
        onCreateAnnotation?.({
          shapeType: "pin",
          x: normalizedPoint.x,
          y: normalizedPoint.y,
          color: activeColor,
        });
        return;
      }

      if (!isDragToolMode(toolMode)) {
        return;
      }

      const session: DragPreview = {
        toolMode,
        color: activeColor,
        start: clampedPoint,
        current: clampedPoint,
      };

      dragRef.current = session;
      setPreview(session);
      event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
      const session = dragRef.current;
      if (!session || !bounds) {
        return;
      }

      const point = readPoint(event);
      const clampedPoint = clampPointToBounds(point, bounds);
      const next = {
        ...session,
        current: clampedPoint,
      };

      dragRef.current = next;
      setPreview(next);
    };

    const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
      const session = dragRef.current;
      if (!session) {
        return;
      }

      const point = readPoint(event);
      commitDragAnnotation(session, point);
      dragRef.current = null;
      setPreview(null);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    };

    const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
      dragRef.current = null;
      setPreview(null);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    };

    return {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    };
  }, [activeColor, bounds, commitDragAnnotation, mode, onCreateAnnotation, onSelectAnnotation, readPoint, toolMode]);

  return {
    preview,
    handlers,
  };
}
