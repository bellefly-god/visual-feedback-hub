/**
 * BubbleManager - 气泡管理器
 * 
 * 功能：
 * - 管理气泡的打开/关闭状态
 * - 处理气泡与标注的关联
 * - 处理画布点击事件
 * - ESC 键关闭气泡
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { CommentView } from "@/types/feedback";
import type { CommentStatus } from "@/types/feedback";

export interface BubbleState {
  /** 是否打开 */
  open: boolean;
  /** 气泡模式 */
  mode: "create" | "review";
  /** 位置 */
  position: { x: number; y: number };
  /** 当前评论（审阅者模式） */
  comment?: CommentView;
  /** 锚定标注 ID（可选） */
  annotationId?: string;
}

interface UseBubbleManagerOptions {
  /** 提交评论回调 */
  onSubmitComment?: (content: string, annotationId?: string) => Promise<void>;
  /** 提交回复回调 */
  onReply?: (commentId: string, content: string) => Promise<void>;
  /** 更新状态回调 */
  onStatusChange?: (commentId: string, status: CommentStatus) => Promise<void>;
}

export function useBubbleManager(options: UseBubbleManagerOptions) {
  const { onSubmitComment, onReply, onStatusChange } = options;

  // 气泡状态
  const [bubbleState, setBubbleState] = useState<BubbleState>({
    open: false,
    mode: "create",
    position: { x: 0, y: 0 },
  });

  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 防止重复提交的引用
  const isSubmittingRef = useRef(false);

  // 打开创建者气泡
  const openCreateBubble = useCallback((x: number, y: number, annotationId?: string) => {
    setBubbleState({
      open: true,
      mode: "create",
      position: { x, y },
      annotationId,
    });
    setError(null);
  }, []);

  // 打开审阅者气泡
  const openReviewBubble = useCallback((x: number, y: number, comment: CommentView) => {
    setBubbleState({
      open: true,
      mode: "review",
      position: { x, y },
      comment,
    });
    setError(null);
  }, []);

  // 关闭气泡
  const closeBubble = useCallback(() => {
    setBubbleState((prev) => ({
      ...prev,
      open: false,
    }));
    setError(null);
  }, []);

  // 提交评论
  const handleSubmit = useCallback(async (content: string) => {
    if (isSubmittingRef.current) return;
    if (!content.trim()) {
      setError("评论内容不能为空");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmitComment?.(content, bubbleState.annotationId);
      closeBubble();
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败，请重试");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [onSubmitComment, bubbleState.annotationId, closeBubble]);

  // 提交回复
  const handleReply = useCallback(async (content: string) => {
    if (isSubmittingRef.current) return;
    if (!bubbleState.comment) return;
    if (!content.trim()) {
      setError("回复内容不能为空");
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      await onReply?.(bubbleState.comment.id, content);
      // 不关闭气泡，因为可能还要继续回复
    } catch (err) {
      setError(err instanceof Error ? err.message : "回复失败，请重试");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [onReply, bubbleState.comment, closeBubble]);

  // 更新状态
  const handleStatusChange = useCallback(async (status: CommentStatus) => {
    if (isSubmittingRef.current) return;
    if (!bubbleState.comment) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      await onStatusChange?.(bubbleState.comment.id, status);
      closeBubble();
    } catch (err) {
      setError(err instanceof Error ? err.message : "状态更新失败，请重试");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [onStatusChange, bubbleState.comment, closeBubble]);

  // ESC 键关闭气泡
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && bubbleState.open) {
        closeBubble();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bubbleState.open, closeBubble]);

  return {
    // 状态
    bubbleState,
    isSubmitting,
    error,
    // 操作
    openCreateBubble,
    openReviewBubble,
    closeBubble,
    handleSubmit,
    handleReply,
    handleStatusChange,
  };
}

// ============================================
// BubbleContainer - 气泡容器
// ============================================

interface BubbleContainerProps {
  /** 气泡状态 */
  bubbleState: BubbleState;
  /** 提交中状态 */
  isSubmitting: boolean;
  /** 错误信息 */
  error: string | null;
  /** 关闭回调 */
  onClose: () => void;
  /** 提交评论 */
  onSubmit: (content: string) => Promise<void>;
  /** 提交回复 */
  onReply: (content: string) => Promise<void>;
  /** 更新状态 */
  onStatusChange: (status: CommentStatus) => Promise<void>;
  /** 触发器引用（用于计算位置） */
  triggerRef?: React.RefObject<HTMLElement>;
  /** 气泡内容引用 */
  bubbleContent?: React.ReactNode;
}

export function BubbleContainer({
  bubbleState,
  isSubmitting,
  error,
  onClose,
  onSubmit,
  onReply,
  onStatusChange,
}: BubbleContainerProps) {
  const { open, mode, position, comment } = bubbleState;

  // 导入 CommentBubble 组件（延迟导入避免循环依赖）
  const [CommentBubble, setCommentBubble] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import("./CommentBubble").then((module) => {
      setCommentBubble(() => module.CommentBubble);
    });
  }, []);

  if (!open || !CommentBubble) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={(e) => {
        // 点击背景关闭气泡
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* 触发器区域 */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: position.x,
          top: position.y,
        }}
      />

      {/* 气泡 */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: position.x,
          top: position.y,
          transform: "translate(10px, -50%)",
        }}
      >
        <CommentBubble
          open={open}
          mode={mode}
          comment={comment}
          onClose={onClose}
          onSubmit={onSubmit}
          onReply={onReply}
          onStatusChange={onStatusChange}
          isSubmitting={isSubmitting}
          error={error}
        >
          {/* 空触发器，实际内容通过绝对定位显示 */}
          <div className="w-0 h-0" />
        </CommentBubble>
      </div>
    </div>
  );
}

export default BubbleContainer;
