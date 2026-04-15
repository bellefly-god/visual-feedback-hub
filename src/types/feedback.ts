export type AssetType = "image" | "pdf" | "screenshot";

// 简化后的评论状态 - 只需知道是否已回复
// 后续可用于 "已解决" 状态
export type CommentStatus = "open" | "resolved";

export type AnnotationShape = "pin" | "pen" | "arrow" | "rectangle" | "highlight" | "text";

export interface ProjectRecord {
  id: string;
  title: string;
  ownerId: string;
  assetType: AssetType;
  assetUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentRecord {
  id: string;
  projectId: string;
  displayOrder?: number;
  page?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  pathPoints?: Array<{ x: number; y: number }>;
  shapeType: AnnotationShape;
  content: string;
  voiceNoteUrl?: string;
  status: CommentStatus;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReplyRecord {
  id: string;
  commentId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface ShareLinkRecord {
  id: string;
  projectId: string;
  token: string;
  isPublic: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface CommentReplyView {
  author: string;
  avatar: string;
  message: string;
  createdAt: string;
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
  replies: CommentReplyView[];
  createdAt: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  fileType: AssetType;
  thumbnail: string;
  date: string;
  commentCount: number;
  status: CommentStatus;
}

export interface ReviewData {
  token: string;
  projectId: string;
  projectTitle: string;
  assetType: AssetType;
  assetUrl: string;
  comments: CommentView[];
}
