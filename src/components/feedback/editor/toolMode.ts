import type { AnnotationToolId } from "@/components/feedback/annotationTools";

export type ToolMode = "select" | "pin" | "arrow" | "rectangle" | "highlight";

export type AnnotationShapeMode = Exclude<ToolMode, "select">;

const TOOL_MODES: ToolMode[] = ["select", "pin", "arrow", "rectangle", "highlight"];

export function toToolMode(tool: AnnotationToolId): ToolMode {
  if (TOOL_MODES.includes(tool as ToolMode)) {
    return tool as ToolMode;
  }

  return "pin";
}

export function isDragShapeMode(mode: ToolMode): mode is Extract<ToolMode, "arrow" | "rectangle" | "highlight"> {
  return mode === "arrow" || mode === "rectangle" || mode === "highlight";
}
