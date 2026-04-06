import type { AnnotationShape } from "@/types/feedback";

export type ToolMode = "select" | "pin" | "arrow" | "rectangle" | "highlight";

export type AnnotationShapeMode = Exclude<ToolMode, "select">;

export type DragToolMode = Extract<ToolMode, "arrow" | "rectangle" | "highlight">;

export interface NormalizedAnnotation {
  id: string;
  shapeType: AnnotationShape;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  pinNumber?: number;
}

export interface CreateAnnotationPayload {
  shapeType: AnnotationShapeMode;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
}
