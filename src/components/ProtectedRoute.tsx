import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { isAuthenticated } from "@/services/authService";
import { routePaths } from "@/lib/routePaths";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected route wrapper with async authentication check
 * 
 * Uses async check to properly handle both local auth and Supabase auth
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const authed = await isAuthenticated();
        if (isMounted) {
          setIsAuthed(authed);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        if (isMounted) {
          setIsAuthed(false);
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
}

interface AuthRouteProps {
  children: React.ReactNode;
}

/**
 * Auth route wrapper - redirects to dashboard if already logged in
 * 
 * Uses async check to properly handle both local auth and Supabase auth
 */
export function AuthRoute({ children }: AuthRouteProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const authed = await isAuthenticated();
        if (isMounted) {
          setIsAuthed(authed);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        if (isMounted) {
          setIsAuthed(false);
        }
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Show loading state while checking auth
  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if already logged in
  if (isAuthed) {
    return <Navigate to={routePaths.dashboard} replace />;
  }

  // Render children if not authenticated
  return <>{children}</>;
}
