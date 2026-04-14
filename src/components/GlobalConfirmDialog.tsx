import { useState, useEffect } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * GlobalConfirmDialog - 全局确认对话框
 * 
 * 通过自定义事件系统实现全局调用
 * 
 * @example
 * // 在任何地方调用
 * window.dispatchEvent(new CustomEvent('openConfirmDialog', {
 *   detail: {
 *     title: "Delete",
 *     description: "Are you sure?",
 *     variant: "destructive",
 *   }
 * }));
 */
export function GlobalConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<{
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
  }>({});

  useEffect(() => {
    const handleOpenDialog = (event: CustomEvent<{
      title?: string;
      description?: string;
      confirmText?: string;
      cancelText?: string;
      variant?: "default" | "destructive";
    }>) => {
      setOptions(event.detail || {});
      setOpen(true);
    };

    window.addEventListener(
      "openConfirmDialog",
      handleOpenDialog as EventListener
    );

    return () => {
      window.removeEventListener(
        "openConfirmDialog",
        handleOpenDialog as EventListener
      );
    };
  }, []);

  const handleConfirm = () => {
    if (window.__confirmDialogResolve) {
      window.__confirmDialogResolve(true);
      window.__confirmDialogResolve = undefined;
      window.__confirmDialogOptions = undefined;
    }
    setOpen(false);
  };

  const handleCancel = () => {
    if (window.__confirmDialogResolve) {
      window.__confirmDialogResolve(false);
      window.__confirmDialogResolve = undefined;
      window.__confirmDialogOptions = undefined;
    }
    setOpen(false);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          handleCancel();
        }
      }}
      title={options.title}
      description={options.description}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      variant={options.variant}
      onConfirm={handleConfirm}
    />
  );
}

/**
 * Hook for showing confirm dialogs from anywhere in the app
 * 
 * @example
 * ```tsx
 * const { showConfirm } = useGlobalConfirm();
 * 
 * const handleDelete = async () => {
 *   const confirmed = await showConfirm({
 *     title: "Delete Comment",
 *     description: "This action cannot be undone.",
 *     variant: "destructive",
 *   });
 *   
 *   if (confirmed) {
 *     // do something
 *   }
 * };
 * ```
 */
export function useGlobalConfirm() {
  const showConfirm = (options: {
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: "default" | "destructive";
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      window.__confirmDialogResolve = resolve;
      window.__confirmDialogOptions = options;
      window.dispatchEvent(
        new CustomEvent("openConfirmDialog", { detail: options })
      );
    });
  };

  return { showConfirm };
}
