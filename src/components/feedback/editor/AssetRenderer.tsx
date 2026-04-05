import { AssetPreview } from "@/components/feedback/AssetPreview";
import type { AssetType } from "@/types/feedback";

interface AssetRendererProps {
  assetType: AssetType;
  assetUrl: string;
  page?: number;
  onPageChange?: (nextPage: number) => void;
  onPageCountChange?: (count: number) => void;
}

export function AssetRenderer({
  assetType,
  assetUrl,
  page,
  onPageChange,
  onPageCountChange,
}: AssetRendererProps) {
  return (
    <AssetPreview
      assetType={assetType}
      assetUrl={assetUrl}
      page={page}
      onPageChange={onPageChange}
      onPageCountChange={onPageCountChange}
    />
  );
}
