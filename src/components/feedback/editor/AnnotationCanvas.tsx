import { useCallback, useEffect, useRef } from "react";
import { Canvas, Circle, FabricText, Group, Line, Rect } from "fabric";
import type { AnnotationShape } from "@/types/feedback";
import { isDragShapeMode, type AnnotationShapeMode, type ToolMode } from "@/components/feedback/editor/toolMode";

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
  annotations: NormalizedAnnotation[];
  selectedAnnotationId: string | null;
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

function createPinObject(annotation: NormalizedAnnotation, canvasWidth: number, canvasHeight: number, highlighted: boolean) {
  const centerX = fromPercent(annotation.x, canvasWidth);
  const centerY = fromPercent(annotation.y, canvasHeight);

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

function createArrowObject(annotation: NormalizedAnnotation, canvasWidth: number, canvasHeight: number, highlighted: boolean) {
  const startX = fromPercent(annotation.x, canvasWidth);
  const startY = fromPercent(annotation.y, canvasHeight);
  const width = fromPercent(annotation.width ?? 0, canvasWidth);
  const height = fromPercent(annotation.height ?? 0, canvasHeight);

  return new Line([startX, startY, startX + width, startY + height], {
    stroke: highlighted ? "#1d4ed8" : "#2563eb",
    strokeWidth: highlighted ? 3 : 2,
  });
}

function createRectLikeObject(
  annotation: NormalizedAnnotation,
  canvasWidth: number,
  canvasHeight: number,
  highlighted: boolean,
) {
  const widthPercent = Math.max(annotation.width ?? 1, 1);
  const heightPercent = Math.max(annotation.height ?? 1, 1);
  const width = fromPercent(widthPercent, canvasWidth);
  const height = fromPercent(heightPercent, canvasHeight);
  const centerX = fromPercent(annotation.x, canvasWidth);
  const centerY = fromPercent(annotation.y, canvasHeight);

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
  canvasWidth: number,
  canvasHeight: number,
  highlighted: boolean,
) {
  if (annotation.shapeType === "pin") {
    return createPinObject(annotation, canvasWidth, canvasHeight, highlighted);
  }

  if (annotation.shapeType === "arrow") {
    return createArrowObject(annotation, canvasWidth, canvasHeight, highlighted);
  }

  return createRectLikeObject(annotation, canvasWidth, canvasHeight, highlighted);
}

export function AnnotationCanvas({
  mode,
  toolMode,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onCreateAnnotation,
}: AnnotationCanvasProps) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const drawSessionRef = useRef<DrawSession | null>(null);
  const annotationsRef = useRef<NormalizedAnnotation[]>(annotations);
  const selectedIdRef = useRef<string | null>(selectedAnnotationId);
  const callbacksRef = useRef({ onSelectAnnotation, onCreateAnnotation });
  const modeRef = useRef<"editor" | "review">(mode);
  const toolModeRef = useRef<ToolMode>(toolMode);
  const sizeRef = useRef({ width: 1, height: 1 });
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

  const renderAnnotations = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) {
      return;
    }

    const { width, height } = sizeRef.current;
    const canClick = true;

    canvas.clear();

    annotationsRef.current.forEach((annotation) => {
      const object = createFabricObject(annotation, width, height, annotation.id === selectedIdRef.current);
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
  }, []);

  useEffect(() => {
    callbacksRef.current = { onSelectAnnotation, onCreateAnnotation };
  }, [onCreateAnnotation, onSelectAnnotation]);

  useEffect(() => {
    modeRef.current = mode;
    renderAnnotations();
  }, [mode, renderAnnotations]);

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
    const canvasElement = canvasElementRef.current;

    if (!canvasElement || fabricCanvasRef.current) {
      return;
    }

    const canvas = new Canvas(canvasElement, {
      preserveObjectStacking: true,
      selection: false,
    });
    fabricCanvasRef.current = canvas;

    const resize = () => {
      const parent = canvasElement.parentElement;
      if (!parent) {
        return;
      }

      const rect = parent.getBoundingClientRect();
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

      const pointer = readPointer(canvas, event);

      if (currentTool === "pin") {
        callbacksRef.current.onCreateAnnotation?.({
          shapeType: "pin",
          x: toPercent(pointer.x, sizeRef.current.width),
          y: toPercent(pointer.y, sizeRef.current.height),
        });
        debugLog("annotation created", {
          shapeType: "pin",
          x: toPercent(pointer.x, sizeRef.current.width),
          y: toPercent(pointer.y, sizeRef.current.height),
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
      debugLog("mouse:move", {
        tool: session.toolMode,
        x: pointer.x,
        y: pointer.y,
      });

      if (session.toolMode === "arrow") {
        session.previewObject.set({
          x1: session.startX,
          y1: session.startY,
          x2: pointer.x,
          y2: pointer.y,
        });
      } else {
        const left = Math.min(session.startX, pointer.x);
        const top = Math.min(session.startY, pointer.y);
        const width = Math.max(1, Math.abs(pointer.x - session.startX));
        const height = Math.max(1, Math.abs(pointer.y - session.startY));

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
      debugLog("mouse:up", {
        tool: session.toolMode,
        x: pointer.x,
        y: pointer.y,
      });
      canvas.remove(session.previewObject);
      drawSessionRef.current = null;

      if (session.toolMode === "arrow") {
        let width = toSignedPercent(pointer.x - session.startX, sizeRef.current.width);
        let height = toSignedPercent(pointer.y - session.startY, sizeRef.current.height);

        if (Math.abs(width) < 0.8 && Math.abs(height) < 0.8) {
          width = 8;
          height = -6;
        }

        callbacksRef.current.onCreateAnnotation?.({
          shapeType: "arrow",
          x: toPercent(session.startX, sizeRef.current.width),
          y: toPercent(session.startY, sizeRef.current.height),
          width,
          height,
        });
        debugLog("annotation created", {
          shapeType: "arrow",
          x: toPercent(session.startX, sizeRef.current.width),
          y: toPercent(session.startY, sizeRef.current.height),
          width,
          height,
        });

        return;
      }

      const left = Math.min(session.startX, pointer.x);
      const right = Math.max(session.startX, pointer.x);
      const top = Math.min(session.startY, pointer.y);
      const bottom = Math.max(session.startY, pointer.y);

      const payload = {
        shapeType: session.toolMode,
        x: toPercent((left + right) / 2, sizeRef.current.width),
        y: toPercent((top + bottom) / 2, sizeRef.current.height),
        width: Math.max(toPercent(right - left, sizeRef.current.width), 1),
        height: Math.max(toPercent(bottom - top, sizeRef.current.height), 1),
      };
      callbacksRef.current.onCreateAnnotation?.(payload);
      debugLog("annotation created", payload);
    };

    canvas.on("mouse:down", handleMouseDown);
    canvas.on("mouse:move", handleMouseMove);
    canvas.on("mouse:up", handleMouseUp);

    const resizeObserver = new ResizeObserver(() => resize());
    if (canvasElement.parentElement) {
      resizeObserver.observe(canvasElement.parentElement);
    }
    resize();

    return () => {
      resizeObserver.disconnect();
      canvas.off("mouse:down", handleMouseDown);
      canvas.off("mouse:move", handleMouseMove);
      canvas.off("mouse:up", handleMouseUp);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [debugLog, renderAnnotations]);

  return <canvas ref={canvasElementRef} className="absolute inset-0 h-full w-full" />;
}
