import { MessageCircle } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { Comment } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface CommentCardProps {
  comment: Comment;
  isActive?: boolean;
  onClick?: () => void;
  showReplies?: boolean;
}

export function CommentCard({ comment, isActive, onClick, showReplies = false }: CommentCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl border p-3.5 transition-all duration-200",
        isActive
          ? "border-primary/30 bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/20 hover:shadow-sm"
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {comment.avatar}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{comment.author}</p>
            <p className="text-xs text-muted-foreground">{comment.createdAt}</p>
          </div>
        </div>
        <StatusBadge status={comment.status} />
      </div>
      <p className="text-sm leading-relaxed text-foreground/80">{comment.message}</p>
      {comment.replies.length > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="h-3 w-3" />
          <span>{comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}</span>
        </div>
      )}
      {showReplies && comment.replies.map((reply, i) => (
        <div key={i} className="mt-3 ml-4 border-l-2 border-border pl-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
              {reply.avatar}
            </div>
            <span className="text-xs font-medium">{reply.author}</span>
            <span className="text-xs text-muted-foreground">{reply.createdAt}</span>
          </div>
          <p className="mt-1 text-sm text-foreground/70">{reply.message}</p>
        </div>
      ))}
    </div>
  );
}
