import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { AnnotationToolbar } from "@/components/feedback/AnnotationToolbar";
import { CommentCard } from "@/components/feedback/CommentCard";
import { ShareLinkCard } from "@/components/feedback/ShareLinkCard";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { mockComments } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Share2, Save, ChevronLeft, MessageCircle, Plus } from "lucide-react";

export default function EditorPage() {
  const [activeComment, setActiveComment] = useState<string | null>("1");
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navbar />

      {/* Top Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <h2 className="text-sm font-semibold text-foreground">Homepage Redesign v2</h2>
          <StatusBadge status="pending" />
        </div>
        <div className="flex items-center gap-2">
          <AnnotationToolbar />
          <div className="h-5 w-px bg-border" />
          <Button variant="outline" size="sm">
            <Save className="mr-1.5 h-4 w-4" />
            Save
          </Button>
          <Button size="sm" onClick={() => setShowShare(true)}>
            <Share2 className="mr-1.5 h-4 w-4" />
            Share Link
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="flex w-80 shrink-0 flex-col border-r border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Comments</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {mockComments.length}
              </span>
            </div>
            <button className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {mockComments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                isActive={activeComment === comment.id}
                onClick={() => setActiveComment(comment.id)}
              />
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="relative flex-1 overflow-auto bg-muted/30 p-8">
          <div className="mx-auto aspect-[16/10] max-w-4xl rounded-xl border border-border bg-card shadow-sm">
            <div className="relative h-full w-full rounded-xl bg-gradient-to-br from-muted/50 to-primary/[0.03]">
              {/* Annotation Pins */}
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
              {/* Canvas placeholder */}
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground/50">Your uploaded design appears here</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal Overlay */}
      {showShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <ShareLinkCard onClose={() => setShowShare(false)} />
        </div>
      )}
    </div>
  );
}
