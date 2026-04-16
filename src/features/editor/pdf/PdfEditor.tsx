import { useState, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import { PdfPageCanvas } from "@/features/editor/pdf/PdfPageCanvas";
import { PdfAnnotationOverlay } from "@/features/editor/pdf/PdfAnnotationOverlay";
import { usePdfInteractions } from "@/features/editor/pdf/usePdfInteractions";
import { useAnnotationColors } from "@/features/editor/shared/state/useAnnotationColors";
import type { OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";
import type { CreateAnnotationPayload, NormalizedAnnotation, ToolMode } from "@/features/editor/shared/types/annotation";
import type { ZoomMode } from "@/features/editor/pdf/usePdfViewport";

interface PdfEditorProps {
  mode: "editor" | "review";
  assetUrl: string;
  page: number;
  toolMode: ToolMode;
  annotations: NormalizedAnnotation[];
  selectedAnnotationId: string | null;
  onPageChange?: (nextPage: number) => void;
  onPageCountChange?: (count: number) => void;
  onSelectAnnotation: (annotationId: string | null) => void;
  onCreateAnnotation?: (payload: CreateAnnotationPayload) => void;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
}

const ZOOM_MODES: { mode: ZoomMode; label: string; icon: React.ReactNode }[] = [
  { mode: "fit-page", label: "Fit Page", icon: <Maximize2 className="h-3.5 w-3.5" /> },
  { mode: "fit-width", label: "Fit Width", icon: <Maximize2 className="h-3.5 w-3.5 rotate-90" /> },
];

export function PdfEditor({
  mode,
  assetUrl,
  page,
  toolMode,
  annotations,
  selectedAnnotationId,
  onPageChange,
  onPageCountChange,
  onSelectAnnotation,
  onCreateAnnotation,
}: PdfEditorProps) {
  const [bounds, setBounds] = useState<OverlayBounds | null>(null);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit-page");
  const [customScale, setCustomScale] = useState(1);
  const [zoomPercentage, setZoomPercentage] = useState(100);
  // 平移状态
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const colors = useAnnotationColors();
  const { handlers, preview } = usePdfInteractions({
    mode,
    toolMode,
    bounds,
    activeColor: colors.stroke,
    onSelectAnnotation,
    onCreateAnnotation,
  });

  const handleZoomModeChange = (newMode: ZoomMode) => {
    setZoomMode(newMode);
    setCustomScale(1); // Reset custom scale when changing mode
    setPanOffset({ x: 0, y: 0 }); // Reset pan when changing zoom mode
  };

  const handleZoomIn = () => {
    setCustomScale((prev) => Math.min(prev + 0.25, 3));
    // 缩放时不重置平移，让用户可以继续查看之前的位置
  };

  const handleZoomOut = () => {
    setCustomScale((prev) => Math.max(prev - 0.25, 0.25));
    // 缩放时不重置平移，让用户可以继续查看之前的位置
  };

  // 重置平移
  const handleResetPan = () => {
    setPanOffset({ x: 0, y: 0 });
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 只有在编辑器获得焦点时才响应
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Ctrl/Cmd + 加号 = 放大
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        handleZoomIn();
        return;
      }

      // Ctrl/Cmd + 减号 = 缩小
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
        return;
      }

      // Ctrl/Cmd + 0 = 重置缩放
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoomMode("fit-page");
        setCustomScale(1);
        setPanOffset({ x: 0, y: 0 });
        return;
      }

      // Ctrl/Cmd + 1 = Fit Page
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault();
        setZoomMode("fit-page");
        setCustomScale(1);
        setPanOffset({ x: 0, y: 0 });
        return;
      }

      // Ctrl/Cmd + 2 = Fit Width
      if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        e.preventDefault();
        setZoomMode("fit-width");
        setCustomScale(1);
        setPanOffset({ x: 0, y: 0 });
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!assetUrl) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl bg-gradient-to-br from-muted/30 to-background">
        <p className="text-[13px] text-muted-foreground/30">Your design appears here</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-muted/20">
      <div className="relative h-full w-full">
        <PdfPageCanvas
          src={assetUrl}
          page={page}
          onPageChange={onPageChange}
          onPageCountChange={onPageCountChange}
          onBoundsChange={setBounds}
          zoomMode={zoomMode}
          customScale={customScale}
          onZoomPercentageChange={setZoomPercentage}
          panOffset={panOffset}
          onPanChange={setPanOffset}
          isPanning={isPanning}
          onPanStart={() => setIsPanning(true)}
          onPanEnd={() => setIsPanning(false)}
        />

        <PdfAnnotationOverlay
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
          // 平移支持
          panOffset={panOffset}
          onPanChange={setPanOffset}
          isPanning={isPanning}
          onPanStart={() => setIsPanning(true)}
          onPanEnd={() => setIsPanning(false)}
        />
      </div>

      {/* 缩放控制工具栏 */}
      <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-md border border-border/70 bg-card/95 px-2 py-1 text-[11px] shadow-sm backdrop-blur">
        {/* 缩放模式选择 */}
        <div className="flex items-center gap-1">
          {ZOOM_MODES.map((zm) => (
            <button
              key={zm.mode}
              type="button"
              className={`rounded p-1 transition-colors ${
                zoomMode === zm.mode
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => handleZoomModeChange(zm.mode)}
              title={zm.label}
            >
              {zm.icon}
            </button>
          ))}
        </div>

        {/* 分隔线 */}
        <div className="h-4 w-px bg-border/50" />

        {/* 缩放按钮 */}
        <button
          type="button"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>

        {/* 缩放百分比显示 */}
        <span className="min-w-[40px] text-center text-foreground font-medium">
          {zoomPercentage}%
        </span>

        <button
          type="button"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>

        {/* 分隔线 */}
        <div className="h-4 w-px bg-border/50" />

        {/* 重置平移按钮 */}
        <button
          type="button"
          className={`rounded p-1 transition-colors ${
            panOffset.x !== 0 || panOffset.y !== 0
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
          onClick={handleResetPan}
          title="Reset Position"
          disabled={panOffset.x === 0 && panOffset.y === 0}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}