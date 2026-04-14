/**
 * CommentSidebar - 评论侧边栏（新版本）
 * 
 * 支持：
 * - 评论列表
 * - 筛选功能
 * - 状态统计
 * - 删除确认
 */

import { useState, useMemo } from "react";
import { Plus, Filter, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommentCard } from "@/components/feedback/CommentCard";
import { StatusBadge } from "@/components/feedback/StatusBadge";
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
  /** 是否显示筛选 */
  showFilter?: boolean;
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
  /** 标记为已修复 */
  onMarkFixed?: () => void;
}

type FilterStatus = CommentStatus | "all";

export function CommentSidebar({
  comments,
  selectedCommentId,
  activeComment,
  onSelectComment,
  onAddComment,
  onEditComment,
  onDeleteComment,
  showAddButton = true,
  showFilter = true,
  isCommentMode,
  hasPendingAnnotation = false,
  draftComment,
  saveState = "idle",
  onDraftCommentChange,
  onRequestPinMode,
  onSubmitComment,
  onCancelDraft,
  onMarkFixed,
}: CommentSidebarProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  
  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    author: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 筛选评论
  const filteredComments = useMemo(() => {
    if (filterStatus === "all") return comments;
    return comments.filter((c) => c.status === filterStatus);
  }, [comments, filterStatus]);

  // 统计各状态数量
  const statusCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      all: comments.length,
      pending: 0,
      fixed: 0,
      approved: 0,
      reopen: 0,
    };
    comments.forEach((c) => {
      counts[c.status]++;
    });
    return counts;
  }, [comments]);

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

  // 筛选选项
  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: "all", label: `全部 (${statusCounts.all})` },
    { value: "pending", label: `待处理 (${statusCounts.pending})` },
    { value: "fixed", label: `已修复 (${statusCounts.fixed})` },
    { value: "approved", label: `已批准 (${statusCounts.approved})` },
    { value: "reopen", label: `已驳回 (${statusCounts.reopen})` },
  ];

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
                {filteredComments.length}
              </span>
            </span>
          </div>

          {showAddButton && onAddComment && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={onAddComment}
              title="添加评论"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 筛选器 */}
        {showFilter && (
          <div className="border-b border-border/60 px-3 py-2">
            <div className="flex flex-wrap gap-1">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilterStatus(option.value)}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] transition-colors",
                    filterStatus === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 评论列表 */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {filteredComments.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-[13px] text-muted-foreground">
                {filterStatus === "all"
                  ? "暂无评论"
                  : `暂无${filterStatus === "pending" ? "待处理" : filterStatus === "fixed" ? "已修复" : filterStatus === "approved" ? "已批准" : "已驳回"}的评论`}
              </p>
            </div>
          ) : (
            filteredComments.map((comment) => (
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

        {/* 选中评论详情（可选） */}
        {activeComment && (
          <div className="border-t border-border/60 p-3 space-y-2">
            <div className="text-[12px] font-medium text-foreground">
              已选择评论 #{activeComment.displayOrder}
            </div>
            {/* 状态操作按钮 */}
            {activeComment.status === "pending" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-[12px]"
                onClick={onMarkFixed}
              >
                标记已修复
              </Button>
            )}
            {activeComment.status === "fixed" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-[12px]"
                onClick={onMarkFixed}
              >
                标记已修复
              </Button>
            )}
            {activeComment.status === "reopen" && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-[12px]"
                onClick={onMarkFixed}
              >
                开始处理
              </Button>
            )}
          </div>
        )}

        {/* 草稿评论输入区域（待处理标注时显示） */}
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[12px]"
                  onClick={onMarkFixed}
                  disabled={saveState === "saving"}
                >
                  标记已修复
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
