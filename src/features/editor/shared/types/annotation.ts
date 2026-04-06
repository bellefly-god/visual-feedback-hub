import type { AnnotationShape } from "@/types/feedback";

export type ToolMode = "select" | "pin" | "pen" | "arrow" | "rectangle" | "highlight";

export type AnnotationShapeMode = Exclude<ToolMode, "select">;

export type DragToolMode = Extract<ToolMode, "arrow" | "rectangle" | "highlight">;

export interface NormalizedAnnotation {
  id: string;
  displayOrder?: number;
  shapeType: AnnotationShape;
  x: number;
  y: number;
  width?: number;
  height?: number;
  pathPoints?: Array<{ x: number; y: number }>;
  color?: string;
  status?: "draft" | "saved";
  pinNumber?: number;
}

export interface CreateAnnotationPayload {
  shapeType: AnnotationShapeMode;
  x: number;
  y: number;
  width?: number;
  height?: number;
  pathPoints?: Array<{ x: number; y: number }>;
  color?: string;
}
