import { useState } from "react";
import { CommentCard } from "@/components/feedback/CommentCard";
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
            <h1 className="font-display text-lg font-semibold text-foreground">Homepage Redesign v2</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Review and leave your feedback.</p>
          </div>
          <div className="mx-auto aspect-[16/10] max-w-4xl rounded-xl border border-border/60 bg-card">
            <div className="relative h-full w-full rounded-xl bg-gradient-to-br from-muted/30 to-background">
              {mockComments.map((comment) => (
                <button
                  key={comment.id}
                  className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-200 ${
                    activeComment === comment.id
                      ? "scale-125 bg-primary text-primary-foreground ring-[3px] ring-primary/15"
                      : "bg-primary/80 text-primary-foreground hover:scale-110"
                  }`}
                  style={{ left: `${comment.x}%`, top: `${comment.y}%` }}
                  onClick={() => setActiveComment(comment.id)}
                >
                  {comment.pinNumber}
                </button>
              ))}
              <div className="flex h-full items-center justify-center">
                <p className="text-[13px] text-muted-foreground/30">Design preview</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-80 shrink-0 flex-col border-l border-border/60 bg-card">
          <div className="px-4 py-3">
            <p className="text-[13px] font-medium text-foreground">
              Comments
              <span className="ml-1.5 text-muted-foreground">{mockComments.length}</span>
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-3 space-y-1.5">
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

          <div className="border-t border-border/60 p-4 space-y-3">
            {active && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-[13px]">
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button variant="outline" size="sm" className="flex-1 h-8 text-[13px]">
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
              <Button size="sm" className="h-auto self-end px-2.5">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
