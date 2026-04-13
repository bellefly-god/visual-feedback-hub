/**
 * CommentSidebar - 评论侧边栏（新版本）
 * 
 * 支持：
 * - 评论列表
 * - 筛选功能
 * - 状态统计
 */

import { useState, useMemo } from "react";
import { Plus, Filter, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommentCard } from "@/components/feedback/CommentCard";
import { StatusBadge } from "@/components/feedback/StatusBadge";
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
}: CommentSidebarProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

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

  // 筛选选项
  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: "all", label: `全部 (${statusCounts.all})` },
    { value: "pending", label: `待处理 (${statusCounts.pending})` },
    { value: "fixed", label: `已修复 (${statusCounts.fixed})` },
    { value: "approved", label: `已批准 (${statusCounts.approved})` },
    { value: "reopen", label: `已驳回 (${statusCounts.reopen})` },
  ];

  return (
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
              onDelete={() => onDeleteComment?.(comment.id)}
              showActions={true}
            />
          ))
        )}
      </div>

      {/* 选中评论详情（可选） */}
      {activeComment && (
        <div className="border-t border-border/60 p-3">
          <div className="text-[12px] text-muted-foreground">
            已选择评论 #{activeComment.displayOrder}
          </div>
        </div>
      )}
    </div>
  );
}

export default CommentSidebar;
