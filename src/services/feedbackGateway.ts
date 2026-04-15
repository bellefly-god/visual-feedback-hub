/**
 * FeedbackGateway - 反馈数据网关
 * 
 * 支持两种后端：
 * - localStorage（默认，用于 demo）
 * - Supabase（可选）
 */

import type { CommentStatus, AnnotationShape } from "@/types/feedback";
import { feedbackService } from "@/services/feedbackService";
import { supabaseFeedbackService } from "@/services/supabaseFeedbackService";
import { isSupabaseConfigured } from "@/services/supabaseClient";

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
  /** 文字标注的文本内容 */
  textContent?: string;
  /** 显示顺序 */
  displayOrder?: number;
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
// Gateway Implementation
// ============================================

// ============================================
// Gateway Implementation
// ============================================

export const feedbackGateway = {
  // 上传资源文件
  uploadAsset: async (file: File): Promise<string> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.uploadAsset(file);
    }
    return feedbackService.uploadAsset(file);
  },

  // 创建项目
  createProject: async (input: { title: string; assetType: "image" | "pdf" | "screenshot"; assetUrl: string }): Promise<{ id: string }> => {
    if (isSupabaseConfigured) {
      const project = await supabaseFeedbackService.createProject({
        title: input.title,
        assetType: input.assetType,
        assetUrl: input.assetUrl,
      });
      return { id: project.id };
    }
    const project = await feedbackService.createProject({
      title: input.title,
      assetType: input.assetType,
      assetUrl: input.assetUrl,
    });
    return { id: project.id };
  },

  // 确保项目存在
  ensureProject: async (input: { projectId: string; title?: string }): Promise<{ id: string; title: string; assetType: "image" | "pdf" | "screenshot"; assetUrl: string }> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.ensureProject(input);
    }
    return feedbackService.ensureProject(input);
  },

  // 列出项目
  listProjects: async (): Promise<any[]> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.listProjects();
    }
    return feedbackService.listProjects();
  },

  // 保存项目反馈时间戳
  saveProjectFeedback: async (projectId: string): Promise<void> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.saveProjectFeedback(projectId);
    }
    return feedbackService.saveProjectFeedback(projectId);
  },

  // 获取分享链接
  getShareLinkByProjectId: async (projectId: string): Promise<any | null> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.getShareLinkByProjectId(projectId);
    }
    return feedbackService.getShareLinkByProjectId(projectId);
  },

  // 获取或创建分享链接
  getOrCreateShareLink: async (projectId: string): Promise<any> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.getOrCreateShareLink(projectId);
    }
    return feedbackService.getOrCreateShareLink(projectId);
  },

  // 通过 Token 获取审核数据
  getReviewDataByToken: async (token: string): Promise<any | null> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.getReviewDataByToken(token);
    }
    return feedbackService.getReviewDataByToken(token);
  },

  // 列出评论
  listComments: async (projectId: string): Promise<CommentView[]> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.listComments(projectId);
    }
    return feedbackService.listComments(projectId);
  },

  // 创建评论
  createComment: async (input: CreateCommentInput): Promise<CommentView[]> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.createComment(input);
    }
    return feedbackService.createComment(input);
  },

  // 更新状态
  updateCommentStatus: async (
    commentId: string,
    status: CommentStatus
  ): Promise<CommentView[]> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.updateCommentStatus(commentId, status);
    }
    return feedbackService.updateCommentStatus(commentId, status);
  },

  // 添加回复
  addReply: async (input: AddReplyInput): Promise<CommentView[]> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.addReply(input);
    }
    return feedbackService.addReply(input);
  },

  // 删除评论
  deleteComment: async (commentId: string): Promise<CommentView[] | undefined> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.deleteComment(commentId);
    }
    return feedbackService.deleteComment(commentId);
  },

  // 编辑评论
  editComment: async (commentId: string, content: string): Promise<CommentView[]> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.editComment(commentId, content);
    }
    return feedbackService.editComment(commentId, content);
  },

  // 清除项目数据（用于测试）
  clearProject: async (projectId: string): Promise<void> => {
    if (isSupabaseConfigured) {
      return supabaseFeedbackService.clearProject(projectId);
    }
    return feedbackService.clearProject(projectId);
  },
};

export default feedbackGateway;