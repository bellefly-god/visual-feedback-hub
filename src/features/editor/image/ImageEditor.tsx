import { useCallback, useEffect, useRef, useState, type WheelEvent } from "react";
import { ImageStage } from "@/features/editor/image/ImageStage";
import { ImageAnnotationOverlay } from "@/features/editor/image/ImageAnnotationOverlay";
import { useImageInteractions } from "@/features/editor/image/useImageInteractions";
import { useAnnotationColors } from "@/features/editor/shared/state/useAnnotationColors";
import type { OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";
import type { CreateAnnotationPayload, NormalizedAnnotation, ToolMode } from "@/features/editor/shared/types/annotation";
import { sanitizeAnnotationColor } from "@/features/editor/shared/colors/annotationColor";

interface ImageEditorProps {
  mode: "editor" | "review";
  assetUrl: string;
  toolMode: ToolMode;
  activeColor: string;
  annotations: NormalizedAnnotation[];
  selectedAnnotationId: string | null;
  onSelectAnnotation: (annotationId: string | null) => void;
  onCreateAnnotation?: (payload: CreateAnnotationPayload) => void;
}

interface TransformState {
  zoom: number;
  panX: number;
  panY: number;
}

const MIN_ZOOM = 0.6;
const MAX_ZOOM = 3;

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

function clampPan(zoom: number, panX: number, panY: number, width: number, height: number): TransformState {
  const scaledWidth = width * zoom;
  const scaledHeight = height * zoom;

  let nextPanX = panX;
  let nextPanY = panY;

  if (scaledWidth <= width) {
    nextPanX = (width - scaledWidth) / 2;
  } else {
    nextPanX = Math.min(0, Math.max(width - scaledWidth, panX));
  }

  if (scaledHeight <= height) {
    nextPanY = (height - scaledHeight) / 2;
  } else {
    nextPanY = Math.min(0, Math.max(height - scaledHeight, panY));
  }

  return {
    zoom,
    panX: nextPanX,
    panY: nextPanY,
  };
}

export function ImageEditor({
  mode,
  assetUrl,
  toolMode,
  activeColor,
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onCreateAnnotation,
}: ImageEditorProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [bounds, setBounds] = useState<OverlayBounds | null>(null);
  const [transform, setTransform] = useState<TransformState>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  const safeColor = sanitizeAnnotationColor(activeColor);
  const colors = useAnnotationColors();
  const { handlers, preview } = useImageInteractions({
    mode,
    toolMode,
    bounds,
    activeColor: safeColor,
    interactionScale: transform.zoom,
    onSelectAnnotation,
    onCreateAnnotation,
  });

  useEffect(() => {
    setTransform({
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  }, [assetUrl]);

  const handleWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = viewport.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const delta = event.deltaY < 0 ? 0.12 : -0.12;

    setTransform((current) => {
      const nextZoom = clampZoom(Number((current.zoom + delta).toFixed(3)));
      const worldX = (cursorX - current.panX) / current.zoom;
      const worldY = (cursorY - current.panY) / current.zoom;
      const nextPanX = cursorX - worldX * nextZoom;
      const nextPanY = cursorY - worldY * nextZoom;

      return clampPan(nextZoom, nextPanX, nextPanY, rect.width, rect.height);
    });
  }, []);

  if (!assetUrl) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-gradient-to-br from-muted/30 to-background">
        <p className="text-[13px] text-muted-foreground/30">Your design appears here</p>
      </div>
    );
  }

  return (
    <div ref={viewportRef} className="relative h-full w-full overflow-hidden rounded-xl bg-muted/20" onWheel={handleWheel}>
      <div
        className="absolute inset-0 origin-top-left will-change-transform"
        style={{ transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom})` }}
      >
        <ImageStage src={assetUrl} onBoundsChange={setBounds} />
        <ImageAnnotationOverlay
          mode={mode}
          toolMode={toolMode}
          bounds={bounds}
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          colors={colors}
          preview={preview}
          onSelectAnnotation={onSelectAnnotation}
          onPointerDown={handlers.onPointerDown}
          onPointerMove={handlers.onPointerMove}
          onPointerUp={handlers.onPointerUp}
          onPointerCancel={handlers.onPointerCancel}
        />
      </div>

      <div className="pointer-events-none absolute bottom-2 right-2 rounded-md border border-border/70 bg-card/90 px-2 py-1 text-[11px] text-muted-foreground shadow-sm">
        {Math.round(transform.zoom * 100)}%
      </div>
    </div>
  );
}
