/**
 * FeedbackGateway - 反馈数据网关
 * 
 * 支持两种后端：
 * - localStorage（默认，用于 demo）
 * - Supabase（可选）
 */

import type { CommentStatus, AnnotationShape } from "@/types/feedback";

// ============================================
// Types
// ============================================

export interface CreateCommentInput {
  projectId: string;
  content: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  pathPoints?: Array<{ x: number; y: number }>;
  color?: string;
  page?: number;
  authorName: string;
  shapeType: AnnotationShape;
}

export interface AddReplyInput {
  commentId: string;
  authorName: string;
  content: string;
}

export interface CommentView {
  id: string;
  displayOrder: number;
  author: string;
  avatar: string;
  message: string;
  status: CommentStatus;
  shapeType: AnnotationShape;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  pathPoints?: Array<{ x: number; y: number }>;
  page?: number;
  pinNumber: number;
  replies: Array<{
    author: string;
    avatar: string;
    message: string;
    createdAt: string;
  }>;
  createdAt: string;
}

// ============================================
// LocalStorage Backend
// ============================================

const STORAGE_KEY = "feedbackmark.comments.v2";

interface LocalComment {
  id: string;
  projectId: string;
  displayOrder: number;
  author: string;
  avatar: string;
  message: string;
  status: CommentStatus;
  shapeType: AnnotationShape;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  pathPoints?: Array<{ x: number; y: number }>;
  page?: number;
  createdAt: string;
  updatedAt: string;
  replies: Array<{
    id: string;
    author: string;
    avatar: string;
    message: string;
    createdAt: string;
  }>;
}

function getStore(): Record<string, LocalComment[]> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function setStore(data: Record<string, LocalComment[]>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}

function generateId(): string {
  return crypto.randomUUID();
}

function toView(comment: LocalComment): CommentView {
  return {
    id: comment.id,
    displayOrder: comment.displayOrder,
    author: comment.author,
    avatar: comment.avatar,
    message: comment.message,
    status: comment.status,
    shapeType: comment.shapeType,
    x: comment.x,
    y: comment.y,
    width: comment.width,
    height: comment.height,
    color: comment.color,
    pathPoints: comment.pathPoints,
    page: comment.page,
    pinNumber: comment.displayOrder,
    replies: comment.replies.map((r) => ({
      author: r.author,
      avatar: r.avatar,
      message: r.message,
      createdAt: r.createdAt,
    })),
    createdAt: comment.createdAt,
  };
}

// ============================================
// Gateway Implementation
// ============================================

export const feedbackGateway = {
  // 列出评论
  listComments: async (projectId: string): Promise<CommentView[]> => {
    const store = getStore();
    const comments = store[projectId] ?? [];
    return comments
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(toView);
  },

  // 创建评论
  createComment: async (input: CreateCommentInput): Promise<CommentView[]> => {
    const store = getStore();
    const projectComments = store[input.projectId] ?? [];
    const now = new Date().toISOString();
    const nextOrder = projectComments.length + 1;

    const newComment: LocalComment = {
      id: generateId(),
      projectId: input.projectId,
      displayOrder: nextOrder,
      author: input.authorName,
      avatar: getInitials(input.authorName),
      message: input.content,
      status: "pending",
      shapeType: input.shapeType,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      color: input.color,
      pathPoints: input.pathPoints,
      page: input.page,
      createdAt: now,
      updatedAt: now,
      replies: [],
    };

    store[input.projectId] = [...projectComments, newComment];
    setStore(store);

    return store[input.projectId].map(toView);
  },

  // 更新状态
  updateCommentStatus: async (
    commentId: string,
    status: CommentStatus
  ): Promise<CommentView[]> => {
    const store = getStore();
    const now = new Date().toISOString();

    for (const projectId of Object.keys(store)) {
      const comment = store[projectId].find((c) => c.id === commentId);
      if (comment) {
        comment.status = status;
        comment.updatedAt = now;
        setStore(store);
        return store[projectId].map(toView);
      }
    }

    throw new Error("评论不存在");
  },

  // 添加回复
  addReply: async (input: AddReplyInput): Promise<CommentView[]> => {
    const store = getStore();
    const now = new Date().toISOString();

    for (const projectId of Object.keys(store)) {
      const comment = store[projectId].find((c) => c.id === input.commentId);
      if (comment) {
        comment.replies.push({
          id: generateId(),
          author: input.authorName,
          avatar: getInitials(input.authorName),
          message: input.content,
          createdAt: now,
        });
        comment.updatedAt = now;
        setStore(store);
        return store[projectId].map(toView);
      }
    }

    throw new Error("评论不存在");
  },

  // 删除评论
  deleteComment: async (commentId: string): Promise<CommentView[] | undefined> => {
    const store = getStore();

    for (const projectId of Object.keys(store)) {
      const idx = store[projectId].findIndex((c) => c.id === commentId);
      if (idx !== -1) {
        store[projectId] = store[projectId].filter((c) => c.id !== commentId);
        // 重新排序
        store[projectId].forEach((c, i) => {
          c.displayOrder = i + 1;
        });
        setStore(store);
        return store[projectId].map(toView);
      }
    }

    return undefined;
  },

  // 清除项目数据（用于测试）
  clearProject: async (projectId: string): Promise<void> => {
    const store = getStore();
    delete store[projectId];
    setStore(store);
  },
};

export default feedbackGateway;