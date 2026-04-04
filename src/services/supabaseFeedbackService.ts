import { format, formatDistanceToNowStrict } from "date-fns";
import { canTransitionStatus, deriveProjectStatus } from "@/lib/status";
import { supabase } from "@/services/supabaseClient";
import type {
  CommentStatus,
  CommentView,
  ProjectListItem,
  ProjectRecord,
  ReplyRecord,
  ReviewData,
  ShareLinkRecord,
} from "@/types/feedback";

type ProjectRow = {
  id: string;
  title: string;
  owner_id: string;
  asset_type: "image" | "pdf" | "screenshot";
  asset_url: string;
  created_at: string;
  updated_at: string;
};

type CommentRow = {
  id: string;
  project_id: string;
  page: number | null;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  shape_type: "pin" | "arrow" | "rectangle" | "highlight";
  content: string;
  voice_note_url: string | null;
  status: CommentStatus;
  author_name: string;
  created_at: string;
  updated_at: string;
};

type ReplyRow = {
  id: string;
  comment_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

type ShareLinkRow = {
  id: string;
  project_id: string;
  token: string;
  is_public: boolean;
  created_at: string;
  expires_at: string | null;
};

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

function toSafeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("FILE_READ_FAILED"));
    reader.readAsDataURL(file);
  });
}

function assertSupabase() {
  if (!supabase) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  return supabase;
}

function getNowIso() {
  return new Date().toISOString();
}

function toRelativeTimeLabel(iso: string): string {
  return `${formatDistanceToNowStrict(new Date(iso), { addSuffix: true })}`;
}

function toProjectDateLabel(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy");
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("");
}

function toProjectRecord(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    title: row.title,
    ownerId: row.owner_id,
    assetType: row.asset_type,
    assetUrl: row.asset_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toShareLinkRecord(row: ShareLinkRow): ShareLinkRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    token: row.token,
    isPublic: row.is_public,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? undefined,
  };
}

async function getRepliesByCommentId(commentIds: string[]): Promise<Map<string, ReplyRecord[]>> {
  const db = assertSupabase();

  if (commentIds.length === 0) {
    return new Map();
  }

  const { data, error } = await db
    .from("replies")
    .select("*")
    .in("comment_id", commentIds)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const grouped = new Map<string, ReplyRecord[]>();
  (data as ReplyRow[]).forEach((row) => {
    const list = grouped.get(row.comment_id) ?? [];
    list.push({
      id: row.id,
      commentId: row.comment_id,
      authorName: row.author_name,
      content: row.content,
      createdAt: row.created_at,
    });
    grouped.set(row.comment_id, list);
  });

  return grouped;
}

function toCommentView(comment: CommentRow, pinNumber: number, replies: ReplyRecord[]): CommentView {
  return {
    id: comment.id,
    author: comment.author_name,
    avatar: getInitials(comment.author_name),
    message: comment.content,
    status: comment.status,
    shapeType: comment.shape_type,
    x: comment.x,
    y: comment.y,
    width: comment.width ?? undefined,
    height: comment.height ?? undefined,
    page: comment.page ?? undefined,
    pinNumber,
    replies: replies.map((reply) => ({
      author: reply.authorName,
      avatar: getInitials(reply.authorName),
      message: reply.content,
      createdAt: toRelativeTimeLabel(reply.createdAt),
    })),
    createdAt: toRelativeTimeLabel(comment.created_at),
  };
}

