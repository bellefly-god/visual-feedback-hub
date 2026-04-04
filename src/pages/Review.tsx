import { useEffect, useMemo, useState } from "react";
import { CommentCard } from "@/components/feedback/CommentCard";
import { AssetPreview } from "@/components/feedback/AssetPreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, CheckCircle2, RotateCcw, Send } from "lucide-react";
import { useParams } from "react-router-dom";
import { DEMO_REVIEW_TOKEN } from "@/lib/routePaths";
import { feedbackGateway } from "@/services/feedbackGateway";
import type { CommentView } from "@/types/feedback";

export default function ReviewPage() {
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [projectTitle, setProjectTitle] = useState("Homepage Redesign v2");
  const [assetType, setAssetType] = useState<"image" | "pdf" | "screenshot">("screenshot");
  const [assetUrl, setAssetUrl] = useState("");
  const [comments, setComments] = useState<CommentView[]>([]);
  const [currentPdfPage, setCurrentPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState(1);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const { token } = useParams<{ token: string }>();

  const reviewToken = token ?? DEMO_REVIEW_TOKEN;
  const visibleComments = useMemo(() => {
    if (assetType !== "pdf") {
      return comments;
    }

    return comments.filter((comment) => (comment.page ?? 1) === currentPdfPage);
  }, [assetType, comments, currentPdfPage]);
  const active = visibleComments.find((c) => c.id === activeComment);

  const applyNextComments = (nextComments: CommentView[]) => {
    setComments(nextComments);
    setActiveComment((current) => {
      if (current && nextComments.some((comment) => comment.id === current)) {
        return current;
      }

      return nextComments[0]?.id ?? null;
    });
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const reviewData = await feedbackGateway.getReviewDataByToken(reviewToken);

      if (!isMounted) {
        return;
      }

      if (!reviewData) {
        setComments([]);
        setActiveComment(null);
        setProjectTitle("Shared review");
        setAssetType("screenshot");
        setAssetUrl("");
        setCurrentPdfPage(1);
        setPdfPageCount(1);
        setReviewMessage("Invalid or expired share link.");
        return;
      }

      setProjectTitle(reviewData.projectTitle);
      setAssetType(reviewData.assetType);
      setAssetUrl(reviewData.assetUrl);
      setComments(reviewData.comments);
      setCurrentPdfPage(1);
      setReviewMessage(null);
      setActiveComment((current) => {
        if (current && reviewData.comments.some((comment) => comment.id === current)) {
          return current;
        }

        return reviewData.comments[0]?.id ?? null;
      });
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [reviewToken]);

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

  const handleUpdateStatus = async (nextStatus: "approved" | "pending") => {
    if (!active) {
      return;
    }

    try {
      const nextComments = await feedbackGateway.updateCommentStatus(active.id, nextStatus);
      applyNextComments(nextComments);
      setReviewMessage(
        nextStatus === "approved" ? "Comment approved." : "Comment moved back to pending.",
      );
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_STATUS_TRANSITION") {
        setReviewMessage("This status change is not allowed.");
        return;
      }

      setReviewMessage("Unable to update status right now.");
    }
  };

  const handleSendReply = async () => {
    if (!active) {
      return;
    }

    try {
      const nextComments = await feedbackGateway.addReply({
        commentId: active.id,
        authorName: "Reviewer",
        content: replyText,
      });
      applyNextComments(nextComments);
      setReplyText("");
      setReviewMessage("Reply sent.");
    } catch (error) {
      if (error instanceof Error && error.message === "REPLY_CONTENT_REQUIRED") {
        setReviewMessage("Reply cannot be empty.");
        return;
      }

      setReviewMessage("Unable to send reply right now.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <MessageSquare className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-display text-[15px] font-semibold text-foreground">FeedbackMark</span>
          </div>
          <span className="text-[13px] text-muted-foreground">Shared review</span>
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">
        <div className="relative flex-1 overflow-auto p-10">
          <div className="mb-6">
            <h1 className="font-display text-lg font-semibold text-foreground">{projectTitle}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground" title={`Review token: ${reviewToken}`}>
              Review and leave your feedback.
            </p>
          </div>
          <div className="mx-auto aspect-[16/10] max-w-4xl rounded-xl border border-border/60 bg-card">
            <div className="relative h-full w-full rounded-xl bg-gradient-to-br from-muted/30 to-background">
              <AssetPreview
                assetType={assetType}
                assetUrl={assetUrl}
                page={assetType === "pdf" ? currentPdfPage : undefined}
                onPageChange={assetType === "pdf" ? setCurrentPdfPage : undefined}
                onPageCountChange={assetType === "pdf" ? setPdfPageCount : undefined}
              />
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
            </div>
          </div>
          {assetType === "pdf" && (
            <p className="mt-2 text-center text-[12px] text-muted-foreground">
              Viewing page {currentPdfPage} of {pdfPageCount}.
            </p>
          )}
        </div>

        <div className="flex w-80 shrink-0 flex-col border-l border-border/60 bg-card">
          <div className="px-4 py-3">
            <p className="text-[13px] font-medium text-foreground">
              Comments
              <span className="ml-1.5 text-muted-foreground">{visibleComments.length}</span>
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-1.5">
            {visibleComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                isActive={activeComment === comment.id}
                onClick={() => setActiveComment(comment.id)}
                showReplies={activeComment === comment.id}
              />
            ))}
          </div>

          <div className="border-t border-border/60 p-4 space-y-3">
            {active && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-[13px]"
                  onClick={() => void handleUpdateStatus("approved")}
                  disabled={active.status === "approved"}
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-[13px]"
                  onClick={() => void handleUpdateStatus("pending")}
                  disabled={active.status === "pending"}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Revise
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a reply..."
                className="min-h-[52px] resize-none text-[13px]"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <Button
                size="sm"
                className="h-auto self-end px-2.5"
                onClick={() => void handleSendReply()}
                disabled={!active}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
            {reviewMessage && <p className="text-[12px] text-muted-foreground">{reviewMessage}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
