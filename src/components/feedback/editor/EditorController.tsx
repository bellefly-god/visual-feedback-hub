import { useCallback, useEffect, useMemo, useState, type WheelEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Save, Share2, ZoomIn, ZoomOut } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { AnnotationToolbar } from "@/components/feedback/AnnotationToolbar";
import { ShareLinkCard } from "@/components/feedback/ShareLinkCard";
import { Button } from "@/components/ui/button";
import { DEMO_PROJECT_ID, normalizeProjectId, routePaths } from "@/lib/routePaths";
import { feedbackGateway } from "@/services/feedbackGateway";
import type { CommentView } from "@/types/feedback";
import { AnnotationCanvas, type CreateAnnotationPayload, type NormalizedAnnotation } from "@/components/feedback/editor/AnnotationCanvas";
import { AssetRenderer } from "@/components/feedback/editor/AssetRenderer";
import { CommentSidebar } from "@/components/feedback/editor/CommentSidebar";
import { toToolMode, type AnnotationShapeMode, type ToolMode } from "@/components/feedback/editor/toolMode";
import type { CanvasContentBounds } from "@/components/feedback/editor/contentBounds";

type PendingAnnotation = CreateAnnotationPayload & {
  page?: number;
};

const DRAFT_ANNOTATION_ID = "draft-annotation";

