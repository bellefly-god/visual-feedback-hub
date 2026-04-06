import { useEffect, useRef, useState } from "react";
import type { OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";

interface ImageStageProps {
  src: string;
  onBoundsChange: (bounds: OverlayBounds | null) => void;
}

interface StageSize {
  width: number;
  height: number;
}

const EPSILON = 0.5;

function hasMeaningfulDiff(a: OverlayBounds | null, b: OverlayBounds) {
  if (!a) {
    return true;
  }

  return (
    Math.abs(a.x - b.x) > EPSILON ||
    Math.abs(a.y - b.y) > EPSILON ||
    Math.abs(a.width - b.width) > EPSILON ||
    Math.abs(a.height - b.height) > EPSILON
  );
}

export function ImageStage({ src, onBoundsChange }: ImageStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastBoundsRef = useRef<OverlayBounds | null>(null);
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [naturalSize, setNaturalSize] = useState<StageSize>({ width: 0, height: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const applyMeasure = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;

      setStageSize((current) => {
        if (Math.abs(current.width - width) < EPSILON && Math.abs(current.height - height) < EPSILON) {
          return current;
        }

        return { width, height };
      });
    };

    const scheduleMeasure = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        applyMeasure();
      });
    };

    const observer = new ResizeObserver(() => scheduleMeasure());
    observer.observe(host);
    scheduleMeasure();

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const image = imageRef.current;

    if (!image) {
      return;
    }

    const updateNaturalSize = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      setNaturalSize({ width, height });
    };

    if (image.complete) {
      updateNaturalSize();
    } else {
      image.addEventListener("load", updateNaturalSize);
    }

    return () => {
      image.removeEventListener("load", updateNaturalSize);
    };
  }, [src]);

  useEffect(() => {
    const { width: containerWidth, height: containerHeight } = stageSize;
    const { width: naturalWidth, height: naturalHeight } = naturalSize;

    if (containerWidth <= 0 || containerHeight <= 0 || naturalWidth <= 0 || naturalHeight <= 0) {
      onBoundsChange(null);
      return;
    }

    const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
    const renderedWidth = naturalWidth * scale;
    const renderedHeight = naturalHeight * scale;
    const bounds: OverlayBounds = {
      x: (containerWidth - renderedWidth) / 2,
      y: (containerHeight - renderedHeight) / 2,
      width: renderedWidth,
      height: renderedHeight,
    };

    if (!hasMeaningfulDiff(lastBoundsRef.current, bounds)) {
      return;
    }

    lastBoundsRef.current = bounds;
    onBoundsChange(bounds);
  }, [naturalSize, onBoundsChange, stageSize]);

  return (
    <div ref={hostRef} className="relative h-full w-full overflow-hidden rounded-xl bg-muted/20">
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
