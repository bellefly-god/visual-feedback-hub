import type { OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";

export type ZoomMode = "fit-page" | "fit-width" | "fit-height" | "actual";

export interface PdfViewportInput {
  containerWidth: number;
  containerHeight: number;
  pageWidth: number;
  pageHeight: number;
  zoomMode?: ZoomMode;
  customScale?: number; // 1 = 100%
}

export function getFittedPdfViewport({
  containerWidth,
  containerHeight,
  pageWidth,
  pageHeight,
  zoomMode = "fit-page",
  customScale = 1,
}: PdfViewportInput): OverlayBounds | null {
  if (containerWidth <= 0 || containerHeight <= 0 || pageWidth <= 0 || pageHeight <= 0) {
    return null;
  }

  let scale: number;

  switch (zoomMode) {
    case "fit-width":
      // 适应宽度
      scale = containerWidth / pageWidth;
      break;
    case "fit-height":
      // 适应高度
      scale = containerHeight / pageHeight;
      break;
    case "actual":
      // 实际大小 (100%)
      scale = 1;
      break;
    case "fit-page":
    default:
      // 适应整个页面（保持比例，可能留白）
      scale = Math.min(containerWidth / pageWidth, containerHeight / pageHeight);
      break;
  }

  // 应用自定义缩放（如果是 fit-page 模式且有自定义缩放）
  if (zoomMode === "fit-page" && customScale !== 1) {
    scale *= customScale;
  }

  const width = pageWidth * scale;
  const height = pageHeight * scale;

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
}

// 计算实际缩放百分比
export function getZoomPercentage(zoomMode: ZoomMode, scale: number): number {
  return Math.round(scale * 100);
}
