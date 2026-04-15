/**
 * 简化后的状态系统
 * 
 * 不再区分 pending/fixed/approved/reopen
 * 只需要 "open" 和 "resolved" 两个状态
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
 * - 有未处理的评论 = open
 * - 所有评论已处理 = resolved
 */
export function deriveProjectStatus(commentStatuses: CommentStatus[]): CommentStatus {
  if (commentStatuses.length === 0) {
    return "open"; // 默认状态
  }
  // 如果有任何 open 状态的评论，项目就是 open
  // 如果所有评论都是 resolved，项目就是 resolved
  return commentStatuses.includes("open") ? "open" : "resolved";
}

export function getStatusLabel(status: CommentStatus): string {
  return status === "resolved" ? "已处理" : "待处理";
}
