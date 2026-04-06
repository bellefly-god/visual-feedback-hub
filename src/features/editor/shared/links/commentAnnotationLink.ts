import type { CommentView } from "@/types/feedback";
import type { CreateAnnotationPayload, NormalizedAnnotation } from "@/features/editor/shared/types/annotation";

export type PendingAnnotation = CreateAnnotationPayload & {
  page?: number;
};

export const DRAFT_ANNOTATION_ID = "draft-annotation";

export function commentsToAnnotations(comments: CommentView[]): NormalizedAnnotation[] {
  return comments.map((comment) => ({
    id: comment.id,
    shapeType: comment.shapeType,
    x: comment.x,
    y: comment.y,
    width: comment.width,
    height: comment.height,
    color: comment.color,
    pinNumber: comment.pinNumber,
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
      id: DRAFT_ANNOTATION_ID,
      shapeType: pending.shapeType,
      x: pending.x,
      y: pending.y,
      width: pending.width,
      height: pending.height,
      color: pending.color,
    },
  ];
}

export function resolveSelectedCommentId(currentId: string | null, comments: CommentView[]): string | null {
  if (currentId && comments.some((comment) => comment.id === currentId)) {
    return currentId;
  }

  return comments[0]?.id ?? null;
}
