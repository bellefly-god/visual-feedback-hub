import { useCallback, useEffect, useRef } from "react";
import { Canvas, Circle, FabricText, Group, Line, Rect } from "fabric";
import type { AnnotationShape } from "@/types/feedback";
import { isDragShapeMode, type AnnotationShapeMode, type ToolMode } from "@/components/feedback/editor/toolMode";
import { isValidContentBounds, type CanvasContentBounds } from "@/components/feedback/editor/contentBounds";

export interface NormalizedAnnotation {
  id: string;
  shapeType: AnnotationShape;
  x: number;
  y: number;
  width?: number;
  height?: number;
  pinNumber?: number;
}

export interface CreateAnnotationPayload {
  shapeType: AnnotationShapeMode;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface AnnotationCanvasProps {
  mode: "editor" | "review";
  toolMode: ToolMode;
  assetSessionKey: string;
  annotations: NormalizedAnnotation[];
  selectedAnnotationId: string | null;
  contentBounds?: CanvasContentBounds | null;
  onSelectAnnotation: (annotationId: string | null) => void;
  onCreateAnnotation?: (payload: CreateAnnotationPayload) => void;
}

type DrawSession = {
  toolMode: Extract<ToolMode, "arrow" | "rectangle" | "highlight">;
  startX: number;
  startY: number;
  previewObject: Line | Rect;
};

type FabricPointerEvent = {
  e: MouseEvent | PointerEvent | TouchEvent;
  target?: { annotationId?: string } | null;
};

const fabricManagedCanvasNodes = new WeakSet<HTMLCanvasElement>();

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function toPercent(value: number, size: number): number {
  if (size <= 0) {
    return 0;
  }

  return clampPercent((value / size) * 100);
}

function toSignedPercent(value: number, size: number): number {
  if (size <= 0) {
    return 0;
  }

  return (value / size) * 100;
}

function fromPercent(value: number, size: number): number {
  return (value / 100) * size;
}

function createPinObject(annotation: NormalizedAnnotation, bounds: CanvasContentBounds, highlighted: boolean) {
  const centerX = bounds.x + fromPercent(annotation.x, bounds.width);
  const centerY = bounds.y + fromPercent(annotation.y, bounds.height);

  const circle = new Circle({
    originX: "center",
    originY: "center",
    radius: highlighted ? 11 : 10,
    fill: highlighted ? "#1d4ed8" : "#2563eb",
    stroke: "#ffffff",
    strokeWidth: 2,
  });

  const label = new FabricText(String(annotation.pinNumber ?? ""), {
    originX: "center",
    originY: "center",
    fontSize: 11,
    fill: "#ffffff",
    fontWeight: "600",
  });

  return new Group([circle, label], {
    left: centerX,
    top: centerY,
    originX: "center",
    originY: "center",
  });
}

function createArrowObject(annotation: NormalizedAnnotation, bounds: CanvasContentBounds, highlighted: boolean) {
  const startX = bounds.x + fromPercent(annotation.x, bounds.width);
  const startY = bounds.y + fromPercent(annotation.y, bounds.height);
  const width = fromPercent(annotation.width ?? 0, bounds.width);
  const height = fromPercent(annotation.height ?? 0, bounds.height);

  return new Line([startX, startY, startX + width, startY + height], {
    stroke: highlighted ? "#1d4ed8" : "#2563eb",
    strokeWidth: highlighted ? 3 : 2,
  });
}

function createRectLikeObject(
  annotation: NormalizedAnnotation,
  bounds: CanvasContentBounds,
  highlighted: boolean,
) {
  const widthPercent = Math.max(annotation.width ?? 1, 1);
  const heightPercent = Math.max(annotation.height ?? 1, 1);
  const width = fromPercent(widthPercent, bounds.width);
  const height = fromPercent(heightPercent, bounds.height);
  const centerX = bounds.x + fromPercent(annotation.x, bounds.width);
  const centerY = bounds.y + fromPercent(annotation.y, bounds.height);

  return new Rect({
    left: centerX - width / 2,
    top: centerY - height / 2,
    width,
    height,
    fill:
      annotation.shapeType === "highlight"
        ? "rgba(250, 204, 21, 0.28)"
        : highlighted
          ? "rgba(29, 78, 216, 0.15)"
          : "rgba(37, 99, 235, 0.12)",
    stroke: highlighted ? "#1d4ed8" : "#2563eb",
    strokeWidth: highlighted ? 2.4 : 2,
    rx: 6,
    ry: 6,
  });
}

function createFabricObject(
  annotation: NormalizedAnnotation,
  bounds: CanvasContentBounds,
  highlighted: boolean,
) {
  if (annotation.shapeType === "pin") {
    return createPinObject(annotation, bounds, highlighted);
  }

  if (annotation.shapeType === "arrow") {
    return createArrowObject(annotation, bounds, highlighted);
  }

  return createRectLikeObject(annotation, bounds, highlighted);
}

export function AnnotationCanvas({
  mode,
  toolMode,
  assetSessionKey,
  annotations,
  selectedAnnotationId,
  contentBounds,
  onSelectAnnotation,
  onCreateAnnotation,
}: AnnotationCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasDomRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const listenersRef = useRef<{
    mouseDown: (event: FabricPointerEvent) => void;
    mouseMove: (event: FabricPointerEvent) => void;
    mouseUp: (event: FabricPointerEvent) => void;
  } | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const activeSessionKeyRef = useRef<string | null>(null);
  const previousSessionKeyRef = useRef<string | null>(null);
  const observedHostRef = useRef<HTMLDivElement | null>(null);
  const initializingRef = useRef(false);
  const drawSessionRef = useRef<DrawSession | null>(null);
  const annotationsRef = useRef<NormalizedAnnotation[]>(annotations);
  const selectedIdRef = useRef<string | null>(selectedAnnotationId);
  const callbacksRef = useRef({ onSelectAnnotation, onCreateAnnotation });
  const modeRef = useRef<"editor" | "review">(mode);
  const toolModeRef = useRef<ToolMode>(toolMode);
  const sizeRef = useRef({ width: 1, height: 1 });
  const contentBoundsRef = useRef<CanvasContentBounds | null>(null);
  const isDebugEnabled = import.meta.env.DEV;

  const debugLog = useCallback(
    (...args: unknown[]) => {
      if (isDebugEnabled) {
        console.log("[AnnotationCanvas]", ...args);
      }
    },
    [isDebugEnabled],
  );

  const readPointer = (canvas: Canvas, event: FabricPointerEvent) => {
    return canvas.getPointer(event.e as MouseEvent);
  };

  const getBaselineBounds = useCallback((): CanvasContentBounds => {
    const { width, height } = sizeRef.current;
    const fallback: CanvasContentBounds = { x: 0, y: 0, width, height };
    const bounds = contentBoundsRef.current;

    if (!isValidContentBounds(bounds)) {
      return fallback;
    }

    return bounds;
  }, []);

  const isPointInBounds = (point: { x: number; y: number }, bounds: CanvasContentBounds) => {
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  };

  const clampPointToBounds = (point: { x: number; y: number }, bounds: CanvasContentBounds) => {
    return {
      x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, point.x)),
      y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, point.y)),
    };
  };

  const renderAnnotations = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return;
    }

    const bounds = getBaselineBounds();
    const canClick = true;

    canvas.clear();

    annotationsRef.current.forEach((annotation) => {
      const object = createFabricObject(annotation, bounds, annotation.id === selectedIdRef.current);
      (object as unknown as { annotationId?: string }).annotationId = annotation.id;
      object.hasControls = false;
      object.hasBorders = false;
      object.lockMovementX = true;
      object.lockMovementY = true;
      object.lockScalingX = true;
      object.lockScalingY = true;
      object.lockRotation = true;
      object.hoverCursor = canClick ? "pointer" : "crosshair";
      object.evented = canClick;
      object.selectable = false;
      canvas.add(object);
    });

    canvas.selection = false;
    canvas.requestRenderAll();
  }, [getBaselineBounds]);

  const disposeFabricSession = useCallback((reason: "asset-key-change" | "host-change" | "unmount" | "reinit") => {
    debugLog("fabric dispose", {
      reason,
      activeSessionKey: activeSessionKeyRef.current,
    });

    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;

    const canvas = fabricCanvasRef.current;
    const listeners = listenersRef.current;

    if (canvas && listeners) {
      canvas.off("mouse:down", listeners.mouseDown);
      canvas.off("mouse:move", listeners.mouseMove);
      canvas.off("mouse:up", listeners.mouseUp);
    }

    listenersRef.current = null;
    drawSessionRef.current = null;

    if (canvas) {
      canvas.dispose();
    }

    fabricCanvasRef.current = null;
    activeSessionKeyRef.current = null;

    const host = hostRef.current;
    if (host) {
      host.replaceChildren();
    }

    if (canvasDomRef.current) {
      fabricManagedCanvasNodes.delete(canvasDomRef.current);
    }

    canvasDomRef.current = null;
  }, [debugLog]);

  useEffect(() => {
    callbacksRef.current = { onSelectAnnotation, onCreateAnnotation };
  }, [onCreateAnnotation, onSelectAnnotation]);

  useEffect(() => {
    modeRef.current = mode;
    renderAnnotations();
  }, [mode, renderAnnotations]);

  useEffect(() => {
    contentBoundsRef.current = isValidContentBounds(contentBounds) ? contentBounds : null;
    renderAnnotations();
  }, [contentBounds, renderAnnotations]);

  useEffect(() => {
    annotationsRef.current = annotations;
    renderAnnotations();
  }, [annotations, renderAnnotations]);

  useEffect(() => {
    selectedIdRef.current = selectedAnnotationId;
    renderAnnotations();
  }, [renderAnnotations, selectedAnnotationId]);

  useEffect(() => {
    toolModeRef.current = toolMode;
    drawSessionRef.current = null;
    debugLog("active tool changed", toolMode);
    renderAnnotations();
  }, [debugLog, renderAnnotations, toolMode]);

  useEffect(() => {
    const previous = previousSessionKeyRef.current;
    if (previous !== assetSessionKey) {
      debugLog("asset key change", {
        previous: previous ?? null,
        next: assetSessionKey,
      });
      previousSessionKeyRef.current = assetSessionKey;
    }
  }, [assetSessionKey, debugLog]);

  useEffect(() => {
    const host = hostRef.current;
    if (observedHostRef.current === host) {
      return;
    }

    debugLog("host element change", {
      previousAttached: Boolean(observedHostRef.current),
      nextAttached: Boolean(host),
    });

    if (observedHostRef.current && host && observedHostRef.current !== host && (fabricCanvasRef.current || canvasDomRef.current)) {
      disposeFabricSession("host-change");
    }

    observedHostRef.current = host;
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    if (initializingRef.current) {
      return;
    }

    if (fabricCanvasRef.current && activeSessionKeyRef.current === assetSessionKey) {
      return;
    }

    if (activeSessionKeyRef.current && activeSessionKeyRef.current !== assetSessionKey) {
      disposeFabricSession("asset-key-change");
    } else if (fabricCanvasRef.current || canvasDomRef.current) {
      disposeFabricSession("reinit");
    }

    initializingRef.current = true;

    const canvasElement = document.createElement("canvas");
    canvasElement.className = "absolute inset-0 h-full w-full";
    try {
      if (fabricManagedCanvasNodes.has(canvasElement)) {
        debugLog("fabric init skipped", { reason: "dom-node-already-managed" });
        return;
      }

      host.appendChild(canvasElement);
      canvasDomRef.current = canvasElement;
      fabricManagedCanvasNodes.add(canvasElement);

      const canvas = new Canvas(canvasElement, {
        preserveObjectStacking: true,
        selection: false,
      });

      debugLog("fabric init", {
        assetSessionKey,
        hostConnected: host.isConnected,
      });

      fabricCanvasRef.current = canvas;
      activeSessionKeyRef.current = assetSessionKey;

      const resize = () => {
        const rect = host.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);

        sizeRef.current = { width, height };
        canvas.setDimensions({ width, height });
        renderAnnotations();
      };

      const handleMouseDown = (event: FabricPointerEvent) => {
      debugLog("mouse:down", {
        mode: modeRef.current,
        tool: toolModeRef.current,
        targetAnnotationId: event.target?.annotationId ?? null,
      });

      const targetAnnotationId = event.target?.annotationId ?? null;
      if (targetAnnotationId) {
        callbacksRef.current.onSelectAnnotation(targetAnnotationId);
        debugLog("selection changed", { selectedAnnotationId: targetAnnotationId });
        return;
      }

      if (modeRef.current === "review") {
        callbacksRef.current.onSelectAnnotation(null);
        debugLog("selection changed", { selectedAnnotationId: null });
        return;
      }

      const currentTool = toolModeRef.current;

      if (currentTool === "select") {
        callbacksRef.current.onSelectAnnotation(null);
        debugLog("selection changed", { selectedAnnotationId: null });
        return;
      }

      const baselineBounds = getBaselineBounds();
      const rawPointer = readPointer(canvas, event);
      if (!isPointInBounds(rawPointer, baselineBounds)) {
        return;
      }
      const pointer = clampPointToBounds(rawPointer, baselineBounds);

      if (currentTool === "pin") {
        const normalizedX = toPercent(pointer.x - baselineBounds.x, baselineBounds.width);
        const normalizedY = toPercent(pointer.y - baselineBounds.y, baselineBounds.height);
        callbacksRef.current.onCreateAnnotation?.({
          shapeType: "pin",
          x: normalizedX,
          y: normalizedY,
        });
        debugLog("annotation created", {
          shapeType: "pin",
          x: normalizedX,
          y: normalizedY,
        });
        return;
      }

      if (!isDragShapeMode(currentTool)) {
        return;
      }

      let previewObject: Line | Rect;

      if (currentTool === "arrow") {
        previewObject = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: "#2563eb",
          strokeWidth: 2,
          evented: false,
          selectable: false,
        });
      } else {
        previewObject = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 1,
          height: 1,
          fill: currentTool === "highlight" ? "rgba(250, 204, 21, 0.24)" : "rgba(37, 99, 235, 0.10)",
          stroke: "#2563eb",
          strokeWidth: 2,
          rx: 6,
          ry: 6,
          evented: false,
          selectable: false,
        });
      }

      canvas.add(previewObject);
      drawSessionRef.current = {
        toolMode: currentTool,
        startX: pointer.x,
        startY: pointer.y,
        previewObject,
      };
    };

      const handleMouseMove = (event: FabricPointerEvent) => {
      const session = drawSessionRef.current;
      if (!session) {
        return;
      }

      const pointer = readPointer(canvas, event);
      const baselineBounds = getBaselineBounds();
      const clampedPointer = clampPointToBounds(pointer, baselineBounds);
      debugLog("mouse:move", {
        tool: session.toolMode,
        x: clampedPointer.x,
        y: clampedPointer.y,
      });

      if (session.toolMode === "arrow") {
        session.previewObject.set({
          x1: session.startX,
          y1: session.startY,
          x2: clampedPointer.x,
          y2: clampedPointer.y,
        });
      } else {
        const left = Math.min(session.startX, clampedPointer.x);
        const top = Math.min(session.startY, clampedPointer.y);
        const width = Math.max(1, Math.abs(clampedPointer.x - session.startX));
        const height = Math.max(1, Math.abs(clampedPointer.y - session.startY));

        session.previewObject.set({
          left,
          top,
          width,
          height,
        });
      }

      canvas.requestRenderAll();
    };

      const handleMouseUp = (event: FabricPointerEvent) => {
      const session = drawSessionRef.current;
      if (!session) {
        return;
      }

      const pointer = readPointer(canvas, event);
      const baselineBounds = getBaselineBounds();
      const clampedPointer = clampPointToBounds(pointer, baselineBounds);
      debugLog("mouse:up", {
        tool: session.toolMode,
        x: clampedPointer.x,
        y: clampedPointer.y,
      });
      canvas.remove(session.previewObject);
      drawSessionRef.current = null;

      if (session.toolMode === "arrow") {
        let width = toSignedPercent(clampedPointer.x - session.startX, baselineBounds.width);
        let height = toSignedPercent(clampedPointer.y - session.startY, baselineBounds.height);
        const normalizedX = toPercent(session.startX - baselineBounds.x, baselineBounds.width);
        const normalizedY = toPercent(session.startY - baselineBounds.y, baselineBounds.height);

        if (Math.abs(width) < 0.8 && Math.abs(height) < 0.8) {
          width = 8;
          height = -6;
        }

        callbacksRef.current.onCreateAnnotation?.({
          shapeType: "arrow",
          x: normalizedX,
          y: normalizedY,
          width,
          height,
        });
        debugLog("annotation created", {
          shapeType: "arrow",
          x: normalizedX,
          y: normalizedY,
          width,
          height,
        });

        return;
      }

      const left = Math.min(session.startX, clampedPointer.x);
      const right = Math.max(session.startX, clampedPointer.x);
      const top = Math.min(session.startY, clampedPointer.y);
      const bottom = Math.max(session.startY, clampedPointer.y);

      const payload = {
        shapeType: session.toolMode,
        x: toPercent((left + right) / 2 - baselineBounds.x, baselineBounds.width),
        y: toPercent((top + bottom) / 2 - baselineBounds.y, baselineBounds.height),
        width: Math.max(toPercent(right - left, baselineBounds.width), 1),
        height: Math.max(toPercent(bottom - top, baselineBounds.height), 1),
      };
      callbacksRef.current.onCreateAnnotation?.(payload);
      debugLog("annotation created", payload);
    };

      canvas.on("mouse:down", handleMouseDown);
      canvas.on("mouse:move", handleMouseMove);
      canvas.on("mouse:up", handleMouseUp);
      listenersRef.current = {
        mouseDown: handleMouseDown,
        mouseMove: handleMouseMove,
        mouseUp: handleMouseUp,
      };

      const resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(host);
      resizeObserverRef.current = resizeObserver;
      resize();
      renderAnnotations();
    } finally {
      initializingRef.current = false;
    }
  }, [assetSessionKey, debugLog, disposeFabricSession, getBaselineBounds, renderAnnotations]);

  useEffect(() => {
    return () => {
      disposeFabricSession("unmount");
    };
  }, [disposeFabricSession]);

  return <div ref={hostRef} className="absolute inset-0 h-full w-full" />;
}
