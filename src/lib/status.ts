import type { CommentStatus } from "@/types/feedback";

const allowedTransitions: Record<CommentStatus, CommentStatus[]> = {
  pending: ["fixed", "approved"],
  fixed: ["pending", "approved"],
  approved: [],
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

  if (commentStatuses.includes("pending")) {
    return "pending";
  }

  if (commentStatuses.includes("fixed")) {
    return "fixed";
  }

  return "approved";
}
