import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  /** 确认按钮的危险程度 */
  variant?: "default" | "destructive";
  /** 是否在确认前显示 loading 状态 */
  loading?: boolean;
}

/**
 * Confirmation dialog component for dangerous actions
 * 
 * @example
 * ```tsx
 * const [deleteId, setDeleteId] = useState<string | null>(null);
 * 
 * <ConfirmDialog
 *   open={deleteId !== null}
 *   onOpenChange={(open) => !open && setDeleteId(null)}
 *   title="Delete Comment"
 *   description="Are you sure you want to delete this comment? This action cannot be undone."
 *   onConfirm={() => handleDelete(deleteId!)}
 *   variant="destructive"
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {variant === "destructive" && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            )}
            <div>
              <AlertDialogTitle>{title}</AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={
              variant === "destructive"
                ? "bg-destructive text-white hover:bg-destructive/90"
                : undefined
            }
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </div>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook for managing confirmation dialog state
 * 
 * @example
 * ```tsx
 * const confirm = useConfirm();
 * 
 * const handleDelete = async (id: string) => {
 *   const confirmed = await confirm({
 *     title: "Delete Comment",
 *     description: "Are you sure you want to delete this comment?",
 *     variant: "destructive",
 *   });
 *   
 *   if (confirmed) {
 *     await deleteComment(id);
 *   }
 * };
 * ```
 */
export function useConfirm() {
  // This is a simple state-based approach
  // For more complex scenarios, consider using a context provider
  return {
    confirm: async (options: {
      title?: string;
      description?: string;
      confirmText?: string;
      cancelText?: string;
      variant?: "default" | "destructive";
    }): Promise<boolean> => {
      // For simplicity, we're returning a promise that resolves to a boolean
      // In a real app, you might want to use a context-based approach
      return new Promise((resolve) => {
        // Store the resolve function somewhere accessible
        window.__confirmDialogResolve = resolve;
        window.__confirmDialogOptions = options;
        
        // Dispatch a custom event to open the dialog
        window.dispatchEvent(
          new CustomEvent("openConfirmDialog", {
            detail: options,
          })
        );
      });
    },
  };
}

// Global state for the confirm dialog
declare global {
  interface Window {
    __confirmDialogResolve?: (value: boolean) => void;
    __confirmDialogOptions?: {
      title?: string;
      description?: string;
      confirmText?: string;
      cancelText?: string;
      variant?: "default" | "destructive";
    };
  }
}

// Export types
export type { ConfirmDialogProps };
