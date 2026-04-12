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

type PenPreview = {
  toolMode: "pen";
  color: string;
  points: Array<{ x: number; y: number }>;
};

type InteractionSession = DragPreview | PenPreview;

interface UseImageInteractionsParams {
  mode: "editor" | "review";
  toolMode: ToolMode;
  bounds: OverlayBounds | null;
  activeColor: string;
  interactionScale?: number;
  annotations?: NormalizedAnnotation[];
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
  annotations = [],
  onSelectAnnotation,
  onCreateAnnotation,
}: UseImageInteractionsParams) {
  const sessionRef = useRef<InteractionSession | null>(null);
  const [preview, setPreview] = useState<InteractionSession | null>(null);

  useEffect(() => {
    sessionRef.current = null;
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

  const commitPenAnnotation = useCallback(
    (session: PenPreview) => {
      if (!bounds || !onCreateAnnotation) {
        return;
      }

      const rawPoints = session.points.length > 0 ? session.points : [{ x: bounds.x, y: bounds.y }];
      const stabilizedPoints = [...rawPoints];
      if (stabilizedPoints.length === 1) {
        const first = stabilizedPoints[0];
        stabilizedPoints.push(
          clampPointToBounds(
            {
              x: first.x + Math.max(bounds.width * 0.01, 8),
              y: first.y,
            },
            bounds,
          ),
        );
      }

      const left = Math.min(...stabilizedPoints.map((point) => point.x));
      const right = Math.max(...stabilizedPoints.map((point) => point.x));
      const top = Math.min(...stabilizedPoints.map((point) => point.y));
      const bottom = Math.max(...stabilizedPoints.map((point) => point.y));

      onCreateAnnotation({
        shapeType: "pen",
        x: toPercent((left + right) / 2 - bounds.x, bounds.width),
        y: toPercent((top + bottom) / 2 - bounds.y, bounds.height),
        width: Math.max(toPercent(right - left, bounds.width), 1),
        height: Math.max(toPercent(bottom - top, bounds.height), 1),
        pathPoints: stabilizedPoints.map((point) => toNormalizedPoint(bounds, point)),
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

if (toolMode === "text") {
    // Prevent creating multiple text annotations at the same position
    // Only create if there's no existing draft text annotation being edited
    const existingDraftText = annotations.find(
      (a) => a.shapeType === "text" && a.status === "draft"
    );
    if (existingDraftText) {
      onSelectAnnotation(existingDraftText.id);
      return;
    }
    const normalizedPoint = toNormalizedPoint(bounds, clampedPoint);
    onCreateAnnotation?.({
      shapeType: "text",
      x: normalizedPoint.x,
      y: normalizedPoint.y,
      width: 100,
      height: 30,
      textContent: "",
      color: activeColor,
    });
    return;
  }

      if (toolMode === "pen") {
        const session: PenPreview = {
          toolMode: "pen",
          color: activeColor,
          points: [clampedPoint],
        };

        sessionRef.current = session;
        setPreview(session);
        event.currentTarget.setPointerCapture(event.pointerId);
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

      sessionRef.current = session;
      setPreview(session);
      event.currentTarget.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
      const session = sessionRef.current;
      if (!session || !bounds) {
        return;
      }

      const point = readPoint(event);
      const clampedPoint = clampPointToBounds(point, bounds);

      if (session.toolMode === "pen") {
        const previous = session.points[session.points.length - 1];
        const dx = clampedPoint.x - previous.x;
        const dy = clampedPoint.y - previous.y;
        if (Math.hypot(dx, dy) < 0.75) {
          return;
        }

        const nextPenSession: PenPreview = {
          ...session,
          points: [...session.points, clampedPoint],
        };
        sessionRef.current = nextPenSession;
        setPreview(nextPenSession);
        return;
      }

      const next = {
        ...session,
        current: clampedPoint,
      };

      sessionRef.current = next;
      setPreview(next);
    };

    const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
      const session = sessionRef.current;
      if (!session) {
        return;
      }

      if (session.toolMode === "pen") {
        commitPenAnnotation(session);
      } else {
        const point = readPoint(event);
        commitDragAnnotation(session, point);
      }

      sessionRef.current = null;
      setPreview(null);

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    };

    const onPointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
      sessionRef.current = null;
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
  }, [activeColor, bounds, commitDragAnnotation, commitPenAnnotation, mode, onCreateAnnotation, onSelectAnnotation, readPoint, toolMode]);

  return {
    preview,
    handlers,
  };
}
