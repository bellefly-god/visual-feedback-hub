import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Navbar } from "@/components/layout/Navbar";
import {
  AnnotationToolbar,
} from "@/components/feedback/AnnotationToolbar";
import { drawableTools, type AnnotationToolId } from "@/components/feedback/annotationTools";
import { CommentCard } from "@/components/feedback/CommentCard";
import { ShareLinkCard } from "@/components/feedback/ShareLinkCard";
import { AssetPreview } from "@/components/feedback/AssetPreview";
import { FabricAnnotationLayer } from "@/components/feedback/FabricAnnotationLayer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Share2, Save, ChevronLeft, Plus } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { DEMO_PROJECT_ID, routePaths } from "@/lib/routePaths";
import { feedbackGateway } from "@/services/feedbackGateway";
import type { CommentView } from "@/types/feedback";

export default function EditorPage() {
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [projectName, setProjectName] = useState("Homepage Redesign v2");
  const [assetType, setAssetType] = useState<"image" | "pdf" | "screenshot">("screenshot");
  const [assetUrl, setAssetUrl] = useState("");
  const [comments, setComments] = useState<CommentView[]>([]);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [activeTool, setActiveTool] = useState<AnnotationToolId>("pin");
  const [draftComment, setDraftComment] = useState("");
  const [draftGeometry, setDraftGeometry] = useState<{
    x: number;
    y: number;
    width?: number;
    height?: number;
    page?: number;
  } | null>(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [currentPdfPage, setCurrentPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [editorMessage, setEditorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();

  const resolvedProjectId = projectId ?? DEMO_PROJECT_ID;
  const stateProjectName = (location.state as { projectName?: string } | null)?.projectName;
  const draftShapeTool = drawableTools.includes(activeTool) ? activeTool : "pin";
  const visibleComments = useMemo(() => {
    if (assetType !== "pdf") {
      return comments;
    }

    return comments.filter((comment) => (comment.page ?? 1) === currentPdfPage);
  }, [assetType, comments, currentPdfPage]);
  const active = visibleComments.find((comment) => comment.id === activeComment) ?? null;
  const reviewPath = useMemo(() => {
    return routePaths.review(shareToken ?? `share-${resolvedProjectId}`);
  }, [resolvedProjectId, shareToken]);
  const shareLink = useMemo(() => `${window.location.origin}${reviewPath}`, [reviewPath]);

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
      setActiveComment((current) => {
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
    setActiveComment((current) => {
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
    }
  }, [assetType]);

  useEffect(() => {
    setDraftGeometry(null);
    setDrawingStart(null);
    setIsDrawingShape(false);
  }, [draftShapeTool]);

  const applyNextComments = (nextComments: CommentView[]) => {
    setComments(nextComments);
    setActiveComment((current) => {
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

  const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

  const getCanvasPoint = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100);
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100);
    return { x, y };
  };

  const handleCanvasClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!isAddingComment || draftShapeTool !== "pin") {
      return;
    }

    const point = getCanvasPoint(event);
    setDraftGeometry({
      x: point.x,
      y: point.y,
      page: assetType === "pdf" ? currentPdfPage : undefined,
    });
  };

  const handleCanvasMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!isAddingComment || draftShapeTool === "pin") {
      return;
    }

    const point = getCanvasPoint(event);
    setDrawingStart(point);
    setIsDrawingShape(true);
    setDraftGeometry({
      x: point.x,
      y: point.y,
      width: draftShapeTool === "arrow" ? 0 : 1,
      height: draftShapeTool === "arrow" ? 0 : 1,
      page: assetType === "pdf" ? currentPdfPage : undefined,
    });
  };

  const handleCanvasMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!isDrawingShape || !drawingStart || !isAddingComment || draftShapeTool === "pin") {
      return;
    }

    const current = getCanvasPoint(event);

    if (draftShapeTool === "arrow") {
      setDraftGeometry({
        x: drawingStart.x,
        y: drawingStart.y,
        width: current.x - drawingStart.x,
        height: current.y - drawingStart.y,
        page: assetType === "pdf" ? currentPdfPage : undefined,
      });
      return;
    }

    const xMin = Math.min(drawingStart.x, current.x);
    const xMax = Math.max(drawingStart.x, current.x);
    const yMin = Math.min(drawingStart.y, current.y);
    const yMax = Math.max(drawingStart.y, current.y);

    setDraftGeometry({
      x: (xMin + xMax) / 2,
      y: (yMin + yMax) / 2,
      width: Math.max(xMax - xMin, 1),
      height: Math.max(yMax - yMin, 1),
      page: assetType === "pdf" ? currentPdfPage : undefined,
    });
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawingShape) {
      return;
    }

    setIsDrawingShape(false);
    setDrawingStart(null);

    setDraftGeometry((current) => {
      if (!current) {
        return current;
      }

      if (draftShapeTool === "arrow") {
        const width = current.width ?? 0;
        const height = current.height ?? 0;
        if (Math.abs(width) < 0.8 && Math.abs(height) < 0.8) {
          return { ...current, width: 8, height: -6 };
        }
        return current;
      }

      return {
        ...current,
        width: Math.max(current.width ?? 1, 1),
        height: Math.max(current.height ?? 1, 1),
      };
    });
  };

  const handleSubmitComment = async () => {
    const content = draftComment.trim();

    if (!content || !draftGeometry) {
      return;
    }

    const nextComments = await feedbackGateway.createComment({
      projectId: resolvedProjectId,
      content,
      x: draftGeometry.x,
      y: draftGeometry.y,
      width: draftGeometry.width,
      height: draftGeometry.height,
      page: draftGeometry.page,
      authorName: "You",
      shapeType: draftShapeTool,
    });

    applyNextComments(nextComments);
    setDraftComment("");
    setDraftGeometry(null);
    setDrawingStart(null);
    setIsDrawingShape(false);
    setIsAddingComment(false);
    setEditorMessage(null);
    setActiveComment(nextComments[nextComments.length - 1]?.id ?? null);
  };

  const handleMarkFixed = async () => {
    if (!active) {
      return;
    }

    try {
      const nextComments = await feedbackGateway.updateCommentStatus(active.id, "fixed");
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

      {/* Toolbar */}
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
          <AnnotationToolbar activeTool={activeTool} onToolChange={setActiveTool} />
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
        {/* Sidebar */}
        <div className="flex w-72 shrink-0 flex-col border-r border-border/60 bg-card">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[13px] font-medium text-foreground">
              Comments
              <span className="ml-1.5 text-muted-foreground">{visibleComments.length}</span>
            </span>
            <button
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                setIsAddingComment((prev) => {
                  const next = !prev;
                  if (!next) {
                    setDraftGeometry(null);
                    setDrawingStart(null);
                    setIsDrawingShape(false);
                  }
                  return next;
                });
                setEditorMessage(null);
              }}
              title="Add comment"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {isAddingComment && (
            <div className="space-y-2 border-b border-border/60 px-3 pb-3">
              <p className="text-[12px] text-muted-foreground">
                {draftShapeTool === "pin"
                  ? "Click on the canvas to place a pin, then write your comment."
                  : "Drag on the canvas to draw the annotation area, then write your comment."}
              </p>
              {activeTool === "voice" && (
                <p className="text-[12px] text-muted-foreground">
                  Voice note is a placeholder in MVP and will be attached in a later step.
                </p>
              )}
              <Textarea
                value={draftComment}
                onChange={(event) => setDraftComment(event.target.value)}
                placeholder="Describe the feedback..."
                className="min-h-[80px] resize-none text-[13px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 flex-1 text-[12px]"
                  onClick={handleSubmitComment}
                  disabled={!draftComment.trim() || !draftGeometry}
                >
                  Add Comment
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 flex-1 text-[12px]"
                  onClick={() => {
                    setIsAddingComment(false);
                    setDraftComment("");
                    setDraftGeometry(null);
                    setDrawingStart(null);
                    setIsDrawingShape(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
            {visibleComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                isActive={activeComment === comment.id}
                onClick={() => setActiveComment(comment.id)}
              />
            ))}
          </div>
          {active && (
            <div className="border-t border-border/60 p-3">
              <Button
                size="sm"
                className="h-8 w-full text-[12px]"
                onClick={handleMarkFixed}
                disabled={active.status !== "pending"}
              >
                Mark as Fixed
              </Button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="relative flex-1 overflow-auto p-10">
          <div className="mx-auto aspect-[16/10] max-w-4xl rounded-xl border border-border/60 bg-card">
            <div
              className={`relative h-full w-full rounded-xl bg-gradient-to-br from-muted/30 to-background ${
                isAddingComment ? "cursor-crosshair" : ""
              }`}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onClick={handleCanvasClick}
            >
              <AssetPreview
                assetType={assetType}
                assetUrl={assetUrl}
                page={assetType === "pdf" ? currentPdfPage : undefined}
                onPageChange={assetType === "pdf" ? setCurrentPdfPage : undefined}
                onPageCountChange={assetType === "pdf" ? setPdfPageCount : undefined}
              />
              <FabricAnnotationLayer comments={visibleComments} activeCommentId={activeComment} />
              {visibleComments.map((comment) => (
                <button
                  key={comment.id}
                  className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-200 ${
                    activeComment === comment.id
                      ? "scale-125 bg-primary text-primary-foreground ring-[3px] ring-primary/15"
                      : "bg-primary/80 text-primary-foreground hover:scale-110"
                  }`}
                  style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveComment(comment.id);
                  }}
                >
                  {comment.pinNumber}
                </button>
              ))}
              {isAddingComment && draftGeometry && draftShapeTool === "pin" && (
                <div
                  className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground ring-[3px] ring-primary/15"
                  style={{ left: `${draftGeometry.x}%`, top: `${draftGeometry.y}%` }}
                >
                  +
                </div>
              )}
              {isAddingComment && draftGeometry && (draftShapeTool === "rectangle" || draftShapeTool === "highlight") && (
                <div
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-md border-2 ${
                    draftShapeTool === "highlight"
                      ? "border-amber-400 bg-amber-300/25"
                      : "border-primary/80 bg-primary/10"
                  }`}
                  style={{
                    left: `${draftGeometry.x}%`,
                    top: `${draftGeometry.y}%`,
                    width: `${Math.max(draftGeometry.width ?? 1, 1)}%`,
                    height: `${Math.max(draftGeometry.height ?? 1, 1)}%`,
                  }}
                />
              )}
              {isAddingComment && draftGeometry && draftShapeTool === "arrow" && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full">
                  <defs>
                    <marker
                      id="draft-arrow-head"
                      markerWidth="8"
                      markerHeight="8"
                      refX="6"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 6 3, 0 6" fill="#4f46e5" />
                    </marker>
                  </defs>
                  <line
                    x1={`${draftGeometry.x}%`}
                    y1={`${draftGeometry.y}%`}
                    x2={`${draftGeometry.x + (draftGeometry.width ?? 0)}%`}
                    y2={`${draftGeometry.y + (draftGeometry.height ?? 0)}%`}
                    stroke="#4f46e5"
                    strokeWidth="2.5"
                    markerEnd="url(#draft-arrow-head)"
                  />
                </svg>
              )}
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
