import { feedbackService } from "@/services/feedbackService";
import { isSupabaseConfigured } from "@/services/supabaseClient";
import { supabaseFeedbackService } from "@/services/supabaseFeedbackService";
import type { CommentStatus, CommentView, ProjectListItem, ProjectRecord, ReviewData, ShareLinkRecord } from "@/types/feedback";

type CreateProjectInput = {
  title: string;
  assetType: "image" | "pdf" | "screenshot";
  assetUrl?: string;
  ownerId?: string;
  id?: string;
};

type EnsureProjectInput = {
  projectId: string;
  title?: string;
};

type CreateCommentInput = {
  projectId: string;
  content: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  page?: number;
  authorName: string;
  shapeType?: "pin" | "arrow" | "rectangle" | "highlight";
};

type CreateReplyInput = {
  commentId: string;
  authorName: string;
  content: string;
};

export interface FeedbackGateway {
  uploadAsset: (file: File) => Promise<string>;
  listProjects: () => Promise<ProjectListItem[]>;
  getProject: (projectId: string) => Promise<ProjectRecord | null>;
  createProject: (input: CreateProjectInput) => Promise<ProjectRecord>;
  ensureProject: (input: EnsureProjectInput) => Promise<ProjectRecord>;
  listComments: (projectId: string) => Promise<CommentView[]>;
  createComment: (input: CreateCommentInput) => Promise<CommentView[]>;
  addReply: (input: CreateReplyInput) => Promise<CommentView[]>;
  updateCommentStatus: (commentId: string, nextStatus: CommentStatus) => Promise<CommentView[]>;
  saveProjectFeedback: (projectId: string) => Promise<void>;
  getShareLinkByProjectId: (projectId: string) => Promise<ShareLinkRecord | null>;
  getOrCreateShareLink: (projectId: string) => Promise<ShareLinkRecord>;
  getReviewDataByToken: (token: string) => Promise<ReviewData | null>;
}

export const feedbackGateway: FeedbackGateway = isSupabaseConfigured
  ? supabaseFeedbackService
  : feedbackService;
