import { format, formatDistanceToNowStrict } from "date-fns";
import { canTransitionStatus, deriveProjectStatus } from "@/lib/status";
import { supabase } from "@/services/supabaseClient";
import { getCurrentUser } from "@/services/supabaseAuthService";
import { isUuid } from "@/lib/routePaths";
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
  display_order: number | null;
  page: number | null;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  path_points: Array<{ x: number; y: number }> | null;
  color: string | null;
  shape_type: "pin" | "pen" | "arrow" | "rectangle" | "highlight";
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
  pathPoints?: Array<{ x: number; y: number }>;
  color?: string;
  page?: number;
  authorName: string;
  shapeType?: "pin" | "pen" | "arrow" | "rectangle" | "highlight";
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

/**
 * 获取当前用户的 ID
 * - 已登录用户返回用户 ID
 * - 未登录返回 owner-demo
 */
async function getCurrentUserId(): Promise<string> {
  try {
    const user = await getCurrentUser();
    return user?.id ?? "owner-demo";
  } catch {
    return "owner-demo";
  }
}

/**
 * 获取当前用户的 ID（同步方式，仅当有缓存会话时有效）
 */
function getCurrentUserIdSync(): string {
  // 尝试从 localStorage 获取缓存的会话
  const cached = localStorage.getItem("supabase-auth");
  if (cached) {
    try {
      const session = JSON.parse(cached);
      if (session?.user?.id) {
        return session.user.id;
      }
    } catch {
      // ignore
    }
  }
  return "owner-demo";
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

function isMissingColorColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    error.message?.toLowerCase().includes("column") === true && error.message.toLowerCase().includes("color")
  );
}

function isMissingDisplayOrderColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    (error.message?.toLowerCase().includes("column") === true &&
      error.message.toLowerCase().includes("display_order"))
  );
}

function isMissingPathPointsColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) {
    return false;
  }

  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    (error.message?.toLowerCase().includes("column") === true &&
      error.message.toLowerCase().includes("path_points"))
  );
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

