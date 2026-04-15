/**
 * 简化后的状态系统
 * 
 * 不再区分 pending/fixed/approved/reopen
 * 只需要 "open" 和 "resolved" 两个状态
 * 或者完全不需要状态系统，评论就是评论
 */

import type { CommentStatus } from "@/types/feedback";

/**
 * 评论状态转换规则
 * - open -> resolved: 标记为已处理
 * - resolved -> open: 重新打开
 */
export function canTransitionStatus(from: CommentStatus, to: CommentStatus): boolean {
  if (from === to) return true;
  return true; // 简化：任何状态都可以转换
}

/**
 * 简化版项目状态
 * - 有评论 = active
 * - 无评论 = empty
 */
export type SimpleProjectStatus = "active" | "empty";

export function deriveProjectStatus(_commentStatuses: CommentStatus[]): SimpleProjectStatus {
  return _commentStatuses.length > 0 ? "active" : "empty";
}

// 保留旧函数以兼容
const allowedTransitions: Record<CommentStatus, CommentStatus[]> = {
  open: ["resolved"],
  resolved: ["open"],
};

export function getStatusLabel(status: CommentStatus): string {
  return status === "resolved" ? "已处理" : "待处理";
}
