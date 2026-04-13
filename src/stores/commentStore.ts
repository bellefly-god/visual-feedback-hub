/**
 * Comment Store - 评论状态管理
 * 
 * 功能：
 * - 评论列表管理
 * - 选中评论状态
 * - 待提交标注状态
 * - 评论操作（创建、编辑、删除）
 */

import { create } from "zustand";
import type { CommentView, CommentStatus } from "@/types/feedback";
import type { AnnotationShape } from "@/types/feedback";
import { feedbackGateway } from "@/services/feedbackGateway";

// ============================================
// Types
// ============================================

export interface AnnotationPayload {
  shapeType: AnnotationShape;
  x: number;
  y: number;
  width?: number;
  height?: number;
  pathPoints?: Array<{ x: number; y: number }>;
  color?: string;
  page?: number;
}

export interface PendingAnnotation {
  id: string;
  annotation: AnnotationPayload;
  page?: number;
}

export interface CommentDraft {
  annotation: PendingAnnotation | null;
  content: string;
}

interface CommentStore {
  // 状态
  comments: CommentView[];
  selectedCommentId: string | null;
  pendingAnnotation: PendingAnnotation | null;
  draftComment: string;
  isLoading: boolean;
  error: string | null;

  // 项目信息
  projectId: string | null;

  // 操作
  setProjectId: (projectId: string) => void;
  loadComments: () => Promise<void>;
  selectComment: (id: string | null) => void;
  
  // 标注操作
  setPendingAnnotation: (annotation: PendingAnnotation | null) => void;
  updateDraftContent: (content: string) => void;
  clearDraft: () => void;
  
  // 评论操作
  createComment: (content: string) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  updateCommentStatus: (commentId: string, status: CommentStatus) => Promise<void>;
  addReply: (commentId: string, content: string) => Promise<void>;
}

// ============================================
// Store
// ============================================

export const useCommentStore = create<CommentStore>((set, get) => ({
  // 初始状态
  comments: [],
  selectedCommentId: null,
  pendingAnnotation: null,
  draftComment: "",
  isLoading: false,
  error: null,
  projectId: null,

  // 设置项目 ID
  setProjectId: (projectId) => {
    set({ projectId });
  },

  // 加载评论
  loadComments: async () => {
    const { projectId } = get();
    if (!projectId) return;

    set({ isLoading: true, error: null });
    try {
      const comments = await feedbackGateway.listComments(projectId);
      set({ comments, isLoading: false });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : "加载评论失败",
        isLoading: false 
      });
    }
  },

  // 选择评论
  selectComment: (id) => {
    set({ selectedCommentId: id });
  },

  // 设置待提交标注
  setPendingAnnotation: (annotation) => {
    set({ pendingAnnotation: annotation, draftComment: "" });
  },

  // 更新草稿内容
  updateDraftContent: (content) => {
    set({ draftComment: content });
  },

  // 清除草稿
  clearDraft: () => {
    set({ pendingAnnotation: null, draftComment: "" });
  },

  // 创建评论
  createComment: async (content) => {
    const { projectId, pendingAnnotation } = get();
    if (!projectId) return;
    if (!content.trim()) {
      set({ error: "评论内容不能为空" });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const nextComments = await feedbackGateway.createComment({
        projectId,
        content: content.trim(),
        x: pendingAnnotation?.annotation.x ?? 50,
        y: pendingAnnotation?.annotation.y ?? 50,
        width: pendingAnnotation?.annotation.width,
        height: pendingAnnotation?.annotation.height,
        pathPoints: pendingAnnotation?.annotation.pathPoints,
        color: pendingAnnotation?.annotation.color,
        page: pendingAnnotation?.page,
        authorName: "You",
        shapeType: pendingAnnotation?.annotation.shapeType ?? "pin",
      });

      set({ 
        comments: nextComments, 
        isLoading: false,
        pendingAnnotation: null,
        draftComment: "",
        selectedCommentId: nextComments[nextComments.length - 1]?.id ?? null,
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : "创建评论失败",
        isLoading: false 
      });
    }
  },

  // 更新评论
  updateComment: async (commentId, content) => {
    if (!content.trim()) {
      set({ error: "评论内容不能为空" });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      // 重新创建评论（因为服务不支持更新内容）
      const comment = get().comments.find(c => c.id === commentId);
      if (!comment) throw new Error("评论不存在");

      // 删除旧评论
      await feedbackGateway.deleteComment?.(commentId);
      
      // 创建新评论
      const nextComments = await feedbackGateway.createComment({
        projectId: get().projectId!,
        content: content.trim(),
        x: comment.x,
        y: comment.y,
        width: comment.width,
        height: comment.height,
        color: comment.color,
        page: comment.page,
        authorName: comment.author,
        shapeType: comment.shapeType,
      });

      set({ comments: nextComments, isLoading: false });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : "更新评论失败",
        isLoading: false 
      });
    }
  },

  // 删除评论
  deleteComment: async (commentId) => {
    set({ isLoading: true, error: null });
    try {
      const nextComments = await feedbackGateway.deleteComment?.(commentId);
      set({ 
        comments: nextComments ?? get().comments.filter(c => c.id !== commentId),
        isLoading: false,
        selectedCommentId: get().selectedCommentId === commentId ? null : get().selectedCommentId,
      });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : "删除评论失败",
        isLoading: false 
      });
    }
  },

  // 更新评论状态
  updateCommentStatus: async (commentId, status) => {
    set({ isLoading: true, error: null });
    try {
      const nextComments = await feedbackGateway.updateCommentStatus(commentId, status);
      set({ comments: nextComments, isLoading: false });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : "状态更新失败",
        isLoading: false 
      });
    }
  },

  // 添加回复
  addReply: async (commentId, content) => {
    if (!content.trim()) {
      set({ error: "回复内容不能为空" });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const nextComments = await feedbackGateway.addReply({
        commentId,
        authorName: "You",
        content: content.trim(),
      });
      set({ comments: nextComments, isLoading: false });
    } catch (err) {
      set({ 
        error: err instanceof Error ? err.message : "回复失败",
        isLoading: false 
      });
    }
  },
}));

// ============================================
// Selector Hooks
// ============================================

export function useSelectedComment() {
  const comments = useCommentStore((s) => s.comments);
  const selectedId = useCommentStore((s) => s.selectedCommentId);
  return comments.find((c) => c.id === selectedId) ?? null;
}

export function useCommentsByPage(page: number) {
  const comments = useCommentStore((s) => s.comments);
  return comments.filter((c) => (c.page ?? 1) === page);
}

export function useCommentCount() {
  return useCommentStore((s) => s.comments.length);
}

export default useCommentStore;
