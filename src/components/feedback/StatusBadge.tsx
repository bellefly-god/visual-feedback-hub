/**
 * StatusBadge - 简化版状态徽章
 * 
 * 只显示两种状态：待处理/已处理
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
  { label: string; className: string; dotColor: string }
> = {
  open: {
    label: "待处理",
    className: "bg-orange-100 text-orange-700 border-orange-200",
    dotColor: "#f97316",
  },
  resolved: {
    label: "已处理",
    className: "bg-green-100 text-green-700 border-green-200",
    dotColor: "#22c55e",
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
        style={{ backgroundColor: config.dotColor }}
      />
      {showLabel && config.label}
    </span>
  );
}

export default StatusBadge;
