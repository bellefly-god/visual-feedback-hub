import type { AssetType } from "@/types/feedback";
import { PdfPreview } from "@/components/feedback/PdfPreview";
import { useEffect, useRef } from "react";
import {
  hasMeaningfulBoundsChange,
  type CanvasContentBounds,
} from "@/components/feedback/editor/contentBounds";

interface AssetPreviewProps {
  assetType: AssetType;
  assetUrl: string;
  page?: number;
  onPageChange?: (nextPage: number) => void;
  onPageCountChange?: (count: number) => void;
  onContentBoundsChange?: (bounds: CanvasContentBounds | null) => void;
}

function ImagePreview({
  src,
  onContentBoundsChange,
}: {
  src: string;
  onContentBoundsChange?: (bounds: CanvasContentBounds | null) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastBoundsRef = useRef<CanvasContentBounds | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const image = imageRef.current;

    if (!wrapper || !image) {
      return;
    }

    lastBoundsRef.current = null;

    const measureAndNotify = () => {
      const containerWidth = wrapper.clientWidth;
      const containerHeight = wrapper.clientHeight;
      const naturalWidth = image.naturalWidth;
      const naturalHeight = image.naturalHeight;

      if (containerWidth <= 0 || containerHeight <= 0 || naturalWidth <= 0 || naturalHeight <= 0) {
        return;
      }

      const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
      const renderedWidth = naturalWidth * scale;
      const renderedHeight = naturalHeight * scale;
      const offsetX = (containerWidth - renderedWidth) / 2;
      const offsetY = (containerHeight - renderedHeight) / 2;
      const nextBounds: CanvasContentBounds = {
        x: offsetX,
        y: offsetY,
        width: renderedWidth,
        height: renderedHeight,
      };

      if (!hasMeaningfulBoundsChange(lastBoundsRef.current, nextBounds)) {
        return;
      }

      lastBoundsRef.current = nextBounds;
      onContentBoundsChange?.(nextBounds);
    };

    const scheduleMeasure = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        measureAndNotify();
      });
    };

    const resizeObserver = new ResizeObserver(() => scheduleMeasure());
    resizeObserver.observe(wrapper);

    if (image.complete) {
      scheduleMeasure();
    } else {
      image.addEventListener("load", scheduleMeasure);
    }

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      resizeObserver.disconnect();
      image.removeEventListener("load", scheduleMeasure);
    };
  }, [onContentBoundsChange, src]);

  return (
    <div ref={wrapperRef} className="h-full w-full overflow-hidden rounded-xl bg-muted/20">
      <img
        ref={imageRef}
        src={src}
        alt="Uploaded asset preview"
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
}

export function AssetPreview({
  assetType,
  assetUrl,
  page,
  onPageChange,
  onPageCountChange,
  onContentBoundsChange,
}: AssetPreviewProps) {
  useEffect(() => {
    if (!assetUrl) {
      onContentBoundsChange?.(null);
    }
  }, [assetUrl, onContentBoundsChange]);

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
        onContentBoundsChange={onContentBoundsChange}
      />
    );
  }

  return <ImagePreview src={assetUrl} onContentBoundsChange={onContentBoundsChange} />;
}
