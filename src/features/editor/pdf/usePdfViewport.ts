import type { OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";

export interface PdfViewportInput {
  containerWidth: number;
  containerHeight: number;
  pageWidth: number;
  pageHeight: number;
}

export function getFittedPdfViewport({
  containerWidth,
  containerHeight,
  pageWidth,
  pageHeight,
}: PdfViewportInput): OverlayBounds | null {
  if (containerWidth <= 0 || containerHeight <= 0 || pageWidth <= 0 || pageHeight <= 0) {
    return null;
  }

  const scale = Math.min(containerWidth / pageWidth, containerHeight / pageHeight);
  const width = pageWidth * scale;
  const height = pageHeight * scale;

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}
