import type { AnnotationToolId } from "@/components/feedback/annotationTools";

export type ToolMode = "select" | "pin" | "pen" | "arrow" | "rectangle" | "highlight" | "text";

export type AnnotationShapeMode = Exclude<ToolMode, "select">;

const TOOL_MODES: ToolMode[] = ["select", "pin", "pen", "arrow", "rectangle", "highlight", "text"];

export function toToolMode(tool: AnnotationToolId): ToolMode {
  if (TOOL_MODES.includes(tool as ToolMode)) {
    return tool as ToolMode;
  }

  return "pin";
}

export function isDragShapeMode(mode: ToolMode): mode is Extract<ToolMode, "arrow" | "rectangle" | "highlight"> {
  return mode === "arrow" || mode === "rectangle" || mode === "highlight";
}

export function isTextMode(mode: ToolMode): mode is "text" {
  return mode === "text";
}
