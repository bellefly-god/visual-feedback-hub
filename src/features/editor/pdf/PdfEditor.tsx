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
  onTextEdit?: (annotationId: string, text: string) => void;
  onTextCommit?: (annotationId: string, text: string) => void;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
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
  onTextEdit,
  onTextCommit,
  zoomLevel = 1,
  onZoomChange,
}: PdfEditorProps) {
  const [bounds, setBounds] = useState<OverlayBounds | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const colors = useAnnotationColors();
  const { handlers, preview } = usePdfInteractions({
    mode,
    toolMode,
    bounds,
    activeColor: colors.stroke,
    onSelectAnnotation: (id) => {
      onSelectAnnotation(id);
      if (id) {
        const ann = annotations.find((a) => a.id === id);
        if (ann?.shapeType === "text") {
          setEditingTextId(id);
        } else {
          setEditingTextId(null);
        }
      } else {
        setEditingTextId(null);
      }
    },
    onCreateAnnotation: (payload) => {
      onCreateAnnotation?.(payload);
      if (payload.shapeType === "text") {
        // Will be handled via annotation update
      }
    },
  });

  const handleTextEdit = (annotationId: string, text: string) => {
    onTextEdit?.(annotationId, text);
  };

  const handleTextCommit = (annotationId: string, text: string) => {
    setEditingTextId(null);
    onTextCommit?.(annotationId, text);
  };

  if (!assetUrl) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-gradient-to-br from-muted/30 to-background">
        <p className="text-[13px] text-muted-foreground/30">Your design appears here</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-muted/20">
      <div className="relative h-full w-full">
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
          editingTextId={editingTextId}
          onSelectAnnotation={onSelectAnnotation}
          onTextEdit={handleTextEdit}
          onTextCommit={handleTextCommit}
          onPointerDown={handlers.onPointerDown}
          onPointerMove={handlers.onPointerMove}
          onPointerUp={handlers.onPointerUp}
          onPointerCancel={handlers.onPointerCancel}
        />
      </div>
    </div>
  );
}
