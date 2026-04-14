import { Link, useLocation } from "react-router-dom";
import { MessageSquare, LogOut, User as UserIcon, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEMO_PROJECT_ID, routePaths } from "@/lib/routePaths";
import { authService, getCurrentUser } from "@/services/authService";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const navLinks = [
  { label: "Dashboard", path: routePaths.dashboard, requiresAuth: true },
  { label: "New Project", path: routePaths.upload, requiresAuth: true },
  { label: "Demo", path: routePaths.editor(DEMO_PROJECT_ID), requiresAuth: false },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Update user on mount and storage changes
    const updateUser = () => setUser(getCurrentUser());
    updateUser();

    // Listen for storage changes (for multi-tab sync)
    window.addEventListener("storage", updateUser);
    return () => window.removeEventListener("storage", updateUser);
  }, []);

  const handleSignOut = async () => {
    await authService.signOut();
    setUser(null);
    navigate("/");
  };

  // Filter nav links based on auth status
  const visibleNavLinks = navLinks.filter(
    (link) => !link.requiresAuth || user !== null
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-card/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <MessageSquare className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-display text-[15px] font-semibold text-foreground">
            FeedbackMark
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {visibleNavLinks.map((link) => (
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

        {/* Desktop Auth Section */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <UserIcon className="h-4 w-4" />
                <span>{user.name || user.email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-8 text-[13px]" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button size="sm" className="h-8 text-[13px]" asChild>
                <Link to="/signup">Start Free</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="border-t border-border/60 bg-card md:hidden">
          <div className="mx-auto max-w-6xl px-6 py-4">
            <nav className="space-y-1">
              {visibleNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                    location.pathname === link.path
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Mobile Auth Section */}
            <div className="mt-4 border-t border-border/60 pt-4">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 text-[14px] text-muted-foreground">
                    <UserIcon className="h-4 w-4" />
                    <span>{user.name || user.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block rounded-lg px-3 py-2 text-[14px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block rounded-lg bg-primary px-3 py-2 text-center text-[14px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Start Free
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
