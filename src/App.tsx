import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEMO_PROJECT_ID, DEMO_REVIEW_TOKEN, routePaths } from "./lib/routePaths";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalConfirmDialog } from "./components/GlobalConfirmDialog";
import { ProtectedRoute, AuthRoute } from "./components/ProtectedRoute";

// Route-based code splitting with lazy loading
const Index = lazy(() => import("./pages/Index"));
const Upload = lazy(() => import("./pages/Upload"));
const Editor = lazy(() => import("./pages/Editor"));
const Review = lazy(() => import("./pages/Review"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const SignUp = lazy(() => import("./pages/SignUp"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Don't refetch on window focus in production
      refetchOnWindowFocus: import.meta.env.DEV,
    },
  },
});

// Loading fallback component
function PageLoader({ name = "page" }: { name?: string }): ReactNode {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading {name}...</p>
      </div>
    </div>
  );
}

// Error fallback for lazy loaded routes
function RouteErrorFallback({ onRetry }: { onRetry: () => void }): ReactNode {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-lg font-medium text-foreground">Failed to load page</p>
        <p className="text-sm text-muted-foreground">
          There was an error loading this page. Please try again.
        </p>
        <button
          onClick={onRetry}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// Lazy route wrapper with error boundary
interface LazyRouteProps {
  element: ReactNode;
  fallback?: ReactNode;
}

function LazyRoute({ element, fallback }: LazyRouteProps): ReactNode {
  return (
    <ErrorBoundary
      fallback={<RouteErrorFallback onRetry={() => window.location.reload()} />}
    >
      <Suspense fallback={fallback || <PageLoader />}>{element}</Suspense>
    </ErrorBoundary>
  );
}

import { ProtectedRoute, AuthRoute } from "@/components/ProtectedRoute";

const App = (): ReactNode => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        {/* Global error boundary for the entire app */}
        <ErrorBoundary
          fallback={
            <div className="flex h-screen flex-col items-center justify-center bg-background">
              <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
              <p className="mt-2 text-muted-foreground">
                Please refresh the page or contact support.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-primary-foreground"
              >
                Refresh Page
              </button>
            </div>
          }
        >
          <GlobalConfirmDialog />
          <Routes>
            {/* Public routes */}
            <Route
              path={routePaths.home}
              element={<LazyRoute element={<Index />} fallback={<PageLoader name="home" />} />}
            />
            <Route
              path="/review/:token"
              element={<LazyRoute element={<Review />} fallback={<PageLoader name="review" />} />}
            />

            {/* Auth routes */}
            <Route
              path="/login"
              element={
                <AuthRoute>
                  <LazyRoute element={<Login />} fallback={<PageLoader name="login" />} />
                </AuthRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <AuthRoute>
                  <LazyRoute element={<SignUp />} fallback={<PageLoader name="signup" />} />
                </AuthRoute>
              }
            />

            {/* Protected routes */}
            <Route
              path={routePaths.upload}
              element={
                <ProtectedRoute>
                  <LazyRoute element={<Upload />} fallback={<PageLoader name="upload" />} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/editor/:projectId"
              element={<LazyRoute element={<Editor />} fallback={<PageLoader name="editor" />} />}
            />
            <Route
              path={routePaths.dashboard}
              element={
                <ProtectedRoute>
                  <LazyRoute element={<Dashboard />} fallback={<PageLoader name="dashboard" />} />
                </ProtectedRoute>
              }
            />

            {/* Legacy redirects */}
            <Route
              path={routePaths.editorLegacy}
              element={<Navigate to={routePaths.editor(DEMO_PROJECT_ID)} replace />}
            />
            <Route
              path={routePaths.reviewLegacy}
              element={<Navigate to={routePaths.review(DEMO_REVIEW_TOKEN)} replace />}
            />

            {/* 404 */}
            <Route
              path="*"
              element={<LazyRoute element={<NotFound />} fallback={<PageLoader name="404" />} />}
            />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
