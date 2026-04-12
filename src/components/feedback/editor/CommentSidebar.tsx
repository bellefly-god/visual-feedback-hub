import { useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { CommentCard } from "@/components/feedback/CommentCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CommentView } from "@/types/feedback";

interface CommentSidebarProps {
  comments: CommentView[];
  activeCommentId: string | null;
  activeComment: CommentView | null;
  isCommentMode: boolean;
  hasPendingAnnotation: boolean;
  draftComment: string;
  onDraftCommentChange: (value: string) => void;
  onSelectComment: (commentId: string) => void;
  onRequestPinMode: () => void;
  onSubmitComment: () => void;
  onCancelDraft: () => void;
  onMarkFixed: () => void;
}

export function CommentSidebar({
  comments,
  activeCommentId,
  activeComment,
  isCommentMode,
  hasPendingAnnotation,
  draftComment,
  onDraftCommentChange,
  onSelectComment,
  onRequestPinMode,
  onSubmitComment,
  onCancelDraft,
  onMarkFixed,
}: CommentSidebarProps) {
  const draftInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!hasPendingAnnotation) {
      return;
    }

    draftInputRef.current?.focus();
  }, [hasPendingAnnotation]);

  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-border/60 bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[13px] font-medium text-foreground">
          Comments
          <span className="ml-1.5 text-muted-foreground">{comments.length}</span>
        </span>
        <button
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onRequestPinMode}
          title="Add comment"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {isCommentMode && (
        <div className="space-y-2 border-b border-border/60 px-3 pb-3">
          <p className="text-[12px] text-muted-foreground">
            Annotation created. Add a comment (optional) or skip.
          </p>
          <Textarea
            ref={draftInputRef}
            value={draftComment}
            onChange={(event) => onDraftCommentChange(event.target.value)}
            placeholder="Describe the feedback (optional)..."
            className="min-h-[80px] resize-none text-[13px]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 flex-1 text-[12px]"
              onClick={onSubmitComment}
              disabled={!hasPendingAnnotation}
            >
              Submit
            </Button>
            <Button size="sm" variant="outline" className="h-8 flex-1 text-[12px]" onClick={onCancelDraft}>
              Skip
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
        {comments.map((comment) => (
          <CommentCard
            key={comment.id}
            comment={comment}
            isActive={activeCommentId === comment.id}
            onClick={() => onSelectComment(comment.id)}
          />
        ))}
      </div>

      {activeComment && (
        <div className="border-t border-border/60 p-3">
          <Button
            size="sm"
            className="h-8 w-full text-[12px]"
            onClick={onMarkFixed}
            disabled={activeComment.status !== "pending"}
          >
            Mark as Fixed
          </Button>
        </div>
      )}
    </div>
  );
}
