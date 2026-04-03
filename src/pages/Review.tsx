import { useState } from "react";
import { CommentCard } from "@/components/feedback/CommentCard";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { mockComments } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, CheckCircle2, RotateCcw, Send } from "lucide-react";

export default function ReviewPage() {
  const [activeComment, setActiveComment] = useState<string | null>("1");
  const [replyText, setReplyText] = useState("");

  const active = mockComments.find((c) => c.id === activeComment);

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal review header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <MessageSquare className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">FeedbackMark</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Shared review</span>
            <StatusBadge status="pending" />
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Canvas */}
        <div className="relative flex-1 overflow-auto bg-muted/30 p-8">
          <div className="mb-4">
            <h1 className="font-display text-xl font-bold text-foreground">Homepage Redesign v2</h1>
            <p className="text-sm text-muted-foreground">Review and leave your feedback below.</p>
          </div>
          <div className="mx-auto aspect-[16/10] max-w-4xl rounded-xl border border-border bg-card shadow-sm">
            <div className="relative h-full w-full rounded-xl bg-gradient-to-br from-muted/50 to-primary/[0.03]">
              {mockComments.map((comment) => (
                <button
                  key={comment.id}
                  className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold shadow-md transition-all duration-200 ${
                    activeComment === comment.id
                      ? "scale-125 bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-primary/90 text-primary-foreground hover:scale-110"
                  }`}
                  style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                  onClick={() => setActiveComment(comment.id)}
                >
                  {comment.pinNumber}
                </button>
              ))}
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground/50">Design preview</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex w-96 shrink-0 flex-col border-l border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Feedback & Discussion</h2>
            <p className="text-xs text-muted-foreground">{mockComments.length} comments on this project</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {mockComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                isActive={activeComment === comment.id}
                onClick={() => setActiveComment(comment.id)}
                showReplies={activeComment === comment.id}
              />
            ))}
          </div>

          {/* Reply + Actions */}
          <div className="border-t border-border p-4 space-y-3">
            {active && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Approve
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Request Revision
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a reply..."
                className="min-h-[60px] resize-none text-sm"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <Button size="sm" className="h-auto self-end">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