export function EditorController() {
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [projectName, setProjectName] = useState("Homepage Redesign v2");
  const [assetType, setAssetType] = useState<"image" | "pdf" | "screenshot">("screenshot");
  const [assetUrl, setAssetUrl] = useState("");
  const [comments, setComments] = useState<CommentView[]>([]);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>("pin");
  const [draftComment, setDraftComment] = useState("");
  const [pendingAnnotation, setPendingAnnotation] = useState<PendingAnnotation | null>(null);
  const [currentPdfPage, setCurrentPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const [contentBounds, setContentBounds] = useState<CanvasContentBounds | null>(null);
  const isDebugEnabled = import.meta.env.DEV;

  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();

  const resolvedProjectId = normalizeProjectId(projectId ?? DEMO_PROJECT_ID);
  const stateProjectName = (location.state as { projectName?: string } | null)?.projectName;
  const isCommentMode = toolMode === "pin";

  const debugLog = useCallback(
    (...args: unknown[]) => {
      if (isDebugEnabled) {
        console.log("[EditorController]", ...args);
      }
    },
    [isDebugEnabled],
  );

  const visibleComments = useMemo(() => {
    if (assetType !== "pdf") {
      return comments;
    }

    return comments.filter((comment) => (comment.page ?? 1) === currentPdfPage);
  }, [assetType, comments, currentPdfPage]);

  const activeComment = visibleComments.find((comment) => comment.id === activeCommentId) ?? null;

  const canvasAnnotations = useMemo<NormalizedAnnotation[]>(() => {
    const savedAnnotations: NormalizedAnnotation[] = visibleComments.map((comment) => ({
      id: comment.id,
      shapeType: comment.shapeType,
      x: comment.x,
      y: comment.y,
      width: comment.width,
      height: comment.height,
      pinNumber: comment.pinNumber,
    }));

    if (!pendingAnnotation) {
      return savedAnnotations;
    }

    return [
      ...savedAnnotations,
      {
        id: DRAFT_ANNOTATION_ID,
        shapeType: pendingAnnotation.shapeType,
        x: pendingAnnotation.x,
        y: pendingAnnotation.y,
        width: pendingAnnotation.width,
        height: pendingAnnotation.height,
      },
    ];
  }, [pendingAnnotation, visibleComments]);

  const reviewPath = useMemo(() => {
    return routePaths.review(shareToken ?? `share-${resolvedProjectId}`);
  }, [resolvedProjectId, shareToken]);

  const shareLink = useMemo(() => `${window.location.origin}${reviewPath}`, [reviewPath]);
  const assetSessionKey = useMemo(() => {
    const base = `${assetType}:${assetUrl || "empty"}`;
    if (assetType !== "pdf") {
      return base;
    }

    return `${base}:page-${currentPdfPage}`;
  }, [assetType, assetUrl, currentPdfPage]);

  const clampZoom = (value: number) => Math.max(0.5, Math.min(3, value));

  const stepZoom = (delta: number) => {
    setZoomLevel((current) => clampZoom(Number((current + delta).toFixed(2))));
  };

  useEffect(() => {
    if (projectId && projectId !== resolvedProjectId) {
      navigate(routePaths.editor(resolvedProjectId), { replace: true });
    }
  }, [navigate, projectId, resolvedProjectId]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const ensuredProject = await feedbackGateway.ensureProject({
        projectId: resolvedProjectId,
        title: stateProjectName,
      });
      const nextComments = await feedbackGateway.listComments(ensuredProject.id);
      const existingShareLink = await feedbackGateway.getShareLinkByProjectId(ensuredProject.id);

      if (!isMounted) {
        return;
      }

      setProjectName(ensuredProject.title);
      setAssetType(ensuredProject.assetType);
      setAssetUrl(ensuredProject.assetUrl);
      setComments(nextComments);
      setShareToken(existingShareLink?.token ?? null);
      setActiveCommentId((current) => {
        if (current && nextComments.some((comment) => comment.id === current)) {
          return current;
        }

        return nextComments[0]?.id ?? null;
      });
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [resolvedProjectId, stateProjectName]);

  useEffect(() => {
    setActiveCommentId((current) => {
      if (current && visibleComments.some((comment) => comment.id === current)) {
        return current;
      }

      return visibleComments[0]?.id ?? null;
    });
  }, [visibleComments]);

  useEffect(() => {
    if (assetType !== "pdf") {
      setCurrentPdfPage(1);
      setPdfPageCount(1);
      return;
    }

    if (pendingAnnotation?.page && pendingAnnotation.page !== currentPdfPage) {
      setPendingAnnotation(null);
    }
  }, [assetType, currentPdfPage, pendingAnnotation?.page]);

  useEffect(() => {
    setContentBounds(null);
  }, [assetType, assetUrl, currentPdfPage]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) {
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setZoomLevel((current) => clampZoom(Number((current + 0.1).toFixed(2))));
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        setZoomLevel((current) => clampZoom(Number((current - 0.1).toFixed(2))));
      } else if (event.key === "0") {
        event.preventDefault();
        setZoomLevel(1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    debugLog("active tool changed", toolMode);
  }, [debugLog, toolMode]);

  useEffect(() => {
    if (assetType !== "pdf") {
      return;
    }

    debugLog("page change", {
      page: currentPdfPage,
      pageCount: pdfPageCount,
    });
  }, [assetType, currentPdfPage, debugLog, pdfPageCount]);

  const applyNextComments = (nextComments: CommentView[]) => {
    setComments(nextComments);
    setActiveCommentId((current) => {
      if (current && nextComments.some((comment) => comment.id === current)) {
        return current;
      }

      return nextComments[0]?.id ?? null;
    });
  };

  const handleSaveFeedback = async () => {
    setSaveState("saving");
    await feedbackGateway.saveProjectFeedback(resolvedProjectId);
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 1200);
  };

  const handleCreateShare = async () => {
    try {
      const created = await feedbackGateway.getOrCreateShareLink(resolvedProjectId);
      setShareToken(created.token);
      setEditorMessage(null);
      setShowShare(true);
    } catch (error) {
      if (error instanceof Error && error.message === "COMMENTS_REQUIRED_BEFORE_SHARING") {
        setEditorMessage("Add at least one comment before generating a share link.");
        return;
      }

      setEditorMessage("Unable to generate share link right now.");
    }
  };

  const handleCanvasWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    stepZoom(event.deltaY < 0 ? 0.1 : -0.1);
  };

  const handleCreateAnnotation = (payload: CreateAnnotationPayload) => {
    debugLog("annotation creation requested", payload);
    setPendingAnnotation({
      ...payload,
      page: assetType === "pdf" ? currentPdfPage : undefined,
    });
    setToolMode("pin");
    setEditorMessage("Annotation placed. Add comment text and save.");
  };

  const handleSubmitComment = async () => {
    const content = draftComment.trim();

    if (!content || !pendingAnnotation) {
      return;
    }

    const shapeType: AnnotationShapeMode = pendingAnnotation.shapeType;

    const nextComments = await feedbackGateway.createComment({
      projectId: resolvedProjectId,
      content,
      x: pendingAnnotation.x,
      y: pendingAnnotation.y,
      width: shapeType === "pin" ? undefined : pendingAnnotation.width,
      height: shapeType === "pin" ? undefined : pendingAnnotation.height,
      page: pendingAnnotation.page,
      authorName: "You",
      shapeType,
    });

    applyNextComments(nextComments);
    setDraftComment("");
    setPendingAnnotation(null);
    setEditorMessage(null);
    setActiveCommentId(nextComments[nextComments.length - 1]?.id ?? null);
  };

  const handleMarkFixed = async () => {
    if (!activeComment) {
      return;
    }

    try {
      const nextComments = await feedbackGateway.updateCommentStatus(activeComment.id, "fixed");
      applyNextComments(nextComments);
      setEditorMessage("Comment marked as fixed.");
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_STATUS_TRANSITION") {
        setEditorMessage("This comment cannot be moved to fixed from current status.");
        return;
      }

      setEditorMessage("Unable to update status right now.");
    }
  };

  const cursorClass = toolMode === "select" ? "cursor-default" : "cursor-crosshair";

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navbar />

      <div className="flex items-center justify-between border-b border-border/60 bg-card px-5 py-2.5">
        <div className="flex items-center gap-3">
          <button
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <span className="h-4 w-px bg-border" />
          <h2 className="text-[13px] font-medium text-foreground">{projectName}</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <AnnotationToolbar
            activeTool={toolMode}
            onToolChange={(tool) => {
              const nextMode = toToolMode(tool);
              setToolMode(nextMode);
              setEditorMessage(
                nextMode === "pin"
                  ? "Click to place pin or draw first, then add comment."
                  : nextMode === "select"
                    ? "Select an existing annotation."
                    : "Drag on the canvas to draw annotation.",
              );
            }}
          />

          <div className="inline-flex items-center rounded-lg border border-border/60">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => stepZoom(-0.1)}
              title="Zoom out (Ctrl/Cmd + -)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[52px] px-2 text-center text-[11px] text-muted-foreground">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => stepZoom(0.1)}
              title="Zoom in (Ctrl/Cmd + +)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          <span className="h-4 w-px bg-border" />

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-[13px] text-muted-foreground"
            onClick={handleSaveFeedback}
            disabled={saveState === "saving"}
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Save"}
          </Button>

          <Button size="sm" className="h-8 rounded-lg text-[13px]" onClick={handleCreateShare}>
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            Share
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <CommentSidebar
          comments={visibleComments}
          activeCommentId={activeCommentId}
          activeComment={activeComment}
          isCommentMode={isCommentMode}
          hasPendingAnnotation={Boolean(pendingAnnotation)}
          draftComment={draftComment}
          onDraftCommentChange={setDraftComment}
          onSelectComment={(commentId) => {
            debugLog("selection changed", { selectedAnnotationId: commentId });
            setActiveCommentId(commentId);
          }}
          onRequestPinMode={() => {
            setToolMode("pin");
            setEditorMessage("Click to place annotation, then add comment.");
          }}
          onSubmitComment={() => void handleSubmitComment()}
          onCancelDraft={() => {
            setDraftComment("");
            setPendingAnnotation(null);
            setToolMode("select");
          }}
          onMarkFixed={() => void handleMarkFixed()}
        />

        <div className="relative flex-1 overflow-auto p-10">
          <div className="mx-auto aspect-[16/10] max-w-4xl rounded-xl border border-border/60 bg-card">
            <div
              className={`relative h-full w-full rounded-xl bg-gradient-to-br from-muted/30 to-background ${cursorClass}`}
              onWheel={handleCanvasWheel}
            >
              <div className="h-full w-full overflow-auto">
                <div className="relative h-full w-full" style={{ zoom: zoomLevel }}>
                  <AssetRenderer
                    assetType={assetType}
                    assetUrl={assetUrl}
                    page={assetType === "pdf" ? currentPdfPage : undefined}
                    onPageChange={assetType === "pdf" ? setCurrentPdfPage : undefined}
                    onPageCountChange={assetType === "pdf" ? setPdfPageCount : undefined}
                    onContentBoundsChange={setContentBounds}
                  />

                  <AnnotationCanvas
                    mode="editor"
                    toolMode={toolMode}
                    assetSessionKey={assetSessionKey}
                    annotations={canvasAnnotations}
                    selectedAnnotationId={activeCommentId}
                    contentBounds={contentBounds}
                    onSelectAnnotation={(annotationId) => {
                      debugLog("selection changed", { selectedAnnotationId: annotationId });
                      if (!annotationId || annotationId === DRAFT_ANNOTATION_ID) {
                        setActiveCommentId(null);
                        return;
                      }

                      setActiveCommentId(annotationId);
                    }}
                    onCreateAnnotation={handleCreateAnnotation}
                  />
                </div>
              </div>
            </div>
          </div>

          {assetType === "pdf" && (
            <p className="mt-2 text-center text-[12px] text-muted-foreground">
              Viewing page {currentPdfPage} of {pdfPageCount}.
            </p>
          )}

          {editorMessage && <p className="mt-3 text-center text-[12px] text-muted-foreground">{editorMessage}</p>}
        </div>
      </div>

      {showShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/10 backdrop-blur-sm">
          <ShareLinkCard link={shareLink} reviewPath={reviewPath} onClose={() => setShowShare(false)} />
        </div>
      )}
    </div>
  );
}