export const supabaseFeedbackService = {
  async uploadAsset(file: File): Promise<string> {
    const db = assertSupabase();
    const key = `${Date.now()}-${crypto.randomUUID()}-${toSafeFileName(file.name)}`;
    const path = `assets/${key}`;

    const { error: uploadError } = await db.storage.from("feedback-assets").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });

    if (uploadError) {
      return fileToDataUrl(file);
    }

    const { data } = db.storage.from("feedback-assets").getPublicUrl(path);
    return data.publicUrl;
  },

  async listProjects(): Promise<ProjectListItem[]> {
    const db = assertSupabase();

    const [{ data: projectRows, error: projectError }, { data: commentRows, error: commentError }] =
      await Promise.all([
        db.from("projects").select("*").order("created_at", { ascending: false }),
        db.from("comments").select("project_id,status"),
      ]);

    if (projectError) {
      throw projectError;
    }
    if (commentError) {
      throw commentError;
    }

    const statusMap = new Map<string, CommentStatus[]>();
    (commentRows as { project_id: string; status: CommentStatus }[]).forEach((row) => {
      const list = statusMap.get(row.project_id) ?? [];
      list.push(row.status);
      statusMap.set(row.project_id, list);
    });

    return (projectRows as ProjectRow[]).map((row) => {
      const statuses = statusMap.get(row.id) ?? [];
      return {
        id: row.id,
        name: row.title,
        fileType: row.asset_type,
        thumbnail: "",
        date: toProjectDateLabel(row.created_at),
        commentCount: statuses.length,
        status: deriveProjectStatus(statuses),
      };
    });
  },

  async getProject(projectId: string): Promise<ProjectRecord | null> {
    const db = assertSupabase();

    const { data, error } = await db.from("projects").select("*").eq("id", projectId).maybeSingle();

    if (error) {
      throw error;
    }

    return data ? toProjectRecord(data as ProjectRow) : null;
  },

  async createProject(input: CreateProjectInput): Promise<ProjectRecord> {
    const db = assertSupabase();
    const now = getNowIso();

    const payload = {
      id: input.id ?? crypto.randomUUID(),
      title: input.title,
      owner_id: input.ownerId ?? "owner-demo",
      asset_type: input.assetType,
      asset_url: input.assetUrl ?? "",
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await db.from("projects").insert(payload).select("*").single();

    if (error) {
      throw error;
    }

    return toProjectRecord(data as ProjectRow);
  },

  async ensureProject(input: EnsureProjectInput): Promise<ProjectRecord> {
    const existing = await this.getProject(input.projectId);

    if (existing) {
      if (input.title && input.title !== existing.title) {
        const db = assertSupabase();
        const now = getNowIso();
        const { data, error } = await db
          .from("projects")
          .update({ title: input.title, updated_at: now })
          .eq("id", input.projectId)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        return toProjectRecord(data as ProjectRow);
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
    const db = assertSupabase();
    const { data, error } = await db
      .from("comments")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    const comments = data as CommentRow[];
    const repliesMap = await getRepliesByCommentId(comments.map((comment) => comment.id));

    return comments.map((comment, index) =>
      toCommentView(comment, index + 1, repliesMap.get(comment.id) ?? []),
    );
  },

  async createComment(input: CreateCommentInput): Promise<CommentView[]> {
    const db = assertSupabase();
    const now = getNowIso();

    const { error } = await db.from("comments").insert({
      id: crypto.randomUUID(),
      project_id: input.projectId,
      page: input.page ?? null,
      x: input.x,
      y: input.y,
      width: input.width ?? null,
      height: input.height ?? null,
      shape_type: input.shapeType ?? "pin",
      content: input.content,
      status: "pending",
      author_name: input.authorName,
      created_at: now,
      updated_at: now,
    });

    if (error) {
      throw error;
    }

    await this.saveProjectFeedback(input.projectId);
    return this.listComments(input.projectId);
  },

  async addReply(input: CreateReplyInput): Promise<CommentView[]> {
    const db = assertSupabase();
    const content = input.content.trim();

    if (!content) {
      throw new Error("REPLY_CONTENT_REQUIRED");
    }

    const { data: comment, error: commentError } = await db
      .from("comments")
      .select("id,project_id")
      .eq("id", input.commentId)
      .maybeSingle();

    if (commentError) {
      throw commentError;
    }

    if (!comment) {
      throw new Error("COMMENT_NOT_FOUND");
    }

    const now = getNowIso();
    const { error } = await db.from("replies").insert({
      id: crypto.randomUUID(),
      comment_id: input.commentId,
      author_name: input.authorName,
      content,
      created_at: now,
    });

    if (error) {
      throw error;
    }

    await db.from("comments").update({ updated_at: now }).eq("id", input.commentId);
    await this.saveProjectFeedback((comment as { project_id: string }).project_id);
    return this.listComments((comment as { project_id: string }).project_id);
  },

  async updateCommentStatus(commentId: string, nextStatus: CommentStatus): Promise<CommentView[]> {
    const db = assertSupabase();
    const { data, error } = await db
      .from("comments")
      .select("id,project_id,status")
      .eq("id", commentId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("COMMENT_NOT_FOUND");
    }

    const currentStatus = (data as { status: CommentStatus }).status;
    if (!canTransitionStatus(currentStatus, nextStatus)) {
      throw new Error("INVALID_STATUS_TRANSITION");
    }

    const now = getNowIso();
    const { error: updateError } = await db
      .from("comments")
      .update({ status: nextStatus, updated_at: now })
      .eq("id", commentId);

    if (updateError) {
      throw updateError;
    }

    const projectId = (data as { project_id: string }).project_id;
    await this.saveProjectFeedback(projectId);
    return this.listComments(projectId);
  },

  async saveProjectFeedback(projectId: string): Promise<void> {
    const db = assertSupabase();
    await db.from("projects").update({ updated_at: getNowIso() }).eq("id", projectId);
  },

  async getShareLinkByProjectId(projectId: string): Promise<ShareLinkRecord | null> {
    const db = assertSupabase();
    const { data, error } = await db
      .from("share_links")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? toShareLinkRecord(data as ShareLinkRow) : null;
  },

  async getOrCreateShareLink(projectId: string): Promise<ShareLinkRecord> {
    const db = assertSupabase();
    const { count, error: countError } = await db
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);

    if (countError) {
      throw countError;
    }

    if (!count) {
      throw new Error("COMMENTS_REQUIRED_BEFORE_SHARING");
    }

    const existing = await this.getShareLinkByProjectId(projectId);
    if (existing) {
      return existing;
    }

    const payload = {
      id: crypto.randomUUID(),
      project_id: projectId,
      token: `share-${projectId}`,
      is_public: true,
      created_at: getNowIso(),
      expires_at: null,
    };

    const { data, error } = await db.from("share_links").insert(payload).select("*").single();
    if (error) {
      throw error;
    }

    return toShareLinkRecord(data as ShareLinkRow);
  },

  async getReviewDataByToken(token: string): Promise<ReviewData | null> {
    const db = assertSupabase();
    const { data: share, error: shareError } = await db
      .from("share_links")
      .select("*")
      .eq("token", token)
      .eq("is_public", true)
      .maybeSingle();

    if (shareError) {
      throw shareError;
    }

    if (!share) {
      return null;
    }

    const shareLink = share as ShareLinkRow;
    if (shareLink.expires_at && new Date(shareLink.expires_at).getTime() < Date.now()) {
      return null;
    }

    const { data: project, error: projectError } = await db
      .from("projects")
      .select("*")
      .eq("id", shareLink.project_id)
      .maybeSingle();

    if (projectError) {
      throw projectError;
    }

    if (!project) {
      return null;
    }

    const projectRow = project as ProjectRow;
    const comments = await this.listComments(projectRow.id);

    return {
      token,
      projectId: projectRow.id,
      projectTitle: projectRow.title,
      assetType: projectRow.asset_type,
      assetUrl: projectRow.asset_url,
      comments,
    };
  },
};
