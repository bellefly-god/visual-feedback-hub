import { useCallback, useState } from "react";
import type { AnnotationToolId } from "@/components/feedback/annotationTools";
import type { ToolMode } from "@/features/editor/shared/types/annotation";

const TOOL_MODES: ToolMode[] = ["select", "pin", "pen", "arrow", "rectangle", "highlight"];

export function toToolMode(tool: AnnotationToolId): ToolMode {
  if (TOOL_MODES.includes(tool as ToolMode)) {
    return tool as ToolMode;
  }

  return "pin";
}

export function useToolModeState(initialMode: ToolMode = "pin") {
  const [toolMode, setToolMode] = useState<ToolMode>(initialMode);

  const setFromToolbarTool = useCallback((tool: AnnotationToolId) => {
    setToolMode(toToolMode(tool));
  }, []);

  return {
    toolMode,
    setToolMode,
    setFromToolbarTool,
  };
}
