import { useState } from "react";
import { PdfPageCanvas } from "@/features/editor/pdf/PdfPageCanvas";
import { PdfAnnotationOverlay } from "@/features/editor/pdf/PdfAnnotationOverlay";
import { usePdfInteractions } from "@/features/editor/pdf/usePdfInteractions";
import { useAnnotationColors } from "@/features/editor/shared/state/useAnnotationColors";
import type { OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";
import type { CreateAnnotationPayload, NormalizedAnnotation, ToolMode } from "@/features/editor/shared/types/annotation";

interface PdfEditorProps {
  mode: "editor" | "review";
  assetUrl: string;
  page: number;
  toolMode: ToolMode;
  annotations: NormalizedAnnotation[];
  selectedAnnotationId: string | null;
  onPageChange?: (nextPage: number) => void;
  onPageCountChange?: (count: number) => void;
  onSelectAnnotation: (annotationId: string | null) => void;
  onCreateAnnotation?: (payload: CreateAnnotationPayload) => void;
}

export function PdfEditor({
  mode,
  assetUrl,
  page,
  toolMode,
  annotations,
  selectedAnnotationId,
  onPageChange,
  onPageCountChange,
  onSelectAnnotation,
  onCreateAnnotation,
}: PdfEditorProps) {
  const [bounds, setBounds] = useState<OverlayBounds | null>(null);
  const colors = useAnnotationColors();
  const { handlers, preview } = usePdfInteractions({
    mode,
    toolMode,
    bounds,
    onSelectAnnotation,
    onCreateAnnotation,
  });

  if (!assetUrl) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-gradient-to-br from-muted/30 to-background">
        <p className="text-[13px] text-muted-foreground/30">Your design appears here</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full rounded-xl bg-muted/20">
      <PdfPageCanvas
        src={assetUrl}
        page={page}
        onPageChange={onPageChange}
        onPageCountChange={onPageCountChange}
        onBoundsChange={setBounds}
      />

      <PdfAnnotationOverlay
        mode={mode}
        toolMode={toolMode}
        bounds={bounds}
        annotations={annotations}
        selectedAnnotationId={selectedAnnotationId}
        colors={colors}
        preview={preview}
        onSelectAnnotation={onSelectAnnotation}
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerCancel={handlers.onPointerCancel}
      />
    </div>
  );
}
