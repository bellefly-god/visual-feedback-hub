import { AssetPreview } from "@/components/feedback/AssetPreview";
import type { AssetType } from "@/types/feedback";
import type { CanvasContentBounds } from "@/components/feedback/editor/contentBounds";

interface AssetRendererProps {
  assetType: AssetType;
  assetUrl: string;
  page?: number;
  onPageChange?: (nextPage: number) => void;
  onPageCountChange?: (count: number) => void;
  onContentBoundsChange?: (bounds: CanvasContentBounds | null) => void;
}

export function AssetRenderer({
  assetType,
  assetUrl,
  page,
  onPageChange,
  onPageCountChange,
  onContentBoundsChange,
}: AssetRendererProps) {
  return (
    <AssetPreview
      assetType={assetType}
      assetUrl={assetUrl}
      page={page}
      onPageChange={onPageChange}
      onPageCountChange={onPageCountChange}
      onContentBoundsChange={onContentBoundsChange}
    />
  );
}
