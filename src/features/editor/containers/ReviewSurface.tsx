import { ImageEditor } from "@/features/editor/image/ImageEditor";
import { PdfEditor } from "@/features/editor/pdf/PdfEditor";
import type { AssetType } from "@/types/feedback";
import type { NormalizedAnnotation } from "@/features/editor/shared/types/annotation";
import { DEFAULT_ANNOTATION_COLOR } from "@/features/editor/shared/colors/annotationColor";

interface ReviewSurfaceProps {
  assetType: AssetType;
  assetUrl: string;
  annotations: NormalizedAnnotation[];
  selectedAnnotationId: string | null;
  currentPdfPage: number;
  onPdfPageChange: (nextPage: number) => void;
  onPdfPageCountChange: (count: number) => void;
  onSelectAnnotation: (annotationId: string | null) => void;
}

export function ReviewSurface({
  assetType,
  assetUrl,
  annotations,
  selectedAnnotationId,
  currentPdfPage,
  onPdfPageChange,
  onPdfPageCountChange,
  onSelectAnnotation,
}: ReviewSurfaceProps) {
  if (assetType === "pdf") {
    return (
      <PdfEditor
        mode="review"
        assetUrl={assetUrl}
        page={currentPdfPage}
        toolMode="select"
        annotations={annotations}
        selectedAnnotationId={selectedAnnotationId}
        onPageChange={onPdfPageChange}
        onPageCountChange={onPdfPageCountChange}
        onSelectAnnotation={onSelectAnnotation}
      />
    );
  }

  return (
    <ImageEditor
      mode="review"
      assetUrl={assetUrl}
      toolMode="select"
      activeColor={DEFAULT_ANNOTATION_COLOR}
      annotations={annotations}
      selectedAnnotationId={selectedAnnotationId}
      onSelectAnnotation={onSelectAnnotation}
    />
  );
}
