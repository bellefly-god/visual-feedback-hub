import type { CommentStatus } from "@/types/feedback";

const allowedTransitions: Record<CommentStatus, CommentStatus[]> = {
  pending: ["fixed", "approved"],
  fixed: ["pending", "approved"],
  approved: ["reopen"], // Reviewer can reopen approved comments
  reopen: ["pending"], // Creator can move reopen back to pending after fixing
};

export function canTransitionStatus(from: CommentStatus, to: CommentStatus): boolean {
  if (from === to) {
    return true;
  }

  return allowedTransitions[from].includes(to);
}

export function deriveProjectStatus(commentStatuses: CommentStatus[]): CommentStatus {
  if (commentStatuses.length === 0) {
    return "pending";
  }

  // 如果有任何 reopen 状态的评论，项目状态是 reopen
  if (commentStatuses.includes("reopen")) {
    return "reopen";
  }

  if (commentStatuses.includes("pending")) {
    return "pending";
  }

  if (commentStatuses.includes("fixed")) {
    return "fixed";
  }

  return "approved";
}
