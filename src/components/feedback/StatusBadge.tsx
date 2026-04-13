/**
 * StatusBadge - 状态徽章组件
 * 
 * 显示评论状态的徽章
 */

import { cn } from "@/lib/utils";
import type { CommentStatus } from "@/types/feedback";

interface StatusBadgeProps {
  status: CommentStatus;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<
  CommentStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "待处理",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  fixed: {
    label: "已修复",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  approved: {
    label: "已批准",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  reopen: {
    label: "已驳回",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

export function StatusBadge({
  status,
  size = "sm",
  showLabel = true,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        config.className,
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"
      )}
    >
      <span
        className={cn(
          "rounded-full",
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
        )}
        style={{
          backgroundColor:
            status === "pending"
              ? "#f97316"
              : status === "fixed"
              ? "#3b82f6"
              : status === "approved"
              ? "#22c55e"
              : "#ef4444",
        }}
      />
      {showLabel && config.label}
    </span>
  );
}

export default StatusBadge;
