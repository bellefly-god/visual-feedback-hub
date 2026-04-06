import type { CommentView } from "@/types/feedback";
import type { CreateAnnotationPayload, NormalizedAnnotation } from "@/features/editor/shared/types/annotation";

export type PendingAnnotation = CreateAnnotationPayload & {
  id: string;
  status: "draft";
  page?: number;
};

const DRAFT_ANNOTATION_PREFIX = "draft-annotation";

export function createDraftAnnotationId(): string {
  return `${DRAFT_ANNOTATION_PREFIX}-${crypto.randomUUID()}`;
}

export function isDraftAnnotationId(value: string | null | undefined): boolean {
  return Boolean(value && value.startsWith(DRAFT_ANNOTATION_PREFIX));
}

export function commentsToAnnotations(comments: CommentView[]): NormalizedAnnotation[] {
  return comments.map((comment) => ({
    id: comment.id,
    displayOrder: comment.displayOrder,
    shapeType: comment.shapeType,
    x: comment.x,
    y: comment.y,
    width: comment.width,
    height: comment.height,
    pathPoints: comment.pathPoints,
    color: comment.color,
    status: "saved",
    pinNumber: comment.displayOrder,
  }));
}

export function withPendingAnnotation(
  annotations: NormalizedAnnotation[],
  pending: PendingAnnotation | null,
): NormalizedAnnotation[] {
  if (!pending) {
    return annotations;
  }

  return [
    ...annotations,
    {
      id: pending.id,
      shapeType: pending.shapeType,
      x: pending.x,
      y: pending.y,
      width: pending.width,
      height: pending.height,
      pathPoints: pending.pathPoints,
      color: pending.color,
      status: pending.status,
    },
  ];
}

export function resolveSelectedCommentId(currentId: string | null, comments: CommentView[]): string | null {
  if (currentId && comments.some((comment) => comment.id === currentId)) {
    return currentId;
  }

  return comments[0]?.id ?? null;
}
