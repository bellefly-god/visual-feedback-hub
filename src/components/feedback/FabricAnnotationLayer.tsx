import { useEffect, useRef } from "react";
import { Canvas as FabricCanvas, Line, Rect, Triangle } from "fabric";
import type { CommentView } from "@/types/feedback";

interface FabricAnnotationLayerProps {
  comments: CommentView[];
  activeCommentId?: string | null;
}

export function FabricAnnotationLayer({ comments, activeCommentId }: FabricAnnotationLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);

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

    const element = canvasRef.current;
    const resize = () => {
      const { clientWidth, clientHeight } = element;
      canvas.setWidth(clientWidth);
      canvas.setHeight(clientHeight);
      canvas.requestRenderAll();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    return () => {
      observer.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) {
      return;
    }

    canvas.clear();
    const width = canvas.getWidth();
    const height = canvas.getHeight();

    comments.forEach((comment) => {
      const x = (comment.x / 100) * width;
      const y = (comment.y / 100) * height;
      const shapeWidth = (((comment.width ?? 12) / 100) * width);
      const shapeHeight = (((comment.height ?? 8) / 100) * height);
      const isActive = comment.id === activeCommentId;
      const strokeColor = isActive ? "#4f46e5" : "#6366f1";
      const fillColor = isActive ? "rgba(79,70,229,0.2)" : "rgba(99,102,241,0.16)";

      if (comment.shapeType === "rectangle" || comment.shapeType === "highlight") {
        const rect = new Rect({
          left: x - shapeWidth / 2,
          top: y - shapeHeight / 2,
          width: Math.max(shapeWidth, 8),
          height: Math.max(shapeHeight, 8),
          fill: comment.shapeType === "highlight" ? "rgba(250, 204, 21, 0.22)" : fillColor,
          stroke: strokeColor,
          strokeWidth: 2,
          rx: 8,
          ry: 8,
          selectable: false,
          evented: false,
        });
        canvas.add(rect);
        return;
      }

      if (comment.shapeType === "arrow") {
        const endX = x + (comment.width ?? 8) / 100 * width;
        const endY = y + (comment.height ?? -6) / 100 * height;
        const line = new Line([x, y, endX, endY], {
          stroke: strokeColor,
          strokeWidth: 3,
          selectable: false,
          evented: false,
        });
        const head = new Triangle({
          left: endX,
          top: endY,
          width: 12,
          height: 14,
          fill: strokeColor,
          angle: Math.atan2(endY - y, endX - x) * (180 / Math.PI) + 90,
          originX: "center",
          originY: "center",
          selectable: false,
          evented: false,
        });
        canvas.add(line, head);
      }
    });

    canvas.requestRenderAll();
  }, [comments, activeCommentId]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
