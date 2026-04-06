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
import { CommentSidebar } from "@/components/feedback/editor/CommentSidebar";
import { EditorSurface } from "@/features/editor/containers/EditorSurface";
import { useToolModeState, toToolMode } from "@/features/editor/shared/state/useToolMode";
import { useSelectedAnnotationState } from "@/features/editor/shared/state/useSelectedAnnotation";
import type { AnnotationShapeMode, CreateAnnotationPayload } from "@/features/editor/shared/types/annotation";
import { DEFAULT_ANNOTATION_COLOR, sanitizeAnnotationColor } from "@/features/editor/shared/colors/annotationColor";
import {
  createDraftAnnotationId,
  commentsToAnnotations,
  isDraftAnnotationId,
  type PendingAnnotation,
  resolveSelectedCommentId,
  withPendingAnnotation,
} from "@/features/editor/shared/links/commentAnnotationLink";

interface AnnotationHistorySnapshot {
  comments: CommentView[];
  pendingAnnotation: PendingAnnotation | null;
  activeCommentId: string | null;
  draftComment: string;
}

interface AnnotationHistoryState {
  past: AnnotationHistorySnapshot[];
  future: AnnotationHistorySnapshot[];
}

const HISTORY_LIMIT = 80;

function cloneCommentViews(comments: CommentView[]): CommentView[] {
  return comments.map((comment) => ({
    ...comment,
    replies: comment.replies.map((reply) => ({ ...reply })),
  }));
}

function cloneHistorySnapshot(snapshot: AnnotationHistorySnapshot): AnnotationHistorySnapshot {
  return {
    comments: cloneCommentViews(snapshot.comments),
    pendingAnnotation: snapshot.pendingAnnotation ? { ...snapshot.pendingAnnotation } : null,
    activeCommentId: snapshot.activeCommentId,
    draftComment: snapshot.draftComment,
  };
}

