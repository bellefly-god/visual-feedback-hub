import type { AssetType } from "@/types/feedback";
import { PdfPreview } from "@/components/feedback/PdfPreview";

interface AssetPreviewProps {
  assetType: AssetType;
  assetUrl: string;
  page?: number;
  onPageChange?: (nextPage: number) => void;
  onPageCountChange?: (count: number) => void;
}

export function AssetPreview({ assetType, assetUrl, page, onPageChange, onPageCountChange }: AssetPreviewProps) {
  if (!assetUrl) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-gradient-to-br from-muted/30 to-background">
        <p className="text-[13px] text-muted-foreground/30">Your design appears here</p>
      </div>
    );
  }

  if (assetType === "pdf") {
    return (
      <PdfPreview
        src={assetUrl}
        page={page}
        onPageChange={onPageChange}
        onPageCountChange={onPageCountChange}
      />
    );
  }

  return (
    <div className="h-full w-full overflow-hidden rounded-xl bg-muted/20">
      <img src={assetUrl} alt="Uploaded asset preview" className="h-full w-full object-contain" />
    </div>
  );
}
