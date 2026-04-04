import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { DEMO_REVIEW_TOKEN, routePaths } from "@/lib/routePaths";

interface ShareLinkCardProps {
  link?: string;
  reviewPath?: string;
  onClose?: () => void;
}

export function ShareLinkCard({
  link = "https://feedbackmark.co/review/abc123",
  reviewPath = routePaths.review(DEMO_REVIEW_TOKEN),
  onClose,
}: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-border/60 bg-card p-6 text-center shadow-lg">
      <h3 className="font-display text-base font-semibold text-foreground">Ready to share</h3>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        Share this link with your client or team.
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-2">
        <span className="flex-1 truncate text-left text-[13px] text-foreground/70">{link}</span>
        <button
          onClick={handleCopy}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="ghost" className="flex-1 h-9 text-[13px]" onClick={onClose}>
          Close
        </Button>
        <Button className="flex-1 h-9 text-[13px]" asChild>
          <Link to={reviewPath}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open Review
          </Link>
        </Button>
      </div>
    </div>
  );
}
