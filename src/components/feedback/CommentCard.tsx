/**
 * CommentCard - 评论卡片组件（新版）
 * 
 * 支持：
 * - 评论内容显示
 * - 回复列表
 * - 状态徽章
 * - 操作按钮
 */

import { useState } from "react";
import { MessageSquare, MoreHorizontal, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CommentView } from "@/types/feedback";

interface CommentCardProps {
  comment: CommentView;
  isActive?: boolean;
  onClick?: () => void;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
  /** 是否显示回复列表 */
  showReplies?: boolean;
  /** 是否显示操作按钮 */
  showActions?: boolean;
}

export function CommentCard({
  comment,
  isActive,
  onClick,
  onEdit,
  onDelete,
  showReplies = false,
  showActions = true,
}: CommentCardProps) {
  const [isExpanded, setIsExpanded] = useState(showReplies);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.message);

  // 处理编辑保存
  const handleEditSave = () => {
    if (editValue.trim() && editValue !== comment.message) {
      onEdit?.(editValue.trim());
    }
    setIsEditing(false);
  };

  // 处理编辑取消
  const handleEditCancel = () => {
    setEditValue(comment.message);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "group rounded-xl p-3 transition-all duration-150",
        isActive
          ? "bg-muted/80 ring-2 ring-primary/20"
          : "hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      {/* 头部 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* 编号 */}
          <div className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary">
            #{comment.displayOrder}
          </div>

          {/* 头像 */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-[10px] font-semibold text-foreground/70">
            {comment.avatar}
          </div>

          {/* 作者和时间 */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-foreground truncate">
                {comment.author}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {comment.createdAt}
              </span>
            </div>
          </div>
        </div>

        {/* 右侧：状态和操作 */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={comment.status} />

          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  编辑
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* 内容 */}
      <div className="mt-2">
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEditSave} className="h-7 text-xs">
                保存
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleEditCancel}
                className="h-7 text-xs"
              >
                取消
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {comment.message}
          </p>
        )}
      </div>

      {/* 回复列表 */}
      {comment.replies.length > 0 && (
        <div className="mt-2">
          {/* 展开/收起按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {comment.replies.length} 条回复
          </button>

          {/* 回复列表 */}
          {isExpanded && (
            <div className="mt-2 space-y-2 border-l-2 border-border pl-3">
              {comment.replies.map((reply, index) => (
                <div key={index} className="text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground/80 text-[12px]">
                      {reply.author}
                    </span>
                    <span className="text-[11px] text-muted-foreground/60">
                      {reply.createdAt}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    {reply.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 回复数量（收起状态） */}
      {comment.replies.length > 0 && !isExpanded && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground/70">
          <MessageSquare className="h-3 w-3" />
          <span>
            {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
          </span>
        </div>
      )}
    </div>
  );
}

export default CommentCard;
