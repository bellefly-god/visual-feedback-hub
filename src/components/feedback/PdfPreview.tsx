import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  hasMeaningfulBoundsChange,
  type CanvasContentBounds,
} from "@/components/feedback/editor/contentBounds";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPreviewProps {
  src: string;
  page?: number;
  onPageChange?: (nextPage: number) => void;
  onPageCountChange?: (count: number) => void;
  onContentBoundsChange?: (bounds: CanvasContentBounds | null) => void;
}

export function PdfPreview({
  src,
  page = 1,
  onPageChange,
  onPageCountChange,
  onContentBoundsChange,
}: PdfPreviewProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const boundsFrameRef = useRef<number | null>(null);
  const lastBoundsRef = useRef<CanvasContentBounds | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    lastBoundsRef.current = null;

    const measureAndNotify = () => {
      const width = root.clientWidth;
      const height = root.clientHeight;

      if (width <= 0 || height <= 0) {
        return;
      }

      const nextBounds: CanvasContentBounds = {
        x: 0,
        y: 0,
        width,
        height,
      };

      if (!hasMeaningfulBoundsChange(lastBoundsRef.current, nextBounds)) {
        return;
      }

      lastBoundsRef.current = nextBounds;
      onContentBoundsChange?.(nextBounds);
    };

    const scheduleMeasure = () => {
      if (boundsFrameRef.current !== null) {
        return;
      }

      boundsFrameRef.current = requestAnimationFrame(() => {
        boundsFrameRef.current = null;
        measureAndNotify();
      });
    };

    const resizeObserver = new ResizeObserver(() => scheduleMeasure());
    resizeObserver.observe(root);
    scheduleMeasure();

    return () => {
      if (boundsFrameRef.current !== null) {
        cancelAnimationFrame(boundsFrameRef.current);
        boundsFrameRef.current = null;
      }
      resizeObserver.disconnect();
    };
  }, [onContentBoundsChange, src]);

  useEffect(() => {
    let cancelled = false;
    const loadingTask = getDocument(src);

    const loadPdf = async () => {
      try {
        setStatus("loading");
        const pdf = await loadingTask.promise;

        if (cancelled) {
          return;
        }

        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        onPageCountChange?.(pdf.numPages);
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    };

    void loadPdf();

    return () => {
      cancelled = true;
      void loadingTask.destroy();
      pdfRef.current = null;
    };
  }, [src, onPageCountChange]);

  useEffect(() => {
    let cancelled = false;

    const renderPdfPage = async () => {
      const pdf = pdfRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas) {
        return;
      }

      const targetPage = Math.max(1, Math.min(page, pageCount));

      try {
        setStatus("loading");
        const pdfPage = await pdf.getPage(targetPage);
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        const context = canvas.getContext("2d");

        if (!context || cancelled) {
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pdfPage.render({ canvasContext: context, viewport }).promise;

        if (!cancelled) {
          setStatus("ready");
        }
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
  }, [page, pageCount, src]);

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
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[12px] text-muted-foreground">Loading PDF preview...</p>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[12px] text-muted-foreground">Unable to render PDF preview.</p>
        </div>
      )}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full bg-card" />
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
