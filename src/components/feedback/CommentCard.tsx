import { MessageCircle } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { CommentView } from "@/types/feedback";
import { cn } from "@/lib/utils";

interface CommentCardProps {
  comment: CommentView;
  isActive?: boolean;
  onClick?: () => void;
  showReplies?: boolean;
}

export function CommentCard({ comment, isActive, onClick, showReplies = false }: CommentCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl p-3 transition-all duration-150",
        isActive
          ? "bg-muted/80"
          : "hover:bg-muted/50"
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary">
            #{comment.displayOrder}
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/[0.06] text-[10px] font-semibold text-foreground/70">
            {comment.avatar}
          </div>
          <span className="text-[13px] font-medium text-foreground">{comment.author}</span>
        </div>
        <StatusBadge status={comment.status} />
      </div>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{comment.message}</p>
      {comment.replies.length > 0 && !showReplies && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground/70">
          <MessageCircle className="h-3 w-3" />
          <span>{comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}</span>
        </div>
      )}
      {showReplies && comment.replies.map((reply, i) => (
        <div key={i} className="mt-2.5 ml-3 border-l border-border pl-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-medium text-foreground/70">{reply.author}</span>
            <span className="text-[11px] text-muted-foreground/60">{reply.createdAt}</span>
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{reply.message}</p>
        </div>
      ))}
    </div>
  );
}
