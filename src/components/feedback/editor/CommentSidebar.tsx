/**
 * CommentSidebar - 评论侧边栏（简化版）
 * 
 * 简化后只支持：
 * - 评论列表
 * - 添加评论
 * - 回复评论
 * - 删除评论
 * 
 * 不再支持状态筛选和状态操作
 */

import { useState, useMemo } from "react";
import { Plus, MessageSquare, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommentCard } from "@/components/feedback/CommentCard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import type { CommentView, CommentStatus } from "@/types/feedback";

interface CommentSidebarProps {
  comments: CommentView[];
  selectedCommentId: string | null;
  activeComment: CommentView | null;
  onSelectComment: (id: string) => void;
  onAddComment?: () => void;
  onEditComment?: (id: string, content: string) => void;
  onDeleteComment?: (id: string) => void;
  /** 是否显示添加按钮 */
  showAddButton?: boolean;
  /** 是否处于评论模式（有待处理的标注） */
  isCommentMode?: boolean;
  /** 是否有待处理的标注 */
  hasPendingAnnotation?: boolean;
  /** 草稿评论内容 */
  draftComment?: string;
  /** 保存状态 */
  saveState?: "idle" | "saving" | "saved";
  /** 草稿评论变化回调 */
  onDraftCommentChange?: (value: string) => void;
  /** 请求进入标注模式 */
  onRequestPinMode?: () => void;
  /** 提交评论 */
  onSubmitComment?: () => void;
  /** 取消草稿 */
  onCancelDraft?: () => void;
  /** 切换已处理状态 */
  onMarkFixed?: () => void;
}

export function CommentSidebar({
  comments,
  selectedCommentId,
  activeComment,
  onSelectComment,
  onAddComment,
  onEditComment,
  onDeleteComment,
  showAddButton = true,
  hasPendingAnnotation = false,
  draftComment,
  saveState = "idle",
  onDraftCommentChange,
  onRequestPinMode,
  onSubmitComment,
  onCancelDraft,
  onMarkFixed,
}: CommentSidebarProps) {
  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    author: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle delete with confirmation
  const handleDeleteClick = (id: string, author: string) => {
    setDeleteTarget({ id, author });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !onDeleteComment) return;
    
    setIsDeleting(true);
    try {
      await onDeleteComment(deleteTarget.id);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="flex h-full w-72 shrink-0 flex-col border-r border-border/60 bg-card">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-medium">
              评论
              <span className="ml-1.5 text-muted-foreground">
                {comments.length}
              </span>
            </span>
          </div>

          {showAddButton && onRequestPinMode && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onRequestPinMode}
              title="添加评论"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 评论列表 */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {comments.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-[13px] text-muted-foreground">
                暂无评论，点击画布添加标注
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                isActive={selectedCommentId === comment.id}
                onClick={() => onSelectComment(comment.id)}
                onEdit={(content) => onEditComment?.(comment.id, content)}
                onDelete={() => handleDeleteClick(comment.id, comment.author)}
                showActions={true}
              />
            ))
          )}
        </div>

        {/* 选中评论操作 */}
        {activeComment && onMarkFixed && (
          <div className="border-t border-border/60 p-3 space-y-2">
            <div className="text-[12px] font-medium text-foreground">
              已选择评论 #{activeComment.displayOrder}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-[12px]"
              onClick={onMarkFixed}
            >
              {activeComment.status === "resolved" ? (
                <>
                  <RotateCcw className="h-3 w-3 mr-1.5" />
                  重新打开
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1.5" />
                  标记已处理
                </>
              )}
            </Button>
          </div>
        )}

        {/* 草稿评论输入区域 */}
        {hasPendingAnnotation && (
          <div className="border-t border-border/60 p-3 space-y-2">
            <div className="text-[12px] font-medium text-foreground">
              添加评论
            </div>
            <textarea
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              placeholder="输入你的评论..."
              value={draftComment || ""}
              onChange={(e) => onDraftCommentChange?.(e.target.value)}
              rows={3}
            />
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[12px] text-muted-foreground hover:text-foreground"
                onClick={onCancelDraft}
              >
                取消
              </Button>
              <Button
                size="sm"
                className="h-8 text-[12px]"
                onClick={onSubmitComment}
                disabled={saveState === "saving"}
              >
                {saveState === "saving" ? "提交中..." : "提交"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && handleDeleteCancel()}
        title="删除评论"
        description={`确定要删除 ${deleteTarget?.author ?? ""} 的评论吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDeleteConfirm}
        variant="destructive"
        loading={isDeleting}
      />
    </>
  );
}

export default CommentSidebar;
