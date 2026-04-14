import { toast as sonnerToast, Toaster } from "sonner";

/**
 * Toast notification utility
 * 
 * Provides a consistent interface for showing toast notifications
 * based on the Sonner library
 */

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export interface ToastOptions {
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Show a success toast
 */
export function showSuccess(title: string, description?: string) {
  sonnerToast.success(title, {
    description,
    duration: 4000,
  });
}

/**
 * Show an error toast
 */
export function showError(title: string, description?: string) {
  sonnerToast.error(title, {
    description,
    duration: 5000,
  });
}

/**
 * Show an info toast
 */
export function showInfo(title: string, description?: string) {
  sonnerToast.info(title, {
    description,
    duration: 4000,
  });
}

/**
 * Show a warning toast
 */
export function showWarning(title: string, description?: string) {
  sonnerToast.warning(title, {
    description,
    duration: 5000,
  });
}

/**
 * Show a loading toast (promise-based)
 */
export function showLoading(
  title: string,
  promise: Promise<unknown>,
  {
    success = "Success!",
    error = "Error",
  }: {
    success?: string;
    error?: string;
  } = {}
) {
  return sonnerToast.promise(promise, {
    loading: title,
    success,
    error,
  });
}

/**
 * Show a generic toast
 */
export function showToast(type: ToastType, title: string, description?: string) {
  switch (type) {
    case "success":
      return showSuccess(title, description);
    case "error":
      return showError(title, description);
    case "warning":
      return showWarning(title, description);
    case "loading":
      return sonnerToast.loading(title);
    case "info":
    default:
      return showInfo(title, description);
  }
}

/**
 * Hook for using toast notifications in components
 * 
 * @example
 * ```tsx
 * const { showToast } = useToast();
 * 
 * const handleSubmit = async () => {
 *   try {
 *     await submitData();
 *     showToast.success("Data submitted successfully!");
 *   } catch (error) {
 *     showToast.error("Failed to submit data", String(error));
 *   }
 * };
 * ```
 */
export function useToast() {
  const success = (title: string, description?: string) => {
    showSuccess(title, description);
  };

  const error = (title: string, description?: string) => {
    showError(title, description);
  };

  const info = (title: string, description?: string) => {
    showInfo(title, description);
  };

  const warning = (title: string, description?: string) => {
    showWarning(title, description);
  };

  const loading = (title: string) => {
    return sonnerToast.loading(title);
  };

  const promise = <T,>(
    title: string,
    promise: Promise<T>,
    options?: {
      success?: string;
      error?: string;
    }
  ) => {
    return showLoading(title, promise, options || {});
  };

  return {
    showToast,
    success,
    error,
    info,
    warning,
    loading,
    promise,
    dismiss: sonnerToast.dismiss,
  };
}

// Export the Toaster component for use in App.tsx
export { Toaster as ToastProvider };