function toCommentView(comment: CommentRow, displayOrder: number, replies: ReplyRecord[]): CommentView {
  return {
    id: comment.id,
    displayOrder,
    author: comment.author_name,
    avatar: getInitials(comment.author_name),
    message: comment.content,
    status: comment.status,
    shapeType: comment.shape_type,
    x: comment.x,
    y: comment.y,
    width: comment.width ?? undefined,
    height: comment.height ?? undefined,
    pathPoints: comment.path_points ?? undefined,
    color: comment.color ?? undefined,
    page: comment.page ?? undefined,
    pinNumber: displayOrder,
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

    // 获取当前用户的 ID，用于过滤项目列表
    const userId = await getCurrentUserId();
    const isLoggedIn = userId !== "owner-demo";

    // 构建查询条件：
    // - 已登录用户：只显示自己的项目
    // - 未登录用户：只显示 demo 项目（owner-demo）
    let projectsQuery = db.from("projects").select("*");
    if (isLoggedIn) {
      // 过滤当前用户的项目
      projectsQuery = projectsQuery.eq("owner_id", userId);
    } else {
      // 只显示 demo 项目
      projectsQuery = projectsQuery.eq("owner_id", "owner-demo");
    }
    projectsQuery = projectsQuery.order("created_at", { ascending: false });

    const [{ data: projectRows, error: projectError }, { data: commentRows, error: commentError }] =
      await Promise.all([
        projectsQuery,
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
      // Use asset_url as thumbnail for images
      const thumbnail = row.asset_type === "image" ? row.asset_url : "";
      return {
        id: row.id,
        name: row.title,
        fileType: row.asset_type,
        thumbnail,
        date: toProjectDateLabel(row.created_at),
        commentCount: statuses.length,
        status: deriveProjectStatus(statuses),
      };
    });
  },

  async getProject(projectId: string): Promise<ProjectRecord | null> {
    if (!isUuid(projectId)) {
      return null;
    }

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

    // 获取当前用户 ID，未登录则使用 owner-demo
    const userId = await getCurrentUserId();

    const payload = {
      id: input.id && isUuid(input.id) ? input.id : crypto.randomUUID(),
      title: input.title,
      owner_id: input.ownerId ?? userId,
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
    let { data, error } = await db
      .from("comments")
      .select("*")
      .eq("project_id", projectId)
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (isMissingDisplayOrderColumnError(error)) {
      ({ data, error } = await db
        .from("comments")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }));
    }

    if (error) {
      throw error;
    }

    const comments = data as CommentRow[];
    const repliesMap = await getRepliesByCommentId(comments.map((comment) => comment.id));

    return comments.map((comment, index) =>
      toCommentView(comment, comment.display_order ?? index + 1, repliesMap.get(comment.id) ?? []),
    );
  },

  async createComment(input: CreateCommentInput): Promise<CommentView[]> {
    const db = assertSupabase();
    const now = getNowIso();
    let nextDisplayOrder = 1;
    let supportsDisplayOrder = true;

    const { data: lastWithOrder, error: orderLookupError } = await db
      .from("comments")
      .select("display_order")
      .eq("project_id", input.projectId)
      .order("display_order", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (isMissingDisplayOrderColumnError(orderLookupError)) {
      supportsDisplayOrder = false;
    } else if (orderLookupError) {
      throw orderLookupError;
    } else {
      nextDisplayOrder = ((lastWithOrder as { display_order: number | null } | null)?.display_order ?? 0) + 1;
    }

    const payload = {
      id: crypto.randomUUID(),
      project_id: input.projectId,
      display_order: nextDisplayOrder,
      page: input.page ?? null,
      x: input.x,
      y: input.y,
      width: input.width ?? null,
      height: input.height ?? null,
      path_points: input.pathPoints ?? null,
      color: input.color ?? null,
      shape_type: input.shapeType ?? "pin",
      content: input.content,
      status: "open",
      author_name: input.authorName,
      created_at: now,
      updated_at: now,
    };

    let { error } = await db.from("comments").insert(payload);
    if (
      isMissingColorColumnError(error) ||
      isMissingDisplayOrderColumnError(error) ||
      isMissingPathPointsColumnError(error) ||
      !supportsDisplayOrder
    ) {
      const legacyPayload: Omit<typeof payload, "color" | "display_order" | "path_points"> & {
        color?: string | null;
        path_points?: Array<{ x: number; y: number }> | null;
      } = {
        id: payload.id,
        project_id: payload.project_id,
        page: payload.page,
        x: payload.x,
        y: payload.y,
        width: payload.width,
        height: payload.height,
        shape_type: payload.shape_type,
        content: payload.content,
        status: payload.status,
        author_name: payload.author_name,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
      };
      if (!isMissingColorColumnError(error)) {
        legacyPayload.color = payload.color;
      }
      if (!isMissingPathPointsColumnError(error)) {
        legacyPayload.path_points = payload.path_points;
      }
      ({ error } = await db.from("comments").insert(legacyPayload));
    }

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

  async deleteComment(commentId: string): Promise<CommentView[]> {
    const db = assertSupabase();
    
    // 先获取评论信息以确定 projectId
    const { data: comment, error: fetchError } = await db
      .from("comments")
      .select("id, project_id")
      .eq("id", commentId)
      .maybeSingle();
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!comment) {
      return [];
    }
    
    const projectId = (comment as { id: string; project_id: string }).project_id;
    
    // 删除评论
    const { error: deleteError } = await db
      .from("comments")
      .delete()
      .eq("id", commentId);
    
    if (deleteError) {
      throw deleteError;
    }
    
    return this.listComments(projectId);
  },

  async editComment(commentId: string, content: string): Promise<CommentView[]> {
    const db = assertSupabase();
    
    // 先获取评论信息以确定 projectId
    const { data: comment, error: fetchError } = await db
      .from("comments")
      .select("id, project_id")
      .eq("id", commentId)
      .maybeSingle();
    
    if (fetchError) {
      throw fetchError;
    }
    
    if (!comment) {
      return [];
    }

    const projectId = comment.project_id;
    
    // 更新评论内容
    const { error: updateError } = await db
      .from("comments")
      .update({ content })
      .eq("id", commentId);
    
    if (updateError) {
      throw updateError;
    }
    
    return this.listComments(projectId);
  },

  async clearProject(projectId: string): Promise<void> {
    const db = assertSupabase();
    
    // 删除项目的所有评论
    const { error: deleteError } = await db
      .from("comments")
      .delete()
      .eq("project_id", projectId);
    
    if (deleteError) {
      throw deleteError;
    }
  },
};
