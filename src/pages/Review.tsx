/**
 * ReviewPage - 分享评论页面（完整标注版）
 * 
 * 客户无需登录即可评论和标注
 * 支持所有标注工具
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { CommentCard } from "@/components/feedback/CommentCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, User, X } from "lucide-react";
import { useParams } from "react-router-dom";
import { DEMO_REVIEW_TOKEN } from "@/lib/routePaths";
import { feedbackGateway } from "@/services/feedbackGateway";
import type { CommentView } from "@/types/feedback";
import { EditorSurface } from "@/features/editor/containers/EditorSurface";
import { AnnotationToolbar } from "@/components/feedback/AnnotationToolbar";
import { InlineTextInput } from "@/components/feedback/InlineTextInput";
import { commentsToAnnotations, createDraftAnnotationId, withPendingAnnotation, isDraftAnnotationId, type PendingAnnotation } from "@/features/editor/shared/links/commentAnnotationLink";
import type { AnnotationShapeMode, ToolMode } from "@/features/editor/shared/types/annotation";
import { DEFAULT_ANNOTATION_COLOR, sanitizeAnnotationColor } from "@/features/editor/shared/colors/annotationColor";
import { toast } from "sonner";

export default function ReviewPage() {
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [projectTitle, setProjectTitle] = useState("Design Review");
  const [assetType, setAssetType] = useState<"image" | "pdf" | "screenshot">("screenshot");
  const [assetUrl, setAssetUrl] = useState("");
  const [comments, setComments] = useState<CommentView[]>([]);
  const [currentPdfPage, setCurrentPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actualProjectId, setActualProjectId] = useState<string | null>(null); // 实际的 projectId（非 share token）
  
  // 标注工具状态
  const [toolMode, setToolMode] = useState<ToolMode>("pin");
  const [activeColor, setActiveColor] = useState(DEFAULT_ANNOTATION_COLOR);
  const [pendingAnnotation, setPendingAnnotation] = useState<PendingAnnotation | null>(null);
  const [draftComment, setDraftComment] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // 评论者名字（持久化）
  const [reviewerName, setReviewerName] = useState(() => {
    return localStorage.getItem("feedbackmark.reviewer_name") || "";
  });
  const [showNameInput, setShowNameInput] = useState(false);
  
  const isDebugEnabled = import.meta.env.DEV;
  const { token } = useParams<{ token: string }>();
  
  const reviewToken = token ?? DEMO_REVIEW_TOKEN;
  
  const debugLog = useCallback(
    (...args: unknown[]) => {
      if (isDebugEnabled) {
        console.log("[ReviewPage]", ...args);
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
  
  const annotations = useMemo(() => commentsToAnnotations(visibleComments), [visibleComments]);
  const allAnnotations = useMemo(
    () => withPendingAnnotation(annotations, pendingAnnotation),
    [annotations, pendingAnnotation],
  );
  
  const active = visibleComments.find((c) => c.id === activeComment);
  const isCommentMode = Boolean(pendingAnnotation);
  
  // 加载项目数据
  useEffect(() => {
    let isMounted = true;
    
    const load = async () => {
      try {
        const reviewData = await feedbackGateway.getReviewDataByToken(reviewToken);
        
        if (!isMounted) return;
        
        if (!reviewData) {
          setErrorMessage("Invalid or expired share link.");
          setIsLoading(false);
          return;
        }
        
        setProjectTitle(reviewData.projectTitle);
        setAssetType(reviewData.assetType);
        setAssetUrl(reviewData.assetUrl);
        setComments(reviewData.comments);
        setActualProjectId(reviewData.projectId); // 保存实际的 projectId
        setIsLoading(false);
        
        // 如果有评论，选中第一个
        if (reviewData.comments.length > 0) {
          setActiveComment(reviewData.comments[0].id);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load review:", error);
        setErrorMessage("Failed to load review data.");
        setIsLoading(false);
      }
    };
    
    void load();
    return () => { isMounted = false; };
  }, [reviewToken]);
  
  // 处理评论选择
  useEffect(() => {
    setActiveComment((current) => {
      if (current && visibleComments.some((comment) => comment.id === current)) {
        return current;
      }
      return visibleComments[0]?.id ?? null;
    });
  }, [visibleComments]);
  
  // 重置 PDF 页码
  useEffect(() => {
    if (assetType !== "pdf") {
      setCurrentPdfPage(1);
      setPdfPageCount(1);
    }
  }, [assetType]);
  
  const applyNextComments = (nextComments: CommentView[]) => {
    setComments(nextComments);
    setActiveComment((current) => {
      if (current && nextComments.some((comment) => comment.id === current)) {
        return current;
      }
      return nextComments[0]?.id ?? null;
    });
  };
  
  // 创建标注
  const handleCreateAnnotation = (payload: {
    shapeType: AnnotationShapeMode;
    x: number;
    y: number;
    width?: number;
    height?: number;
    pathPoints?: Array<{ x: number; y: number }>;
    color?: string;
    textContent?: string;
    fontSize?: number;
  }) => {
    // 文本工具特殊处理
    if (payload.shapeType === "text") {
      setPendingAnnotation({
        id: createDraftAnnotationId(),
        status: "draft",
        ...payload,
        color: sanitizeAnnotationColor(payload.color || activeColor),
        textContent: "",
      });
      return;
    }
    
    // 其他工具：创建为草稿评论
    setPendingAnnotation({
      id: createDraftAnnotationId(),
      status: "draft",
      ...payload,
      color: sanitizeAnnotationColor(payload.color || activeColor),
    });
    setActiveComment(null);
    toast.info("标注已创建，输入评论后提交");
  };
  
  // 提交评论
  const handleSubmitComment = async () => {
    if (!pendingAnnotation) return;
    
    // 检查是否需要输入名字
    if (!reviewerName && !showNameInput) {
      setShowNameInput(true);
      return;
    }
    
    setSaveState("saving");
    const loadingToastId = toast.loading("提交中...");
    
    try {
      const name = reviewerName || "Guest";
      const content = draftComment.trim() || "No comment";
      const shapeType = pendingAnnotation.shapeType;
      
      // 如果是文本标注，textContent 作为内容
      const commentContent = shapeType === "text" && pendingAnnotation.textContent
        ? pendingAnnotation.textContent
        : content;
      
      // 使用实际的 projectId 而非 reviewToken
      if (!actualProjectId) {
        toast.error("项目未加载，请刷新页面", { id: loadingToastId });
        return;
      }
      
      const nextComments = await feedbackGateway.createComment({
        projectId: actualProjectId,
        content: commentContent,
        x: pendingAnnotation.x,
        y: pendingAnnotation.y,
        width: shapeType === "pin" ? undefined : pendingAnnotation.width,
        height: shapeType === "pin" ? undefined : pendingAnnotation.height,
        pathPoints: pendingAnnotation.pathPoints,
        color: pendingAnnotation.color,
        page: assetType === "pdf" ? currentPdfPage : undefined,
        authorName: name,
        shapeType,
        textContent: shapeType === "text" ? commentContent : undefined,
      });
      
      // 更新评论列表（如果有返回）
      if (nextComments && nextComments.length > 0) {
        applyNextComments(nextComments);
      }
      
      setDraftComment("");
      setPendingAnnotation(null);
      toast.success("评论已提交！", { id: loadingToastId });
      setSaveState("saved");
    } catch (error) {
      console.error("Failed to submit comment:", error);
      toast.error("提交失败，请重试", { id: loadingToastId });
      setSaveState("idle");
    }
  };
  
  // 文本工具文字提交
  const handleTextSubmit = async (text: string) => {
    if (!pendingAnnotation) return;
    
    // 检查是否需要输入名字
    if (!reviewerName && !showNameInput) {
      setShowNameInput(true);
      return;
    }
    
    setSaveState("saving");
    const loadingToastId = toast.loading("提交中...");
    setDraftComment(text); // 保存文字内容
    
    try {
      const name = reviewerName || "Guest";
      
      // 使用实际的 projectId 而非 reviewToken
      if (!actualProjectId) {
        toast.error("项目未加载，请刷新页面", { id: loadingToastId });
        return;
      }
      
      const nextComments = await feedbackGateway.createComment({
        projectId: actualProjectId,
        content: text,
        x: pendingAnnotation.x,
        y: pendingAnnotation.y,
        width: pendingAnnotation.width,
        height: pendingAnnotation.height,
        pathPoints: pendingAnnotation.pathPoints,
        color: pendingAnnotation.color,
        page: assetType === "pdf" ? currentPdfPage : undefined,
        authorName: name,
        shapeType: "text",
        textContent: text, // 单独存储文字内容以便渲染
      });
      
      // 更新评论列表（如果有返回）
      if (nextComments && nextComments.length > 0) {
        applyNextComments(nextComments);
      }
      
      setDraftComment("");
      setPendingAnnotation(null);
      toast.success("文字已添加！", { id: loadingToastId });
      setSaveState("saved");
    } catch (error) {
      console.error("Failed to add text:", error);
      toast.error("添加失败，请重试", { id: loadingToastId });
      setSaveState("idle");
    }
  };
  
  // 取消草稿
  const handleCancelDraft = () => {
    setPendingAnnotation(null);
    setDraftComment("");
    setShowNameInput(false);
  };
  
  // 发送回复
  const handleSendReply = async () => {
    if (!active || !replyText.trim()) return;
    
    // 检查名字
    if (!reviewerName && !showNameInput) {
      setShowNameInput(true);
      return;
    }
    
    try {
      const name = reviewerName || "Guest";
      
      const nextComments = await feedbackGateway.addReply({
        commentId: active.id,
        authorName: name,
        content: replyText.trim(),
      });
      applyNextComments(nextComments);
      setReplyText("");
      toast.success("回复已发送！");
    } catch (error) {
      console.error("Failed to send reply:", error);
      toast.error("发送失败，请重试");
    }
  };
  
  // 保存评论者名字
  const handleSaveName = () => {
    if (reviewerName.trim()) {
      localStorage.setItem("feedbackmark.reviewer_name", reviewerName.trim());
      setShowNameInput(false);
      // 如果有草稿，继续提交流程
      if (pendingAnnotation) {
        if (pendingAnnotation.shapeType === "text") {
          handleTextSubmit(draftComment || "");
        } else {
          handleSubmitComment();
        }
      } else if (replyText.trim()) {
        handleSendReply();
      }
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-[14px] text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (errorMessage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Unable to load review</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">{errorMessage}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <header className="border-b border-border/60 bg-card/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <MessageSquare className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-display text-[15px] font-semibold text-foreground">FeedbackMark</span>
          </div>
          
          {/* 评论者名字 */}
          {reviewerName ? (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{reviewerName}</span>
              <button
                onClick={() => {
                  setReviewerName("");
                  localStorage.removeItem("feedbackmark.reviewer_name");
                }}
                className="text-muted-foreground/60 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNameInput(true)}
              className="text-[13px] text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <User className="h-4 w-4" />
              添加你的名字
            </button>
          )}
        </div>
      </header>
      
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* 左侧画布区域 */}
        <div className="relative flex-1 overflow-auto p-6">
          <div className="mb-4">
            <h1 className="font-display text-lg font-semibold text-foreground">{projectTitle}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              点击画布添加标注，或点击现有标注查看评论
            </p>
          </div>
          
          {/* 标注工具栏 */}
          <div className="mb-4 flex items-center gap-4">
            <AnnotationToolbar
              activeTool={toolMode}
              selectedColor={activeColor}
              onToolChange={(tool) => setToolMode(tool)}
              onColorChange={(color) => setActiveColor(sanitizeAnnotationColor(color))}
            />
          </div>
          
          <div className="mx-auto aspect-[16/10] max-w-4xl rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="relative h-full w-full bg-gradient-to-br from-muted/30 to-background">
              <EditorSurface
                assetType={assetType}
                assetUrl={assetUrl}
                toolMode={isCommentMode ? "select" : toolMode}
                annotations={allAnnotations}
                selectedAnnotationId={activeComment}
                currentPdfPage={currentPdfPage}
                onPdfPageChange={setCurrentPdfPage}
                onPdfPageCountChange={setPdfPageCount}
                activeColor={activeColor}
                onSelectAnnotation={(annotationId) => {
                  if (!annotationId || isDraftAnnotationId(annotationId)) {
                    setActiveComment(null);
                    return;
                  }
                  setActiveComment(annotationId);
                }}
                onCreateAnnotation={handleCreateAnnotation}
                zoomLevel={zoomLevel}
                onZoomChange={setZoomLevel}
              />
              
              {/* 文本输入框 */}
              {pendingAnnotation?.shapeType === "text" && (
                <InlineTextInput
                  x={pendingAnnotation.x}
                  y={pendingAnnotation.y}
                  color={pendingAnnotation.color || activeColor}
                  fontSize={pendingAnnotation.fontSize ?? 14}
                  initialText={pendingAnnotation.textContent || ""}
                  onSubmit={handleTextSubmit}
                  onCancel={handleCancelDraft}
                />
              )}
            </div>
          </div>
          
          {assetType === "pdf" && (
            <p className="mt-2 text-center text-[12px] text-muted-foreground">
              Page {currentPdfPage} of {pdfPageCount}
            </p>
          )}
        </div>
        
        {/* 右侧评论列表 */}
        <div className="flex w-80 shrink-0 flex-col border-l border-border/60 bg-card">
          <div className="border-b border-border/60 px-4 py-3">
            <p className="text-[13px] font-medium text-foreground">
              评论
              <span className="ml-1.5 text-muted-foreground">{comments.length}</span>
            </p>
          </div>
          
          {/* 评论列表 */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {comments.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-[13px] text-muted-foreground text-center px-4">
                  暂无评论<br/>点击上方画布添加标注
                </p>
              </div>
            ) : (
              visibleComments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  isActive={activeComment === comment.id}
                  onClick={() => setActiveComment(comment.id)}
                  showActions={false}
                />
              ))
            )}
          </div>
          
          {/* 草稿评论输入 */}
          {isCommentMode && (
            <div className="border-t border-border/60 p-3 space-y-2">
              <p className="text-[12px] font-medium text-foreground">添加评论</p>
              <textarea
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="输入评论..."
                value={draftComment}
                onChange={(e) => setDraftComment(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-[12px]" onClick={handleCancelDraft}>
                  取消
                </Button>
                <Button size="sm" className="h-8 text-[12px]" onClick={handleSubmitComment} disabled={saveState === "saving"}>
                  {saveState === "saving" ? "提交中..." : "提交"}
                </Button>
              </div>
            </div>
          )}
          
          {/* 回复输入 */}
          {active && !isCommentMode && (
            <div className="border-t border-border/60 p-3 space-y-2">
              <p className="text-[12px] font-medium text-foreground">
                回复 #{active.displayOrder}
              </p>
              <textarea
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="输入回复..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
              />
              <Button size="sm" className="w-full h-8 text-[12px]" onClick={handleSendReply} disabled={!replyText.trim()}>
                <Send className="h-3 w-3 mr-1.5" />
                发送回复
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* 名字输入弹窗 */}
      {showNameInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border border-border/60 shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-[15px] font-semibold text-foreground mb-4">请输入你的名字</h3>
            <input
              type="text"
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-[14px] focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="你的名字"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowNameInput(false)}>
                取消
              </Button>
              <Button size="sm" className="flex-1" onClick={handleSaveName} disabled={!reviewerName.trim()}>
                确认
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
