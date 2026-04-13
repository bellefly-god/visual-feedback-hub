/**
 * CommentBubble - 气泡评论组件
 * 
 * 功能：
 * - 智能定位（自动调整位置避免超出屏幕）
 * - 创建者模式：输入评论
 * - 审阅者模式：查看/回复/批准
 * - 状态徽章显示
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  arrow,
  type ArrowOptions,
} from "@floating-ui/react";
import { Send, Check, RotateCcw, X, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CommentView } from "@/types/feedback";
import type { CommentStatus } from "@/types/feedback";

// ============================================
// Types
// ============================================

export interface CommentBubbleProps {
  /** 气泡内容 */
  children: React.ReactNode;
  /** 气泡模式 */
  mode: "create" | "review";
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 提交评论（创建者模式） */
  onSubmit?: (content: string) => Promise<void>;
  /** 提交回复（审阅者模式） */
  onReply?: (content: string) => Promise<void>;
  /** 更新状态（审阅者模式） */
  onStatusChange?: (status: CommentStatus) => Promise<void>;
  /** 当前评论（审阅者模式） */
  comment?: CommentView;
  /** 提交中状态 */
  isSubmitting?: boolean;
  /** 错误信息 */
  error?: string | null;
}

export interface BubblePosition {
  x: number;
  y: number;
}

// ============================================
// 状态配置
// ============================================

const STATUS_CONFIG: Record<
  CommentStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: "待处理",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
  },
  fixed: {
    label: "已修复",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  approved: {
    label: "已批准",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  reopen: {
    label: "已驳回",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

// ============================================
// BubbleContent - 气泡内容
// ============================================

interface BubbleContentProps {
  mode: "create" | "review";
  comment?: CommentView;
  onSubmit?: (content: string) => Promise<void>;
  onReply?: (content: string) => Promise<void>;
  onStatusChange?: (status: CommentStatus) => Promise<void>;
  onClose: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

function BubbleContent({
  mode,
  comment,
  onSubmit,
  onReply,
  onStatusChange,
  onClose,
  isSubmitting,
  error,
}: BubbleContentProps) {
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动聚焦
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  // 处理提交
  const handleSubmit = useCallback(async () => {
    const content = inputValue.trim();
    if (!content) return;

    if (mode === "create" && onSubmit) {
      await onSubmit(content);
      setInputValue("");
    } else if (mode === "review" && onReply) {
      await onReply(content);
      setInputValue("");
    }
  }, [inputValue, mode, onSubmit, onReply]);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  // 创建者模式
  if (mode === "create") {
    return (
      <div className="w-72 p-3 space-y-3">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">添加评论</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 输入框 */}
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="描述你的反馈..."
          className="min-h-[80px] resize-none text-sm"
          disabled={isSubmitting}
        />

        {/* 错误提示 */}
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 h-8"
            onClick={handleSubmit}
            disabled={!inputValue.trim() || isSubmitting}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {isSubmitting ? "提交中..." : "提交"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={onClose}
          >
            取消
          </Button>
        </div>
      </div>
    );
  }

  // 审阅者模式
  if (mode === "review" && comment) {
    const statusCfg = STATUS_CONFIG[comment.status];

    return (
      <div className="w-72 p-3 space-y-3">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold">
              {comment.avatar}
            </div>
            <span className="text-sm font-medium">{comment.author}</span>
            <span className={cn(
              "text-xs px-1.5 py-0.5 rounded",
              statusCfg.bgColor,
              statusCfg.color
            )}>
              {statusCfg.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 评论内容 */}
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
          {comment.message}
        </div>

        {/* 回复列表 */}
        {comment.replies.length > 0 && (
          <div className="space-y-2 border-l-2 border-border pl-3">
            {comment.replies.map((reply, index) => (
              <div key={index} className="text-sm">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground">
                    {reply.author}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {reply.createdAt}
                  </span>
                </div>
                <p className="text-muted-foreground">{reply.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* 回复输入 */}
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="添加回复..."
          className="min-h-[52px] resize-none text-sm"
          disabled={isSubmitting}
        />

        {/* 错误提示 */}
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8"
            onClick={() => onStatusChange?.("approved")}
            disabled={comment.status === "approved" || isSubmitting}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            批准
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8"
            onClick={() => onStatusChange?.("reopen")}
            disabled={comment.status === "pending" || isSubmitting}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            驳回
          </Button>
        </div>

        {/* 回复按钮 */}
        {inputValue.trim() && (
          <Button
            size="sm"
            className="w-full h-8"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            {isSubmitting ? "发送中..." : "发送回复"}
          </Button>
        )}
      </div>
    );
  }

  return null;
}

// ============================================
// CommentBubble - 主组件
// ============================================

export function CommentBubble({
  children,
  mode,
  open,
  onClose,
  onSubmit,
  onReply,
  onStatusChange,
  comment,
  isSubmitting,
  error,
}: CommentBubbleProps) {
  const arrowRef = useRef<HTMLDivElement>(null);

  const {
    refs,
    floatingStyles,
    middlewareData,
    placement,
  } = useFloating({
    middleware: [
      offset(10),
      flip({
        fallbackPlacements: ["left", "top", "bottom"],
      }),
      shift({ padding: 8 }),
      arrow({
        element: arrowRef,
      }),
    ],
    placement: "right-start",
    whileElementsMounted: autoUpdate,
    open,
  });

  const { x, y } = floatingStyles;
  const arrowData = middlewareData.arrow;

  // 计算箭头位置
  const getArrowStyle = () => {
    if (!arrowData) return {};

    const staticSide = {
      top: "bottom",
      right: "left",
      bottom: "top",
      left: "right",
    }[placement.split("-")[0]] as string;

    return {
      [staticSide]: "-4px",
      left: arrowData.x != null ? `${arrowData.x}px` : undefined,
      top: arrowData.y != null ? `${arrowData.y}px` : undefined,
    };
  };

  if (!open) return <>{children}</>;

  return (
    <>
      {/* 触发器 */}
      <div ref={refs.setReference}>{children}</div>

      {/* 气泡 */}
      <div
        ref={refs.setFloating}
        style={{
          position: "fixed",
          left: x ?? 0,
          top: y ?? 0,
          zIndex: 50,
        }}
        className={cn(
          "bg-card border border-border/60 rounded-xl shadow-lg",
          "animate-in fade-in-0 zoom-in-95 duration-200",
          // 箭头
          "[&>[data-arrow]]:absolute [&>[data-arrow]]:h-3 [&>[data-arrow]]:w-3",
          "[&>[data-arrow]]:rotate-45 [&>[data-arrow]]:bg-card [&>[data-arrow]]:border-border/60",
        )}
      >
        {/* 箭头 */}
        <div
          ref={arrowRef}
          data-arrow
          className="absolute border-l border-b"
          style={getArrowStyle()}
        />

        {/* 内容 */}
        <BubbleContent
          mode={mode}
          comment={comment}
          onSubmit={onSubmit}
          onReply={onReply}
          onStatusChange={onStatusChange}
          onClose={onClose}
          isSubmitting={isSubmitting}
          error={error}
        />
      </div>
    </>
  );
}

export default CommentBubble;
