import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface ShareLinkCardProps {
  link?: string;
  onClose?: () => void;
}

export function ShareLinkCard({ link = "https://feedbackmark.co/review/abc123", onClose }: ShareLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card mx-auto w-full max-w-md p-6 text-center">
      <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
        <Check className="h-6 w-6 text-success" />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground">Ready to share!</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Your feedback project is saved. Share this link with your client or team.
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
        <span className="flex-1 truncate text-left text-sm text-foreground">{link}</span>
        <button
          onClick={handleCopy}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground transition-colors hover:text-foreground border border-border"
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Close
        </Button>
        <Button className="flex-1" asChild>
          <Link to="/review">
            <ExternalLink className="mr-1.5 h-4 w-4" />
            Open Review
          </Link>
        </Button>
      </div>
    </div>
  );
}
