import { useMemo } from "react";
import type { AnnotationColorState } from "@/features/editor/shared/types/editor-state";

export function useAnnotationColors(): AnnotationColorState {
  return useMemo(
    () => ({
      pinFill: "#2563eb",
      pinFillActive: "#1d4ed8",
      stroke: "#2563eb",
      strokeActive: "#1d4ed8",
      rectFill: "rgba(37, 99, 235, 0.12)",
      rectFillActive: "rgba(29, 78, 216, 0.15)",
      highlightFill: "rgba(250, 204, 21, 0.28)",
    }),
    [],
  );
}
