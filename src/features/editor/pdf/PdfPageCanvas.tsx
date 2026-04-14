import { useEffect, useRef, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getFittedPdfViewport, type ZoomMode } from "@/features/editor/pdf/usePdfViewport";
import type { OverlayBounds } from "@/features/editor/shared/coords/normalizedCoords";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPageCanvasProps {
  src: string;
  page: number;
  onPageChange?: (nextPage: number) => void;
  onPageCountChange?: (count: number) => void;
  onBoundsChange: (bounds: OverlayBounds | null) => void;
  zoomMode?: ZoomMode;
  customScale?: number;
  onZoomPercentageChange?: (percentage: number) => void;
}

interface StageSize {
  width: number;
  height: number;
}

// 页面缓存 - 避免重复渲染
const pageCache = new Map<string, PDFPageProxy>();
const MAX_CACHE_SIZE = 5;

const EPSILON = 0.5;

function hasMeaningfulBoundsChange(previous: OverlayBounds | null, next: OverlayBounds) {
  if (!previous) {
    return true;
  }

  return (
    Math.abs(previous.x - next.x) > EPSILON ||
    Math.abs(previous.y - next.y) > EPSILON ||
    Math.abs(previous.width - next.width) > EPSILON ||
    Math.abs(previous.height - next.height) > EPSILON
  );
}

export function PdfPageCanvas({
  src,
  page,
  onPageChange,
  onPageCountChange,
  onBoundsChange,
  zoomMode = "fit-page",
  customScale = 1,
  onZoomPercentageChange,
}: PdfPageCanvasProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const lastBoundsRef = useRef<OverlayBounds | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pageCount, setPageCount] = useState(1);
  const [stageSize, setStageSize] = useState<StageSize>({ width: 0, height: 0 });
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);

  // 容器尺寸测量
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const applyMeasure = () => {
      const width = root.clientWidth;
      const height = root.clientHeight;

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

    const resizeObserver = new ResizeObserver(() => scheduleMeasure());
    resizeObserver.observe(root);
    scheduleMeasure();

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      resizeObserver.disconnect();
    };
  }, []);

  // PDF 文档加载
  useEffect(() => {
    let cancelled = false;
    const loadingTask = getDocument(src);

    const loadPdf = async () => {
      try {
        setStatus("loading");
        setLoadingProgress(0);

        // 监听加载进度
        loadingTask.onProgress = (progress) => {
          if (!cancelled && progress.total > 0) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setLoadingProgress(percent);
          }
        };

        const pdf = await loadingTask.promise;

        if (cancelled) {
          return;
        }

        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        onPageCountChange?.(pdf.numPages);
        setLoadingProgress(null);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setLoadingProgress(null);
        }
      }
    };

    void loadPdf();

    return () => {
      cancelled = true;
      onBoundsChange(null);
      void loadingTask.destroy();
      pdfRef.current = null;
      lastBoundsRef.current = null;
      setLoadingProgress(null);
    };
  }, [onBoundsChange, onPageCountChange, src]);

  // 页面渲染（带缓存）
  useEffect(() => {
    let cancelled = false;

    const renderPdfPage = async () => {
      const pdf = pdfRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas || stageSize.width <= 0 || stageSize.height <= 0) {
        return;
      }

      const targetPage = Math.max(1, Math.min(page, pageCount));

      try {
        setStatus("loading");

        // 使用缓存的页面（如果存在）
        const cacheKey = `${src}-${targetPage}`;
        let pdfPage: PDFPageProxy;

        if (pageCache.has(cacheKey)) {
          pdfPage = pageCache.get(cacheKey)!;
        } else {
          pdfPage = await pdf.getPage(targetPage);

          // 添加到缓存
          if (pageCache.size >= MAX_CACHE_SIZE) {
            // 删除最早的缓存项
            const firstKey = pageCache.keys().next().value;
            if (firstKey) {
              pageCache.delete(firstKey);
            }
          }
          pageCache.set(cacheKey, pdfPage);
        }

        const baseViewport = pdfPage.getViewport({ scale: 1 });
        const fitted = getFittedPdfViewport({
          containerWidth: stageSize.width,
          containerHeight: stageSize.height,
          pageWidth: baseViewport.width,
          pageHeight: baseViewport.height,
          zoomMode,
          customScale,
        });

        if (!fitted || cancelled) {
          return;
        }

        const renderScale = fitted.width / baseViewport.width;
        const viewport = pdfPage.getViewport({ scale: renderScale });
        const context = canvas.getContext("2d");

        if (!context || cancelled) {
          return;
        }

        const devicePixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.floor(viewport.width * devicePixelRatio));
        canvas.height = Math.max(1, Math.floor(viewport.height * devicePixelRatio));
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        canvas.style.left = `${fitted.x}px`;
        canvas.style.top = `${fitted.y}px`;

        context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        await pdfPage.render({
          canvasContext: context,
          viewport,
        }).promise;

        if (cancelled) {
          return;
        }

        if (hasMeaningfulBoundsChange(lastBoundsRef.current, fitted)) {
          lastBoundsRef.current = fitted;
          onBoundsChange(fitted);
        }

        // 计算并报告缩放百分比
        if (onZoomPercentageChange) {
          const zoomPercentage = Math.round(renderScale * 100);
          onZoomPercentageChange(zoomPercentage);
        }

        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    };

    void renderPdfPage();

    return () => {
      cancelled = true;
    };
  }, [onBoundsChange, page, pageCount, stageSize.height, stageSize.width, src, zoomMode, customScale, onZoomPercentageChange]);

  const currentPage = Math.max(1, Math.min(page, pageCount));

  const changePage = (nextPage: number) => {
    if (!onPageChange) {
      return;
    }

    onPageChange(Math.max(1, Math.min(nextPage, pageCount)));
  };

  return (
    <div ref={rootRef} className="relative h-full w-full overflow-hidden rounded-xl bg-muted/20">
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/50">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          {loadingProgress !== null ? (
            <p className="text-[12px] text-muted-foreground">Loading PDF... {loadingProgress}%</p>
          ) : (
            <p className="text-[12px] text-muted-foreground">Loading PDF preview...</p>
          )}
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[12px] text-muted-foreground">Unable to render PDF preview.</p>
        </div>
      )}

      <canvas ref={canvasRef} className="absolute bg-card" />

      <div className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-md border border-border/70 bg-card/95 px-2 py-1 text-[11px] shadow-sm backdrop-blur">
        <button
          type="button"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          onClick={() => changePage(currentPage - 1)}
          disabled={!onPageChange || currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>

        <span className="min-w-[72px] text-center text-foreground">
          Page {currentPage} / {pageCount}
        </span>

        <button
          type="button"
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          onClick={() => changePage(currentPage + 1)}
          disabled={!onPageChange || currentPage >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}