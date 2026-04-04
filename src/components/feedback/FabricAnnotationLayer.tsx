import { useEffect, useRef } from "react";
import {
  Canvas as FabricCanvas,
  IText,
  Line,
  PencilBrush,
  Rect,
  Triangle,
  type FabricObject,
} from "fabric";
import type { AnnotationToolId } from "@/components/feedback/annotationTools";

interface FabricAnnotationLayerProps {
  activeTool: AnnotationToolId;
  disabled?: boolean;
}

type Point = { x: number; y: number };

const isFabricSelectableTool = (tool: AnnotationToolId) => tool === "select";
const isFreeDrawTool = (tool: AnnotationToolId) => tool === "pen" || tool === "highlight";

const setObjectsInteractivity = (canvas: FabricCanvas, enabled: boolean) => {
  canvas.getObjects().forEach((obj: FabricObject) => {
    obj.selectable = enabled;
    obj.evented = enabled;
  });
};

const applyToolMode = (canvas: FabricCanvas, tool: AnnotationToolId, isDisabled: boolean) => {
  if (isDisabled || tool === "pin" || tool === "voice") {
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.skipTargetFind = true;
    canvas.defaultCursor = "crosshair";
    setObjectsInteractivity(canvas, false);
    return;
  }

  if (isFreeDrawTool(tool)) {
    canvas.isDrawingMode = true;
    canvas.selection = false;
    canvas.skipTargetFind = true;
    canvas.defaultCursor = "crosshair";
    setObjectsInteractivity(canvas, false);

    const brush = canvas.freeDrawingBrush ?? new PencilBrush(canvas);
    brush.width = tool === "highlight" ? 14 : 2.5;
    brush.color = tool === "highlight" ? "rgba(250, 204, 21, 0.38)" : "#4f46e5";
    canvas.freeDrawingBrush = brush;
    return;
  }

  if (isFabricSelectableTool(tool)) {
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.skipTargetFind = false;
    canvas.defaultCursor = "default";
    setObjectsInteractivity(canvas, true);
    return;
  }

  // arrow / rectangle / text
  canvas.isDrawingMode = false;
  canvas.selection = false;
  canvas.skipTargetFind = true;
  canvas.defaultCursor = "crosshair";
  setObjectsInteractivity(canvas, false);
};

export function FabricAnnotationLayer({ activeTool, disabled = false }: FabricAnnotationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const activeToolRef = useRef<AnnotationToolId>(activeTool);
  const disabledRef = useRef<boolean>(disabled);
  const startPointRef = useRef<Point | null>(null);
  const drawingRectRef = useRef<Rect | null>(null);
  const drawingLineRef = useRef<Line | null>(null);
  const drawingHeadRef = useRef<Triangle | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = new FabricCanvas(canvasRef.current, {
      selection: false,
      skipTargetFind: true,
    });
    canvas.renderOnAddRemove = false;
    fabricRef.current = canvas;
    activeToolRef.current = activeTool;

    const element = canvasRef.current;
    const resize = () => {
      const { clientWidth, clientHeight } = element;
      if (
        typeof (canvas as unknown as { setDimensions?: (size: { width: number; height: number }) => void })
          .setDimensions === "function"
      ) {
        (canvas as unknown as { setDimensions: (size: { width: number; height: number }) => void }).setDimensions({
          width: clientWidth,
          height: clientHeight,
        });
      } else {
        (canvas as unknown as { setWidth?: (width: number) => void }).setWidth?.(clientWidth);
        (canvas as unknown as { setHeight?: (height: number) => void }).setHeight?.(clientHeight);
      }
      canvas.requestRenderAll();
    };

    const onMouseDown = (event: { e: MouseEvent }) => {
      const tool = activeToolRef.current;
      if (disabledRef.current || tool === "pin" || tool === "voice" || tool === "select" || isFreeDrawTool(tool)) {
        return;
      }

      const pointer = canvas.getPointer(event.e);
      startPointRef.current = pointer;

      if (tool === "text") {
        const text = new IText("Text", {
          left: pointer.x,
          top: pointer.y,
          fill: "#111827",
          fontSize: 16,
          editable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        canvas.requestRenderAll();
        return;
      }

      if (tool === "rectangle") {
        const rect = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 1,
          height: 1,
          fill: "rgba(79, 70, 229, 0.12)",
          stroke: "#4f46e5",
          strokeWidth: 2,
          rx: 6,
          ry: 6,
          selectable: false,
          evented: false,
        });
        drawingRectRef.current = rect;
        canvas.add(rect);
        canvas.requestRenderAll();
        return;
      }

      if (tool === "arrow") {
        const line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: "#4f46e5",
          strokeWidth: 2.5,
          selectable: false,
          evented: false,
        });
        const head = new Triangle({
          left: pointer.x,
          top: pointer.y,
          width: 12,
          height: 14,
          fill: "#4f46e5",
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
          angle: 90,
        });
        drawingLineRef.current = line;
        drawingHeadRef.current = head;
        canvas.add(line, head);
        canvas.requestRenderAll();
      }
    };

    const onMouseMove = (event: { e: MouseEvent }) => {
      const start = startPointRef.current;
      const tool = activeToolRef.current;
      if (!start || disabledRef.current) {
        return;
      }

      const pointer = canvas.getPointer(event.e);

      if (tool === "rectangle" && drawingRectRef.current) {
        const left = Math.min(start.x, pointer.x);
        const top = Math.min(start.y, pointer.y);
        const width = Math.max(Math.abs(pointer.x - start.x), 2);
        const height = Math.max(Math.abs(pointer.y - start.y), 2);
        drawingRectRef.current.set({ left, top, width, height });
        canvas.requestRenderAll();
        return;
      }

      if (tool === "arrow" && drawingLineRef.current && drawingHeadRef.current) {
        drawingLineRef.current.set({ x1: start.x, y1: start.y, x2: pointer.x, y2: pointer.y });
        drawingHeadRef.current.set({
          left: pointer.x,
          top: pointer.y,
          angle: Math.atan2(pointer.y - start.y, pointer.x - start.x) * (180 / Math.PI) + 90,
        });
        canvas.requestRenderAll();
      }
    };

    const onMouseUp = () => {
      startPointRef.current = null;
      drawingRectRef.current = null;
      drawingLineRef.current = null;
      drawingHeadRef.current = null;
    };

    canvas.on("mouse:down", onMouseDown);
    canvas.on("mouse:move", onMouseMove);
    canvas.on("mouse:up", onMouseUp);

    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    applyToolMode(canvas, activeToolRef.current, disabled);

    return () => {
      observer.disconnect();
      canvas.off("mouse:down", onMouseDown);
      canvas.off("mouse:move", onMouseMove);
      canvas.off("mouse:up", onMouseUp);
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) {
      return;
    }

    activeToolRef.current = activeTool;
    disabledRef.current = disabled;
    applyToolMode(canvas, activeTool, disabled);
    canvas.requestRenderAll();
  }, [activeTool, disabled]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 h-full w-full ${disabled ? "pointer-events-none" : "pointer-events-auto"}`}
    />
  );
}
