import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { AnnotationToolbar } from "@/components/feedback/AnnotationToolbar";
import { CommentCard } from "@/components/feedback/CommentCard";
import { ShareLinkCard } from "@/components/feedback/ShareLinkCard";
import { mockComments } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Share2, Save, ChevronLeft, Plus } from "lucide-react";

export default function EditorPage() {
  const [activeComment, setActiveComment] = useState<string | null>("1");
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-background">
      <Navbar />

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border/60 bg-card px-5 py-2.5">
        <div className="flex items-center gap-3">
          <button className="text-[13px] text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <span className="h-4 w-px bg-border" />
          <h2 className="text-[13px] font-medium text-foreground">Homepage Redesign v2</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <AnnotationToolbar />
          <span className="h-4 w-px bg-border" />
          <Button variant="ghost" size="sm" className="h-8 text-[13px] text-muted-foreground">
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save
          </Button>
          <Button size="sm" className="h-8 rounded-lg text-[13px]" onClick={() => setShowShare(true)}>
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
              <span className="ml-1.5 text-muted-foreground">{mockComments.length}</span>
            </span>
            <button className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-3">
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
        <div className="relative flex-1 overflow-auto p-10">
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
                <p className="text-[13px] text-muted-foreground/30">Your design appears here</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showShare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/10 backdrop-blur-sm">
          <ShareLinkCard onClose={() => setShowShare(false)} />
        </div>
      )}
    </div>
  );
}