export function EditorController() {
  const {
    selectedAnnotationId: activeCommentId,
    setSelectedAnnotationId: setActiveCommentId,
  } = useSelectedAnnotationState();
  const [showShare, setShowShare] = useState(false);
  const [projectName, setProjectName] = useState("Homepage Redesign v2");
  const [assetType, setAssetType] = useState<"image" | "pdf" | "screenshot">("screenshot");
  const [assetUrl, setAssetUrl] = useState("");
  const [comments, setComments] = useState<CommentView[]>([]);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const { toolMode, setToolMode } = useToolModeState("pin");
  const [draftComment, setDraftComment] = useState("");
  const [pendingAnnotation, setPendingAnnotation] = useState<PendingAnnotation | null>(null);
  const [activeAnnotationColor, setActiveAnnotationColor] = useState(DEFAULT_ANNOTATION_COLOR);
  const [currentPdfPage, setCurrentPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const [annotationHistory, setAnnotationHistory] = useState<AnnotationHistoryState>({
    past: [],
    future: [],
  });
  const isDebugEnabled = import.meta.env.DEV;

  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();

  const resolvedProjectId = normalizeProjectId(projectId ?? DEMO_PROJECT_ID);
  const stateProjectName = (location.state as { projectName?: string } | null)?.projectName;
  const isCommentMode = Boolean(pendingAnnotation);

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

  const canvasAnnotations = useMemo(
    () => withPendingAnnotation(commentsToAnnotations(visibleComments), pendingAnnotation),
    [pendingAnnotation, visibleComments],
  );

  const reviewPath = useMemo(() => {
    return routePaths.review(shareToken ?? `share-${resolvedProjectId}`);
  }, [resolvedProjectId, shareToken]);

  const shareLink = useMemo(() => `${window.location.origin}${reviewPath}`, [reviewPath]);
  const isImageEditor = assetType !== "pdf";
  const canUndo = isImageEditor && annotationHistory.past.length > 0;
  const canRedo = isImageEditor && annotationHistory.future.length > 0;

  const captureHistorySnapshot = useCallback((): AnnotationHistorySnapshot => {
    return {
      comments: cloneCommentViews(comments),
      pendingAnnotation: pendingAnnotation ? { ...pendingAnnotation } : null,
      activeCommentId,
      draftComment,
    };
  }, [activeCommentId, comments, draftComment, pendingAnnotation]);

  const applyHistorySnapshot = useCallback(
    (snapshot: AnnotationHistorySnapshot) => {
      setComments(cloneCommentViews(snapshot.comments));
      setPendingAnnotation(snapshot.pendingAnnotation ? { ...snapshot.pendingAnnotation } : null);
      setActiveCommentId(snapshot.activeCommentId);
      setDraftComment(snapshot.draftComment);
      setEditorMessage(null);
    },
    [setActiveCommentId],
  );

  const pushHistorySnapshot = useCallback((snapshot: AnnotationHistorySnapshot) => {
    setAnnotationHistory((current) => ({
      past: [...current.past, cloneHistorySnapshot(snapshot)].slice(-HISTORY_LIMIT),
      future: [],
    }));
  }, []);

  const recordImageAction = useCallback(
    (mutate: () => void) => {
      if (!isImageEditor) {
        mutate();
        return;
      }

      pushHistorySnapshot(captureHistorySnapshot());
      mutate();
    },
    [captureHistorySnapshot, isImageEditor, pushHistorySnapshot],
  );

  const handleUndo = useCallback(() => {
    if (!isImageEditor) {
      return;
    }

    const currentSnapshot = captureHistorySnapshot();
    let targetSnapshot: AnnotationHistorySnapshot | null = null;

    setAnnotationHistory((history) => {
      if (history.past.length === 0) {
        return history;
      }

      targetSnapshot = cloneHistorySnapshot(history.past[history.past.length - 1]);
      return {
        past: history.past.slice(0, -1),
        future: [cloneHistorySnapshot(currentSnapshot), ...history.future].slice(0, HISTORY_LIMIT),
      };
    });

    if (targetSnapshot) {
      applyHistorySnapshot(targetSnapshot);
    }
  }, [applyHistorySnapshot, captureHistorySnapshot, isImageEditor]);

  const handleRedo = useCallback(() => {
    if (!isImageEditor) {
      return;
    }

    const currentSnapshot = captureHistorySnapshot();
    let targetSnapshot: AnnotationHistorySnapshot | null = null;

    setAnnotationHistory((history) => {
      if (history.future.length === 0) {
        return history;
      }

      targetSnapshot = cloneHistorySnapshot(history.future[0]);
      return {
        past: [...history.past, cloneHistorySnapshot(currentSnapshot)].slice(-HISTORY_LIMIT),
        future: history.future.slice(1),
      };
    });

    if (targetSnapshot) {
      applyHistorySnapshot(targetSnapshot);
    }
  }, [applyHistorySnapshot, captureHistorySnapshot, isImageEditor]);

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
      setActiveCommentId((current) => resolveSelectedCommentId(current, nextComments));
      setAnnotationHistory({ past: [], future: [] });
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [resolvedProjectId, setActiveCommentId, stateProjectName]);

  useEffect(() => {
    setActiveCommentId((current) => resolveSelectedCommentId(current, visibleComments));
  }, [setActiveCommentId, visibleComments]);

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
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget = Boolean(
        target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable),
      );

      if ((event.metaKey || event.ctrlKey) && !isTypingTarget) {
        const key = event.key.toLowerCase();
        if (key === "z" && !event.shiftKey) {
          event.preventDefault();
          handleUndo();
          return;
        }

        if (key === "y" || (key === "z" && event.shiftKey)) {
          event.preventDefault();
          handleRedo();
          return;
        }
      }

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
  }, [handleRedo, handleUndo]);

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
    setActiveCommentId((current) => resolveSelectedCommentId(current, nextComments));
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
    if (assetType !== "pdf") {
      return;
    }

    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    event.preventDefault();
    stepZoom(event.deltaY < 0 ? 0.1 : -0.1);
  };

  const handleCreateAnnotation = (payload: CreateAnnotationPayload) => {
    if (pendingAnnotation) {
      setEditorMessage("Finish the current draft comment or cancel it before drawing a new one.");
      return;
    }

    recordImageAction(() => {
      debugLog("annotation creation requested", payload);
      setPendingAnnotation({
        id: createDraftAnnotationId(),
        status: "draft",
        ...payload,
        color: sanitizeAnnotationColor(payload.color),
        page: assetType === "pdf" ? currentPdfPage : undefined,
      });
      setActiveCommentId(null);
      setEditorMessage("Annotation placed. Add comment for this draft.");
    });
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
      color: pendingAnnotation.color,
      page: pendingAnnotation.page,
      authorName: "You",
      shapeType,
    });

    if (isImageEditor) {
      pushHistorySnapshot(captureHistorySnapshot());
    }

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
      if (isImageEditor) {
        pushHistorySnapshot(captureHistorySnapshot());
      }
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
            selectedColor={activeAnnotationColor}
            canUndo={canUndo}
            canRedo={canRedo}
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
            onColorChange={(color) => setActiveAnnotationColor(sanitizeAnnotationColor(color))}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />

          {assetType === "pdf" && (
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
          )}

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
            setEditorMessage("Click image to place a pin, then add comment.");
          }}
          onSubmitComment={() => void handleSubmitComment()}
          onCancelDraft={() => {
            recordImageAction(() => {
              setDraftComment("");
              setPendingAnnotation(null);
              setEditorMessage("Draft annotation removed.");
            });
          }}
          onMarkFixed={() => void handleMarkFixed()}
        />

        <div className="relative flex-1 overflow-auto p-10">
          <div className="mx-auto aspect-[16/10] max-w-4xl rounded-xl border border-border/60 bg-card">
            <div
              className="relative h-full w-full rounded-xl bg-gradient-to-br from-muted/30 to-background"
              onWheel={handleCanvasWheel}
            >
              <div className="h-full w-full overflow-auto">
                <div className="relative h-full w-full" style={assetType === "pdf" ? { zoom: zoomLevel } : undefined}>
                  <EditorSurface
                    assetType={assetType}
                    assetUrl={assetUrl}
                    toolMode={toolMode}
                    annotations={canvasAnnotations}
                    selectedAnnotationId={activeCommentId}
                    currentPdfPage={currentPdfPage}
                    onPdfPageChange={setCurrentPdfPage}
                    onPdfPageCountChange={setPdfPageCount}
                    activeColor={activeAnnotationColor}
                    onSelectAnnotation={(annotationId) => {
                      debugLog("selection changed", { selectedAnnotationId: annotationId });
                      if (!annotationId || isDraftAnnotationId(annotationId)) {
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
