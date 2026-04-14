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

    // 轮询机制来等待 naturalWidth/naturalHeight 可用
    let frameId: number | null = null;
    let attempts = 0;
    const maxAttempts = 100;
    
    const tryUpdateSize = () => {
      if (!imageRef.current) {
        return;
      }
      
      const width = imageRef.current.naturalWidth;
      const height = imageRef.current.naturalHeight;
      
      if (width > 0 && height > 0) {
        setNaturalSize({ width, height });
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        frameId = requestAnimationFrame(tryUpdateSize);
      } else {
        // 轮询失败，使用默认尺寸并尝试从 src 直接加载图片来获取尺寸
        const img = new Image();
        img.onload = () => {
          if (img.width > 0 && img.height > 0) {
            setNaturalSize({ width: img.width, height: img.height });
          } else {
            // 最后的后备：使用默认 16:10 比例
            setNaturalSize({ width: 800, height: 500 });
          }
        };
        img.onerror = () => {
          setNaturalSize({ width: 800, height: 500 });
        };
        img.src = src;
      }
    };

    const updateNaturalSize = () => {
      if (!imageRef.current) return;
      setNaturalSize({ width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight });
    };

    // 立即检查是否有尺寸（如果已经加载）
    if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) {
      setNaturalSize({ width: image.naturalWidth, height: image.naturalHeight });
    } else {
      // 启动轮询来等待尺寸
      frameId = requestAnimationFrame(tryUpdateSize);
    }

    return () => {
      image.removeEventListener("load", updateNaturalSize);
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [src]);

  useEffect(() => {
    const { width: containerWidth, height: containerHeight } = stageSize;
    const { width: naturalWidth, height: naturalHeight } = naturalSize;

    // 使用 naturalSize 状态值（它包含 fallback 值）
    // 注意：如果 imageRef.current.naturalWidth 是 0，?? 不会回退，所以我们使用 naturalSize 状态
    const effectiveNaturalWidth = naturalWidth || imageRef.current?.naturalWidth || 0;
    const effectiveNaturalHeight = naturalHeight || imageRef.current?.naturalHeight || 0;

    if (containerWidth <= 0 || containerHeight <= 0 || effectiveNaturalWidth <= 0 || effectiveNaturalHeight <= 0) {
      onBoundsChange(null);
      return;
    }

    const scale = Math.min(containerWidth / effectiveNaturalWidth, containerHeight / effectiveNaturalHeight);
    const renderedWidth = effectiveNaturalWidth * scale;
    const renderedHeight = effectiveNaturalHeight * scale;
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
