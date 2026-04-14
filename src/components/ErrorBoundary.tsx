import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Generate a unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { hasError: true, error, errorId };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Error info:", errorInfo);

    // Call optional error callback
    this.props.onError?.(error, errorInfo);

    // In production, you would send this to an error tracking service
    // like Sentry, Bugsnag, or your own endpoint
    if (import.meta.env.PROD) {
      this.reportError(error, errorInfo);
    }
  }

  private reportError(error: Error, errorInfo: React.ErrorInfo) {
    // Example: Send to your error tracking service
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // Replace with your actual error tracking endpoint
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData),
    // }).catch(() => {});
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorId: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <DefaultErrorFallback 
        error={this.state.error} 
        errorId={this.state.errorId}
        onReset={this.handleReset}
      />;
    }

    return this.props.children;
  }
}

// Default error fallback UI
interface DefaultErrorFallbackProps {
  error: Error | null;
  errorId?: string;
  onReset: () => void;
}

function DefaultErrorFallback({ error, errorId, onReset }: DefaultErrorFallbackProps) {
  const isDev = import.meta.env.DEV;

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-8">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>

      <h2 className="mb-2 text-xl font-semibold text-foreground">
        Something went wrong
      </h2>

      <p className="mb-6 max-w-md text-center text-[14px] text-muted-foreground">
        We encountered an unexpected error. This has been logged and we'll look into it.
        {errorId && (
          <span className="mt-2 block font-mono text-xs text-muted-foreground/60">
            Error ID: {errorId}
          </span>
        )}
      </p>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onReset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Button onClick={() => window.location.href = "/"}>
          Go to Homepage
        </Button>
      </div>

      {isDev && error && (
        <div className="mt-8 w-full max-w-2xl rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <h3 className="mb-2 text-sm font-semibold text-destructive">Development Error Details</h3>
          <pre className="overflow-auto text-xs text-destructive/80">
            {error.message}
            {"\n\n"}
            {error.stack}
          </pre>
        </div>
      )}
    </div>
  );
}

// Hook for error boundary usage
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = (err: unknown) => {
    if (err instanceof Error) {
      setError(err);
    } else {
      setError(new Error(String(err)));
    }
  };

  const clearError = () => setError(null);

  return { error, handleError, clearError };
}

// Higher-order component for wrapping error-prone components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Import React for useErrorHandler hook
import React from "react";
