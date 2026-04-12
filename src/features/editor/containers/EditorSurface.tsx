import { ImageEditor } from "@/features/editor/image/ImageEditor";
import { PdfEditor } from "@/features/editor/pdf/PdfEditor";
import type { AssetType } from "@/types/feedback";
import type { CreateAnnotationPayload, NormalizedAnnotation, ToolMode } from "@/features/editor/shared/types/annotation";

interface EditorSurfaceProps {
  assetType: AssetType;
  assetUrl: string;
  toolMode: ToolMode;
  activeColor: string;
  annotations: NormalizedAnnotation[];
  selectedAnnotationId: string | null;
  currentPdfPage: number;
  onPdfPageChange: (nextPage: number) => void;
  onPdfPageCountChange: (count: number) => void;
  onSelectAnnotation: (annotationId: string | null) => void;
  onCreateAnnotation: (payload: CreateAnnotationPayload) => void;
  onTextEdit?: (annotationId: string, text: string) => void;
  onTextCommit?: (annotationId: string, text: string) => void;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
}

export function EditorSurface({
  assetType,
  assetUrl,
  toolMode,
  activeColor,
  annotations,
  selectedAnnotationId,
  currentPdfPage,
  onPdfPageChange,
  onPdfPageCountChange,
  onSelectAnnotation,
  onCreateAnnotation,
  onTextEdit,
  onTextCommit,
  zoomLevel,
  onZoomChange,
}: EditorSurfaceProps) {
  if (assetType === "pdf") {
    return (
      <PdfEditor
        mode="editor"
        assetUrl={assetUrl}
        page={currentPdfPage}
        toolMode={toolMode}
        annotations={annotations}
        selectedAnnotationId={selectedAnnotationId}
        onPageChange={onPdfPageChange}
        onPageCountChange={onPdfPageCountChange}
        onSelectAnnotation={onSelectAnnotation}
        onCreateAnnotation={onCreateAnnotation}
        onTextEdit={onTextEdit}
        onTextCommit={onTextCommit}
        zoomLevel={zoomLevel}
        onZoomChange={onZoomChange}
      />
    );
  }

  return (
    <ImageEditor
      mode="editor"
      assetUrl={assetUrl}
      toolMode={toolMode}
      activeColor={activeColor}
      annotations={annotations}
      selectedAnnotationId={selectedAnnotationId}
      onSelectAnnotation={onSelectAnnotation}
      onCreateAnnotation={onCreateAnnotation}
      onTextEdit={onTextEdit}
      onTextCommit={onTextCommit}
    />
  );
}
