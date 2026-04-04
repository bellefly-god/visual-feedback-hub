import { Link, useLocation } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_PROJECT_ID, routePaths } from "@/lib/routePaths";

const navLinks = [
  { label: "Dashboard", path: routePaths.dashboard },
  { label: "New Project", path: routePaths.upload },
  { label: "Demo", path: routePaths.editor(DEMO_PROJECT_ID) },
];

export function Navbar() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <MessageSquare className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-display text-[15px] font-semibold text-foreground">FeedbackMark</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                (location.pathname === link.path ||
                  (link.label === "Demo" && location.pathname.startsWith("/editor/")))
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button className="text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            Sign In
          </button>
          <Button size="sm" className="h-8 rounded-lg text-[13px]" asChild>
            <Link to={routePaths.upload}>
              Start Free
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
