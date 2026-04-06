import { format, formatDistanceToNowStrict } from "date-fns";
import { canTransitionStatus, deriveProjectStatus } from "@/lib/status";
import { seedStore, type FeedbackStore } from "@/data/seedData";
import type {
  AssetType,
  AnnotationShape,
  CommentStatus,
  CommentView,
  ProjectListItem,
  ProjectRecord,
  ReviewData,
  ShareLinkRecord,
} from "@/types/feedback";

const STORAGE_KEY = "feedbackmark.store.v1";
const DEFAULT_OWNER_ID = "owner-demo";

interface CreateProjectInput {
  title: string;
  assetType: AssetType;
  assetUrl?: string;
  ownerId?: string;
  id?: string;
}

interface EnsureProjectInput {
  projectId: string;
  title?: string;
}

interface CreateCommentInput {
  projectId: string;
  content: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  page?: number;
  authorName: string;
  shapeType?: AnnotationShape;
}

interface CreateReplyInput {
  commentId: string;
  authorName: string;
  content: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function getNowIso(): string {
  return new Date().toISOString();
}

function createEmptyStore(): FeedbackStore {
  return clone(seedStore);
}

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

function readStore(): FeedbackStore {
  if (!hasWindow()) {
    return createEmptyStore();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    const initial = createEmptyStore();
    writeStore(initial);
    return initial;
  }

  try {
    return JSON.parse(raw) as FeedbackStore;
  } catch {
    const fallback = createEmptyStore();
    writeStore(fallback);
    return fallback;
  }
}

function writeStore(store: FeedbackStore): void {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function toRelativeTimeLabel(iso: string): string {
  return `${formatDistanceToNowStrict(new Date(iso), { addSuffix: true })}`;
}

function toProjectDateLabel(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy");
}

function getCommentsByProject(store: FeedbackStore, projectId: string) {
  return store.comments
    .filter((comment) => comment.projectId === projectId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function toCommentViews(store: FeedbackStore, projectId: string): CommentView[] {
  return getCommentsByProject(store, projectId).map((comment, index) => {
    const replies = store.replies
      .filter((reply) => reply.commentId === comment.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((reply) => ({
        author: reply.authorName,
        avatar: getInitials(reply.authorName),
        message: reply.content,
        createdAt: toRelativeTimeLabel(reply.createdAt),
      }));

    return {
      id: comment.id,
      author: comment.authorName,
      avatar: getInitials(comment.authorName),
      message: comment.content,
      status: comment.status,
      shapeType: comment.shapeType,
      x: comment.x,
      y: comment.y,
      width: comment.width,
      height: comment.height,
      color: comment.color,
      page: comment.page,
      pinNumber: index + 1,
      replies,
      createdAt: toRelativeTimeLabel(comment.createdAt),
    };
  });
}

function toProjectListItem(store: FeedbackStore, project: ProjectRecord): ProjectListItem {
  const comments = getCommentsByProject(store, project.id);
  const commentStatuses: CommentStatus[] = comments.map((comment) => comment.status);

  return {
    id: project.id,
    name: project.title,
    fileType: project.assetType,
    thumbnail: "",
    date: toProjectDateLabel(project.createdAt),
    commentCount: comments.length,
    status: deriveProjectStatus(commentStatuses),
  };
}

function createShareToken(projectId: string): string {
  return `share-${projectId}`;
}

function findCommentWithProject(store: FeedbackStore, commentId: string) {
  const comment = store.comments.find((item) => item.id === commentId);

  if (!comment) {
    return null;
  }

  return {
    comment,
    projectId: comment.projectId,
  };
}

export const feedbackService = {
  async uploadAsset(file: File): Promise<string> {
    return fileToDataUrl(file);
  },

  async listProjects(): Promise<ProjectListItem[]> {
    const store = readStore();

    return store.projects
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((project) => toProjectListItem(store, project))
      .slice();
  },

  async getProject(projectId: string): Promise<ProjectRecord | null> {
    const store = readStore();
    return store.projects.find((project) => project.id === projectId) ?? null;
  },

  async createProject(input: CreateProjectInput): Promise<ProjectRecord> {
    const store = readStore();
    const now = getNowIso();

    const project: ProjectRecord = {
      id: input.id ?? crypto.randomUUID(),
      title: input.title,
      ownerId: input.ownerId ?? DEFAULT_OWNER_ID,
      assetType: input.assetType,
      assetUrl: input.assetUrl ?? "",
      createdAt: now,
      updatedAt: now,
    };

    store.projects.push(project);
    writeStore(store);

    return project;
  },

  async ensureProject(input: EnsureProjectInput): Promise<ProjectRecord> {
    const existing = await this.getProject(input.projectId);

    if (existing) {
      if (input.title && input.title !== existing.title) {
        const store = readStore();
        const target = store.projects.find((project) => project.id === input.projectId);

        if (target) {
          target.title = input.title;
          target.updatedAt = getNowIso();
          writeStore(store);
          return target;
        }
      }

      return existing;
    }

    return this.createProject({
      id: input.projectId,
      title: input.title ?? "Untitled Project",
      assetType: "screenshot",
      assetUrl: "",
    });
  },

  async listComments(projectId: string): Promise<CommentView[]> {
    const store = readStore();
    return toCommentViews(store, projectId);
  },

  async createComment(input: CreateCommentInput): Promise<CommentView[]> {
    const store = readStore();
    const now = getNowIso();

    store.comments.push({
      id: crypto.randomUUID(),
      projectId: input.projectId,
      page: input.page,
      x: input.x,
      y: input.y,
      width: input.width,
      height: input.height,
      color: input.color,
      shapeType: input.shapeType ?? "pin",
      content: input.content,
      status: "pending",
      authorName: input.authorName,
      createdAt: now,
      updatedAt: now,
    });

    const project = store.projects.find((item) => item.id === input.projectId);
    if (project) {
      project.updatedAt = now;
    }

    writeStore(store);
    return toCommentViews(store, input.projectId);
  },

  async addReply(input: CreateReplyInput): Promise<CommentView[]> {
    const store = readStore();
    const found = findCommentWithProject(store, input.commentId);

    if (!found) {
      throw new Error("COMMENT_NOT_FOUND");
    }

    const content = input.content.trim();

    if (!content) {
      throw new Error("REPLY_CONTENT_REQUIRED");
    }

    const now = getNowIso();
    store.replies.push({
      id: crypto.randomUUID(),
      commentId: input.commentId,
      authorName: input.authorName,
      content,
      createdAt: now,
    });

    found.comment.updatedAt = now;
    const project = store.projects.find((item) => item.id === found.projectId);
    if (project) {
      project.updatedAt = now;
    }

    writeStore(store);
    return toCommentViews(store, found.projectId);
  },

  async updateCommentStatus(commentId: string, nextStatus: CommentStatus): Promise<CommentView[]> {
    const store = readStore();
    const found = findCommentWithProject(store, commentId);

    if (!found) {
      throw new Error("COMMENT_NOT_FOUND");
    }

    const currentStatus = found.comment.status;
    if (!canTransitionStatus(currentStatus, nextStatus)) {
      throw new Error("INVALID_STATUS_TRANSITION");
    }

    const now = getNowIso();
    found.comment.status = nextStatus;
    found.comment.updatedAt = now;

    const project = store.projects.find((item) => item.id === found.projectId);
    if (project) {
      project.updatedAt = now;
    }

    writeStore(store);
    return toCommentViews(store, found.projectId);
  },

  async saveProjectFeedback(projectId: string): Promise<void> {
    const store = readStore();
    const project = store.projects.find((item) => item.id === projectId);

    if (!project) {
      return;
    }

    project.updatedAt = getNowIso();
    writeStore(store);
  },

  async getShareLinkByProjectId(projectId: string): Promise<ShareLinkRecord | null> {
    const store = readStore();
    return store.shareLinks.find((link) => link.projectId === projectId) ?? null;
  },

  async getOrCreateShareLink(projectId: string): Promise<ShareLinkRecord> {
    const store = readStore();
    const commentCount = store.comments.filter((comment) => comment.projectId === projectId).length;

    if (commentCount === 0) {
      throw new Error("COMMENTS_REQUIRED_BEFORE_SHARING");
    }

    const found = store.shareLinks.find((link) => link.projectId === projectId);

    if (found) {
      return found;
    }

    const shareLink: ShareLinkRecord = {
      id: crypto.randomUUID(),
      projectId,
      token: createShareToken(projectId),
      isPublic: true,
      createdAt: getNowIso(),
    };

    store.shareLinks.push(shareLink);
    writeStore(store);
    return shareLink;
  },

  async getReviewDataByToken(token: string): Promise<ReviewData | null> {
    const store = readStore();
    const shareLink = store.shareLinks.find((link) => link.token === token && link.isPublic);

    if (!shareLink) {
      return null;
    }

    if (shareLink.expiresAt && new Date(shareLink.expiresAt).getTime() < Date.now()) {
      return null;
    }

    const project = store.projects.find((item) => item.id === shareLink.projectId);

    if (!project) {
      return null;
    }

    return {
      token,
      projectId: project.id,
      projectTitle: project.title,
      assetType: project.assetType,
      assetUrl: project.assetUrl,
      comments: toCommentViews(store, project.id),
    };
  },
};
