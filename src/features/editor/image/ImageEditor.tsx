import { useCallback, useEffect, useRef, useState, type WheelEvent } from "react";
import { RefreshCcw, ZoomIn, ZoomOut } from "lucide-react";
import { ImageStage } from "@/features/editor/image/ImageStage";
import { ImageAnnotationOverlay } from "@/features/editor/image/ImageAnnotationOverlay";
import { useImageInteractions } from "@/features/editor/image/useImageInteractions";
import { useAnnotationColors } from "@/features/editor/shared/state/useAnnotationColors";
import type { OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";
import type { CreateAnnotationPayload, NormalizedAnnotation, ToolMode } from "@/features/editor/shared/types/annotation";
import { sanitizeAnnotationColor } from "@/features/editor/shared/colors/annotationColor";
import { cn } from "@/lib/utils";

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

  const applyZoom = useCallback((delta: number, anchorX: number, anchorY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();

    setTransform((current) => {
      const clampedZoom = clampZoom(Number((current.zoom + delta).toFixed(3)));
      const worldX = (anchorX - current.panX) / current.zoom;
      const worldY = (anchorY - current.panY) / current.zoom;
      const nextPanX = anchorX - worldX * clampedZoom;
      const nextPanY = anchorY - worldY * clampedZoom;

      return clampPan(clampedZoom, nextPanX, nextPanY, rect.width, rect.height);
    });
  }, []);

  const stepZoom = useCallback((delta: number) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const anchorX = rect.width / 2;
    const anchorY = rect.height / 2;
    applyZoom(delta, anchorX, anchorY);
  }, [applyZoom]);

  const resetZoom = useCallback(() => {
    setTransform({
      zoom: 1,
      panX: 0,
      panY: 0,
    });
  }, []);

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
    applyZoom(delta, cursorX, cursorY);
  }, [applyZoom]);

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
        <div className="pointer-events-auto inline-flex items-center gap-1">
          <button
            type="button"
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              transform.zoom <= MIN_ZOOM + 0.001 && "cursor-not-allowed opacity-40",
            )}
            onClick={() => stepZoom(-0.12)}
            title="Zoom out (Ctrl/Cmd + mouse wheel)"
            disabled={transform.zoom <= MIN_ZOOM + 0.001}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
            onClick={resetZoom}
            title="Reset zoom"
          >
            {Math.round(transform.zoom * 100)}%
          </button>
          <button
            type="button"
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              transform.zoom >= MAX_ZOOM - 0.001 && "cursor-not-allowed opacity-40",
            )}
            onClick={() => stepZoom(0.12)}
            title="Zoom in (Ctrl/Cmd + mouse wheel)"
            disabled={transform.zoom >= MAX_ZOOM - 0.001}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={resetZoom}
            title="Reset zoom to 100%"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
